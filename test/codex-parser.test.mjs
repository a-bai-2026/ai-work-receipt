import assert from "node:assert/strict";
import test from "node:test";

import { buildCanonicalFacts } from "../src/core/fact-buckets.mjs";
import { resolveRange } from "../src/core/range.mjs";
import { deduplicateCodexSessions } from "../src/parsers/codex.mjs";

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
