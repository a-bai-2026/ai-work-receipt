import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { rowDate } from "../lib/time.mjs";
import { classifyToolName } from "../lib/tool-category.mjs";

const READ_CHUNK_BYTES = 256 * 1024;
const MAX_JSONL_ROW_BYTES = 64 * 1024 * 1024;
const TAIL_HASH_BYTES = 4096;
const TOKEN_KEYS = [
  "input_tokens",
  "cached_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];

function walkJsonlFiles(directory, accumulator = []) {
  if (!fs.existsSync(directory)) return accumulator;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkJsonlFiles(entryPath, accumulator);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) accumulator.push(entryPath);
  }
  return accumulator;
}

function shortString(value, maximumLength = 512) {
  return typeof value === "string" && value.length <= maximumLength ? value : null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compactTokenUsage(value) {
  if (!value || typeof value !== "object") return null;
  const usage = {};
  for (const key of TOKEN_KEYS) {
    const amount = finiteNumber(value[key]);
    if (amount !== null) usage[key] = amount;
  }
  return Object.keys(usage).length ? usage : null;
}

function compactPayload(rowType, value) {
  if (!value || typeof value !== "object") return null;
  const payload = {};
  for (const key of ["completed_at", "started_at", "timestamp"]) {
    const timestamp = shortString(value[key], 128);
    if (timestamp !== null) payload[key] = timestamp;
  }

  const payloadType = shortString(value.type, 128);
  if (payloadType !== null) payload.type = payloadType;

  if (rowType === "session_meta") {
    const sessionId = shortString(value.session_id);
    const fallbackId = shortString(value.id);
    if (sessionId !== null) payload.session_id = sessionId;
    if (fallbackId !== null) payload.id = fallbackId;
  } else if (rowType === "turn_context") {
    const model = shortString(value.model);
    if (model !== null) payload.model = model;
  } else if (rowType === "event_msg") {
    const durationMs = finiteNumber(value.duration_ms);
    const firstTokenMs = finiteNumber(value.time_to_first_token_ms);
    if (durationMs !== null) payload.duration_ms = durationMs;
    if (firstTokenMs !== null) payload.time_to_first_token_ms = firstTokenMs;
    const totalTokenUsage = compactTokenUsage(value.info?.total_token_usage);
    if (totalTokenUsage) payload.info = { total_token_usage: totalTokenUsage };
  } else if (
    rowType === "response_item" &&
    (value.type === "custom_tool_call" || value.type === "function_call")
  ) {
    payload.tool_category = classifyToolName(value.name);
  }

  return Object.keys(payload).length ? payload : null;
}

function compactRow(value, sourceLine) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = { __sourceLine: sourceLine };
  const timestamp = shortString(value.timestamp, 128);
  const type = shortString(value.type, 128);
  if (timestamp !== null) row.timestamp = timestamp;
  if (type !== null) row.type = type;
  const payload = compactPayload(type, value.payload);
  if (payload) row.payload = payload;
  return row;
}

