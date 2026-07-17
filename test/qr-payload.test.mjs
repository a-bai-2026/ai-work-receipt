import assert from "node:assert/strict";
import test from "node:test";

import { decodeReceiptPayload, encodeReceiptPayload } from "../src/core/qr-payload.mjs";

const record = {
  schema_version: 1,
  id: "cwr_example",
  generated_at: "2026-07-17T00:00:00.000Z",
  period: {
    start_at: "2026-07-16T15:00:00.000Z",
    end_at: "2026-07-16T16:00:00.000Z",
    timezone: "Asia/Shanghai",
  },
  stats: {
    session_count: 1,
    completed_turns: 6,
    user_messages: 7,
    tool_calls: 12,
    interruptions: 1,
    work_duration_ms: 120000,
    average_first_token_ms: 2500,
    tokens: {
      input_tokens: 1000,
      cached_input_tokens: 800,
      output_tokens: 200,
      reasoning_output_tokens: 100,
      total_tokens: 1200,
    },
    models: ["test-model"],
  },
  presentation: {
    default_theme: "classic",
    work_title: "测试员工",
    review: "测试完成。",
    compensation: {
      label: "本单工资",
      amount: 128,
      unit: "AI 工分",
      note: "娱乐折算，不代表真实费用。",
      formula_version: "work_points_v1",
    },
  },
};

test("二维码结构数据可以无损解码", () => {
  const payload = encodeReceiptPayload(record);
  const decoded = decodeReceiptPayload(payload);
  assert.equal(decoded.v, 1);
  assert.equal(decoded.i, "cwr_example");
  assert.deepEqual(decoded.s.slice(0, 4), [1, 6, 7, 12]);
  assert.equal(decoded.t.at(-1), 1200);
  assert.deepEqual(decoded.p.at(-1), ["本单工资", 128, "AI 工分", "娱乐折算，不代表真实费用。", "work_points_v1"]);
});

test("损坏的二维码数据会被拒绝", () => {
  const payload = encodeReceiptPayload(record);
  assert.throws(() => decodeReceiptPayload(`${payload}x`), /校验失败|invalid|incorrect/i);
});
