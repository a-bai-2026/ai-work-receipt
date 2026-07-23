import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCanonicalFacts } from "../src/core/fact-buckets.mjs";
import { collectMetrics } from "../src/core/metrics.mjs";
import { resolveRange } from "../src/core/range.mjs";
import { deduplicateCodexSessions, loadCodexSessions } from "../src/parsers/codex.mjs";

function session(overrides = {}) {
  return {
    sessionId: "shared-session",
    identityQuality: "metadata",
    filePath: "/tmp/session.jsonl",
    modifiedAt: 100,
    startAt: new Date("2026-07-20T01:00:00.000Z"),
    endAt: new Date("2026-07-20T01:10:00.000Z"),
    rows: [{
      __sourceLine: 1,
      timestamp: "2026-07-20T01:00:00.000Z",
      type: "turn_context",
      payload: { model: "gpt-test" },
    }],
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: 10,
      byte_length: 1000,
      tail_hash: "a".repeat(64),
    },
    ...overrides,
  };
}

test("相同会话身份只保留更完整的 append-only 修订", () => {
  const older = session();
  const newer = session({
    filePath: "/tmp/session-newer.jsonl",
    modifiedAt: 200,
    rows: [
      {
        __sourceLine: 1,
        timestamp: "2026-07-20T01:00:00.000Z",
        type: "turn_context",
        payload: { model: "gpt-test" },
      },
      {
        __sourceLine: 2,
        timestamp: "2026-07-20T01:05:00.000Z",
        type: "turn_context",
        payload: { model: "codex-auto-review" },
      },
    ],
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: 20,
      byte_length: 2200,
      tail_hash: "b".repeat(64),
    },
  });

  const result = deduplicateCodexSessions([newer, older]);

  assert.equal(result.length, 1);
  assert.equal(result[0], newer);

  const canonical = buildCanonicalFacts(
    result,
    resolveRange("today", "Asia/Shanghai", new Date("2026-07-20T12:00:00.000Z")),
    { observedAt: "2026-07-20T12:00:00.000Z" },
  );
  assert.equal(canonical.facts.length, 1);
  assert.deepEqual(canonical.facts[0].stats.models, ["codex-auto-review", "gpt-test"]);
});

test("来源修订不可比较时使用最近修改时间稳定决胜", () => {
  const moreRows = session({
    filePath: "/tmp/more-rows.jsonl",
    modifiedAt: 100,
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: 20,
      byte_length: 900,
      tail_hash: "a".repeat(64),
    },
  });
  const moreBytes = session({
    filePath: "/tmp/more-bytes.jsonl",
    modifiedAt: 200,
    sourceRevision: {
      kind: "append-only-jsonl-v1",
      row_count: 10,
      byte_length: 2200,
      tail_hash: "b".repeat(64),
    },
  });

  const result = deduplicateCodexSessions([moreRows, moreBytes]);

  assert.equal(result.length, 1);
  assert.equal(result[0], moreBytes);
});

test("大型会话逐块读取并在内存中丢弃提示词与工具输出", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-parser-"));
  const codexHome = path.join(tempDir, ".codex");
  const sessionsDir = path.join(codexHome, "sessions", "2026", "07", "21");
  const filePath = path.join(sessionsDir, "rollout-streaming.jsonl");
  const privateMarker = "must-not-remain-in-memory-";
  const largePrivateValue = privateMarker.repeat(120_000);
  const rows = [
    {
      timestamp: "2026-07-21T01:00:00.000Z",
      type: "session_meta",
      payload: { id: "streaming-session", private_context: largePrivateValue },
    },
    {
      timestamp: "2026-07-21T01:01:00.000Z",
      type: "turn_context",
      payload: { model: "gpt-test", instructions: largePrivateValue },
    },
    {
      timestamp: "2026-07-21T01:02:00.000Z",
      type: "event_msg",
      payload: { type: "user_message", message: largePrivateValue },
    },
    {
      timestamp: "2026-07-21T01:03:00.000Z",
      type: "response_item",
      payload: { type: "function_call", name: "apply_patch", arguments: largePrivateValue },
    },
    {
      timestamp: "2026-07-21T01:04:00.000Z",
      type: "event_msg",
      payload: { type: "task_complete", duration_ms: 5_000, time_to_first_token_ms: 700 },
    },
    {
      timestamp: "2026-07-21T01:05:00.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 80,
            cached_input_tokens: 50,
            output_tokens: 20,
            reasoning_output_tokens: 10,
            total_tokens: 100,
          },
        },
      },
    },
  ];
  const source = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(filePath, source, "utf8");

  const previousCodexHome = process.env.CODEX_HOME;
  const originalReadFileSync = fs.readFileSync;
  process.env.CODEX_HOME = codexHome;
  fs.readFileSync = () => {
    throw new Error("会话解析不应整文件读取");
  };

  let sessions;
  try {
    sessions = loadCodexSessions(
      resolveRange("today", "Asia/Shanghai", new Date("2026-07-21T12:00:00.000Z")),
    );
  } finally {
    fs.readFileSync = originalReadFileSync;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
  }

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionId, "streaming-session");
  assert.equal(sessions[0].sourceRevision.byte_length, Buffer.byteLength(source));
  assert.equal(
    sessions[0].sourceRevision.tail_hash,
    crypto.createHash("sha256").update(Buffer.from(source).subarray(-4096)).digest("hex"),
  );
  assert.doesNotMatch(JSON.stringify(sessions[0].rows), new RegExp(privateMarker));
  const toolPayload = sessions[0].rows.find((row) => row.type === "response_item")?.payload;
  assert.deepEqual(toolPayload, { type: "function_call", tool_category: "file-edit" });
  assert.doesNotMatch(JSON.stringify(sessions[0].rows), /apply_patch/);

  const metrics = collectMetrics(
    sessions,
    resolveRange("today", "Asia/Shanghai", new Date("2026-07-21T12:00:00.000Z")),
  );
  assert.equal(metrics.sessionCount, 1);
  assert.equal(metrics.completedTurns, 1);
  assert.equal(metrics.userMessages, 1);
  assert.equal(metrics.toolCalls, 1);
  assert.deepEqual(metrics.insights.tool_usage, [{ category: "file-edit", count: 1 }]);
  assert.equal(metrics.tokens.total_tokens, 100);
});

test("会话文件读取失败时错误会包含文件路径和体积", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-error-"));
  const codexHome = path.join(tempDir, ".codex");
  const sessionsDir = path.join(codexHome, "sessions");
  const filePath = path.join(sessionsDir, "unreadable.jsonl");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(filePath, "{}\n", "utf8");

  const previousCodexHome = process.env.CODEX_HOME;
  const originalOpenSync = fs.openSync;
  process.env.CODEX_HOME = codexHome;
  fs.openSync = (candidate, ...args) => {
    if (candidate === filePath) throw new Error("synthetic read failure");
    return originalOpenSync(candidate, ...args);
  };

  try {
    assert.throws(
      () => loadCodexSessions(resolveRange("latest", "UTC", new Date("2026-07-21T12:00:00.000Z"))),
      (error) => error.message.includes(filePath)
        && error.message.includes("3 B")
        && error.message.includes("synthetic read failure"),
    );
  } finally {
    fs.openSync = originalOpenSync;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
  }
});