function formatByteSize(value) {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

function appendTail(current, chunk) {
  if (chunk.length >= TAIL_HASH_BYTES) return Buffer.from(chunk.subarray(chunk.length - TAIL_HASH_BYTES));
  const combined = Buffer.concat([current, chunk]);
  return combined.length > TAIL_HASH_BYTES
    ? Buffer.from(combined.subarray(combined.length - TAIL_HASH_BYTES))
    : combined;
}

function sessionReadError(file, error) {
  return new Error(
    `无法读取 Codex 会话：${file.filePath}（${formatByteSize(file.size)}）：${error.message}`,
    { cause: error },
  );
}

function readJsonl(file) {
  const rows = [];
  const buffer = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  const lineParts = [];
  let lineBytes = 0;
  let lineIndex = 0;
  let offset = 0;
  let tail = Buffer.alloc(0);
  let skippingOversizedLine = false;
  let fileDescriptor = null;

  const resetLine = () => {
    lineParts.length = 0;
    lineBytes = 0;
    skippingOversizedLine = false;
  };

  const appendLinePart = (part) => {
    lineBytes += part.length;
    if (skippingOversizedLine) return;
    if (lineBytes > MAX_JSONL_ROW_BYTES) {
      skippingOversizedLine = true;
      lineParts.length = 0;
      return;
    }
    if (part.length) lineParts.push(Buffer.from(part));
  };

  const finishLine = (finalPart = Buffer.alloc(0)) => {
    lineIndex += 1;
    const totalBytes = lineBytes + finalPart.length;
    if (skippingOversizedLine || totalBytes > MAX_JSONL_ROW_BYTES) {
      console.warn(
        `跳过过大的 Codex 记录：${file.filePath}:${lineIndex}（${formatByteSize(totalBytes)}）`,
      );
      resetLine();
      return;
    }

    const lineBuffer = lineParts.length
      ? Buffer.concat([...lineParts, finalPart], totalBytes)
      : finalPart;
    const line = lineBuffer.toString("utf8").replace(/\r$/, "");
    if (line.trim()) {
      try {
        const compact = compactRow(JSON.parse(line), lineIndex);
        if (compact) rows.push(compact);
      } catch {
        console.warn(`跳过无法解析的记录：${file.filePath}:${lineIndex}`);
      }
    }
    resetLine();
  };

  try {
    fileDescriptor = fs.openSync(file.filePath, "r");
    const snapshotBytes = Math.max(0, Number(file.size || 0));
    while (offset < snapshotBytes) {
      const requestedBytes = Math.min(buffer.length, snapshotBytes - offset);
      const bytesRead = fs.readSync(fileDescriptor, buffer, 0, requestedBytes, offset);
      if (!bytesRead) break;
      const chunk = buffer.subarray(0, bytesRead);
      tail = appendTail(tail, chunk);
      offset += bytesRead;

      let start = 0;
      let newlineIndex = chunk.indexOf(10, start);
      while (newlineIndex !== -1) {
        finishLine(chunk.subarray(start, newlineIndex));
        start = newlineIndex + 1;
        newlineIndex = chunk.indexOf(10, start);
      }
      appendLinePart(chunk.subarray(start));
    }
    if (lineBytes || skippingOversizedLine) finishLine();
  } catch (error) {
    throw sessionReadError(file, error);
  } finally {
    if (fileDescriptor !== null) fs.closeSync(fileDescriptor);
  }

  return {
    rows,
    byteLength: offset,
    tailHash: crypto.createHash("sha256").update(tail).digest("hex"),
  };
}

function sessionFromFile(file) {
  const { rows, byteLength, tailHash } = readJsonl(file);
  const meta = rows.find((row) => row.type === "session_meta")?.payload || {};
  const metadataSessionId = meta.session_id || meta.id || null;
  const timestamps = rows.map(rowDate).filter(Boolean).sort((left, right) => left - right);
  const fallbackDate = new Date(file.modifiedAt);
  return {
    rows,
    filePath: file.filePath,
    modifiedAt: file.modifiedAt,
    sessionId: metadataSessionId || path.basename(file.filePath, ".jsonl"),
    identityQuality: metadataSessionId ? "metadata" : "filename_fallback",
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: rows.length,
      byte_length: byteLength,
      tail_hash: tailHash,
    },
    startAt: timestamps[0] || fallbackDate,
    endAt: timestamps.at(-1) || fallbackDate,
  };
}

function codexSessionFiles(requestedCodexHome = null) {
  const codexHome = requestedCodexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const sessionsDirectory = path.join(codexHome, "sessions");
  const files = walkJsonlFiles(sessionsDirectory)
    .map((filePath) => {
      try {
        const stats = fs.statSync(filePath);
        return { filePath, modifiedAt: stats.mtimeMs, size: stats.size };
      } catch (error) {
        throw sessionReadError({ filePath, size: 0 }, error);
      }
    })
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

export function loadCodexSessions(range, { codexHome = null } = {}) {
  const files = codexSessionFiles(codexHome);
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

export function listRecentCodexSessions(limit = 10, { codexHome = null } = {}) {
  const sessions = deduplicateCodexSessions(codexSessionFiles(codexHome)
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
