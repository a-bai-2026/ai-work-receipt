import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { rowDate } from "../lib/time.mjs";

function walkJsonlFiles(directory, accumulator = []) {
  if (!fs.existsSync(directory)) return accumulator;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkJsonlFiles(entryPath, accumulator);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) accumulator.push(entryPath);
  }
  return accumulator;
}

function readJsonl(filePath) {
  const rows = [];
  const source = fs.readFileSync(filePath, "utf8");
  for (const [lineIndex, line] of source.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      rows.push({ ...JSON.parse(line), __sourceLine: lineIndex + 1 });
    } catch {
      console.warn(`跳过无法解析的记录：${path.basename(filePath)}:${lineIndex + 1}`);
    }
  }
  return { rows, source };
}

function sessionFromFile(file) {
  const { rows, source } = readJsonl(file.filePath);
  const meta = rows.find((row) => row.type === "session_meta")?.payload || {};
  const metadataSessionId = meta.session_id || meta.id || null;
  const timestamps = rows.map(rowDate).filter(Boolean).sort((left, right) => left - right);
  const fallbackDate = new Date(file.modifiedAt);
  const sourceBuffer = Buffer.from(source, "utf8");
  return {
    rows,
    filePath: file.filePath,
    modifiedAt: file.modifiedAt,
    sessionId: metadataSessionId || path.basename(file.filePath, ".jsonl"),
    identityQuality: metadataSessionId ? "metadata" : "filename_fallback",
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: rows.length,
      byte_length: sourceBuffer.byteLength,
      tail_hash: crypto.createHash("sha256").update(sourceBuffer.subarray(-4096)).digest("hex"),
    },
    startAt: timestamps[0] || fallbackDate,
    endAt: timestamps.at(-1) || fallbackDate,
  };
}

function codexSessionFiles() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const sessionsDirectory = path.join(codexHome, "sessions");
  const files = walkJsonlFiles(sessionsDirectory)
    .map((filePath) => ({ filePath, modifiedAt: fs.statSync(filePath).mtimeMs }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
  if (!files.length) throw new Error(`没有在 ${sessionsDirectory} 找到 Codex 会话记录`);
  return files;
}

function calendarCandidates(files, startDate) {
  if (!startDate) return files;
  const approximateStart = Date.parse(`${startDate}T00:00:00.000Z`) - 48 * 60 * 60 * 1000;
  return files.filter((file) => file.modifiedAt >= approximateStart);
}

function revisionDominates(candidate, current) {
  const candidateRevision = candidate.sourceRevision || {};
  const currentRevision = current.sourceRevision || {};
  const candidateRows = Number(candidateRevision.row_count || 0);
  const currentRows = Number(currentRevision.row_count || 0);
  const candidateBytes = Number(candidateRevision.byte_length || 0);
  const currentBytes = Number(currentRevision.byte_length || 0);
  return candidateRows >= currentRows && candidateBytes >= currentBytes
    && (candidateRows > currentRows || candidateBytes > currentBytes);
}

function preferSession(candidate, current) {
  if (revisionDominates(candidate, current)) return true;
  if (revisionDominates(current, candidate)) return false;

  const candidateModifiedAt = Number(candidate.modifiedAt || candidate.endAt || 0);
  const currentModifiedAt = Number(current.modifiedAt || current.endAt || 0);
  if (candidateModifiedAt !== currentModifiedAt) return candidateModifiedAt > currentModifiedAt;

  return String(candidate.filePath || "").localeCompare(String(current.filePath || "")) > 0;
}

export function deduplicateCodexSessions(sessions) {
  const selected = new Map();
  for (const session of sessions) {
    const key = `${session.identityQuality || "metadata"}:${session.sessionId}`;
    const current = selected.get(key);
    if (!current || preferSession(session, current)) selected.set(key, session);
  }
  return [...selected.values()];
}

export function loadCodexSessions(range) {
  const files = codexSessionFiles();
  let candidates = files;
  let scanMode = "none";

  if (range.scope === "latest") {
    candidates = files.slice(0, 40);
  } else if (range.scope === "session" && range.sessionId) {
    const filenameMatches = files.filter((file) => path.basename(file.filePath).includes(range.sessionId));
    candidates = filenameMatches.length ? filenameMatches : files;
  } else {
    const fullScan = process.env.CODEX_WORK_RECEIPT_FULL_SCAN === "1";
    candidates = fullScan ? files : calendarCandidates(files, range.startDate);
    scanMode = fullScan ? "full" : "best_effort";
  }

  const sessions = deduplicateCodexSessions(candidates.map(sessionFromFile))
    .sort((left, right) => right.endAt - left.endAt);

  if (range.scope === "latest") {
    const selected = sessions.slice(0, 1);
    selected.scanMode = scanMode;
    return selected;
  }
  if (range.scope === "session") {
    const selected = sessions.find((session) => session.sessionId === range.sessionId);
    if (!selected) throw new Error(`没有找到指定的 Codex 会话：${range.sessionId}`);
    const result = [selected];
    result.scanMode = scanMode;
    return result;
  }
  sessions.scanMode = scanMode;
  return sessions;
}

export function listRecentCodexSessions(limit = 10) {
  const sessions = deduplicateCodexSessions(codexSessionFiles()
    .slice(0, Math.max(40, limit * 3))
    .map(sessionFromFile)
    .filter((session) => session.rows.length))
    .sort((left, right) => right.endAt - left.endAt)
    .slice(0, limit);

  return sessions.map((session) => {
    let completedTurns = 0;
    let toolCalls = 0;
    let model = null;
    for (const row of session.rows) {
      if (row.type === "turn_context" && row.payload?.model) model = row.payload.model;
      if (row.type === "event_msg" && row.payload?.type === "task_complete") completedTurns += 1;
      if (
        row.type === "response_item" &&
        (row.payload?.type === "custom_tool_call" || row.payload?.type === "function_call")
      ) toolCalls += 1;
    }
    return {
      sessionId: session.sessionId,
      startAt: session.startAt,
      endAt: session.endAt,
      completedTurns,
      toolCalls,
      model,
    };
  });
}
