import assert from "node:assert/strict";
import test from "node:test";

import { buildCanonicalFacts } from "../src/core/fact-buckets.mjs";
import { resolveRange } from "../src/core/range.mjs";

function tokenRow(line, timestamp, total) {
  return {
    __sourceLine: line,
    timestamp,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: total,
          cached_input_tokens: 0,
          output_tokens: 0,
          reasoning_output_tokens: 0,
          total_tokens: total,
        },
      },
    },
  };
}

const session = {
  sessionId: "raw-session-a",
  identityQuality: "metadata",
  sourceRevision: {
    kind: "append-only-jsonl-v1",
    row_count: 7,
    byte_length: 700,
    tail_hash: "tail-a",
  },
  rows: [
    tokenRow(1, "2026-07-17T10:00:00.000Z", 100),
    { __sourceLine: 2, timestamp: "2026-07-18T01:00:00.000Z", type: "turn_context", payload: { model: "gpt-test" } },
    { __sourceLine: 3, timestamp: "2026-07-18T01:05:00.000Z", type: "event_msg", payload: { type: "task_complete", duration_ms: 60000, time_to_first_token_ms: 800 } },
    tokenRow(4, "2026-07-18T01:06:00.000Z", 180),
    tokenRow(5, "2026-07-18T01:07:00.000Z", 20),
    { __sourceLine: 6, timestamp: "2026-07-19T01:05:00.000Z", type: "event_msg", payload: { type: "task_complete", duration_ms: 30000 } },
    tokenRow(7, "2026-07-19T01:06:00.000Z", 50),
  ],
};

test("today 与 last-7-days 对同一会话日生成相同 factId", () => {
  const observedAt = "2026-07-19T03:00:00.000Z";
  const today = buildCanonicalFacts(
    [session],
    resolveRange("today", "Asia/Shanghai", new Date("2026-07-18T12:00:00.000Z")),
    { observedAt },
  );
  const week = buildCanonicalFacts(
    [session],
    resolveRange("last-7-days", "Asia/Shanghai", new Date("2026-07-18T12:00:00.000Z")),
    { observedAt },
  );
  const todayFact = today.facts.find((fact) => fact.local_date === "2026-07-18");
  const weekFact = week.facts.find((fact) => fact.local_date === "2026-07-18");

  assert.ok(todayFact);
  assert.equal(todayFact.fact_id, weekFact.fact_id);
  assert.equal(todayFact.content_hash, weekFact.content_hash);
});

test("会话日 Token 增量按来源顺序处理重置", () => {
  const result = buildCanonicalFacts(
    [session],
    resolveRange("last-7-days", "Asia/Shanghai", new Date("2026-07-19T12:00:00.000Z")),
    { observedAt: "2026-07-19T12:00:00.000Z" },
  );
  const fact = result.facts.find((item) => item.local_date === "2026-07-18");

  assert.equal(fact.stats.total_tokens, 100);
  assert.equal(fact.stats.token_reset_count, 1);
});

test("重复会话事实不会被写入 cwr2 manifest", () => {
  const duplicate = {
    ...session,
    rows: session.rows.map((row) => ({ ...row })),
    sourceRevision: {
      ...session.sourceRevision,
      tail_hash: "tail-b",
    },
  };

  assert.throws(
    () => buildCanonicalFacts(
      [session, duplicate],
      resolveRange("today", "Asia/Shanghai", new Date("2026-07-18T12:00:00.000Z")),
      { observedAt: "2026-07-19T12:00:00.000Z" },
    ),
    /重复的规范事实/,
  );
});
