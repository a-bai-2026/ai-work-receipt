import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
      rows.push(JSON.parse(line));
    } catch {
      console.warn(`跳过无法解析的记录：${path.basename(filePath)}:${lineIndex + 1}`);
    }
  }
  return rows;
}

export function loadCodexSessions(mode) {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const sessionsDirectory = path.join(codexHome, "sessions");
  const files = walkJsonlFiles(sessionsDirectory)
    .map((filePath) => ({ filePath, modifiedAt: fs.statSync(filePath).mtimeMs }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  if (!files.length) throw new Error(`没有在 ${sessionsDirectory} 找到 Codex 会话记录`);

  const selected = mode === "latest"
    ? files.slice(0, 1)
    : files.filter((file) => file.modifiedAt >= Date.now() - 72 * 60 * 60 * 1000);

  return selected.map((file) => {
    const rows = readJsonl(file.filePath);
    const meta = rows.find((row) => row.type === "session_meta")?.payload || {};
    return {
      rows,
      sessionId: meta.session_id || meta.id || path.basename(file.filePath, ".jsonl"),
    };
  });
}

