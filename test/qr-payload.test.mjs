import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  decodeMultipartReceiptPayloads,
  decodeReceiptPayload,
  encodeReceiptPayload,
  encodeSingleReceiptQr,
} from "../src/core/qr-payload.mjs";

const record = {
  schema_version: 1,
  id: "cwr_example",
  generated_at: "2026-07-17T00:00:00.000Z",
  source: { scope: "latest" },
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

test("二维码显式携带新的统计范围和自然日边界", () => {
  const payload = encodeReceiptPayload({
    ...record,
    source: { scope: "last-7-days" },
    period: {
      ...record.period,
      range_start_date: "2026-07-11",
      range_end_date: "2026-07-17",
    },
    presentation: {
      ...record.presentation,
      compensation: { ...record.presentation.compensation, label: "近七日工资" },
    },
  });
  const decoded = decodeReceiptPayload(payload);

  assert.equal(decoded.o, "last-7-days");
  assert.deepEqual(decoded.d.slice(3), ["2026-07-11", "2026-07-17"]);
});

test("滚动小时摘要继续使用可解码的 cwr1 载荷", () => {
  const payload = encodeReceiptPayload({
    ...record,
    source: { scope: "last-hours", hours: 3 },
  });
  const decoded = decodeReceiptPayload(payload);

  assert.match(payload, /^cwr1\./);
  assert.equal(decoded.o, "last-hours");
});

function cwr2Fact(index) {
  const suffix = String(index).padStart(2, "0");
  return {
    fact_id: `cwf_${suffix}${"a".repeat(60)}`,
    session_id: `cws_${suffix}${"b".repeat(60)}`,
    identity_quality: "metadata",
    source_type: "codex",
    local_date: `2026-07-${String((index % 7) + 11).padStart(2, "0")}`,
    bucket_start_at: `2026-07-1${index % 7}T01:00:00.000Z`,
    bucket_end_at: `2026-07-1${index % 7}T02:00:00.000Z`,
    source_watermark_at: `2026-07-1${index % 7}T02:00:00.000Z`,
    observed_at: "2026-07-19T14:08:00.000Z",
    source_revision: {
      kind: "append-only-jsonl-v1",
      row_count: 1000 + index,
      byte_length: 100000 + index * 100,
      tail_hash: `${suffix}${"c".repeat(62)}`,
    },
    content_hash: `${suffix}${"d".repeat(62)}`,
    stats: {
      completed_turns: index + 1,
      user_messages: index + 2,
      tool_calls: index + 3,
      interruptions: index % 2,
      work_duration_ms: 60000 + index,
      first_token_total_ms: 1200 + index,
      first_token_sample_count: 1,
      input_tokens: 1000 + index,
      cached_input_tokens: 500 + index,
      output_tokens: 300 + index,
      reasoning_output_tokens: 100 + index,
      total_tokens: 1300 + index,
      token_reset_count: 0,
      models: [`model-${suffix}`],
    },
  };
}

test("cwr2 单码保留 canonical manifest 和 facts", () => {
  const facts = [cwr2Fact(0), cwr2Fact(1)];
  const cwr2Record = {
    ...record,
    schema_version: 2,
    id: "cwr2_example",
    source: { scope: "last-7-days", logical_key: "last-7-days:example", snapshot_hash: "snapshot" },
    manifest: {
      version: 1,
      fact_schema_version: 1,
      metric_schema_version: 1,
      accounting_timezone: "Asia/Shanghai",
      fact_count: facts.length,
      fact_ids: facts.map((fact) => fact.fact_id),
      coverage: {
        kind: "calendar_range",
        scan_mode: "full",
        start_date: "2026-07-13",
        end_date: "2026-07-19",
        complete_through_date: "2026-07-18",
        observed_through_at: "2026-07-19T14:08:00.000Z",
      },
      manifest_hash: "manifest",
    },
    facts,
  };
  const decoded = decodeReceiptPayload(encodeReceiptPayload(cwr2Record));
  assert.equal(decoded.v, 2);
  assert.equal(decoded.a[4], 2);
  assert.equal(decoded.f.length, 2);
});

function legacyChecksum(value, length = 8) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, length);
}

function legacyMultipartPayloads(singlePayload, partCount = 3) {
  const transferId = legacyChecksum(singlePayload, 12);
  const totalChecksum = legacyChecksum(singlePayload);
  const chunkSize = Math.ceil(singlePayload.length / partCount);
  const chunks = [];
  for (let offset = 0; offset < singlePayload.length; offset += chunkSize) {
    chunks.push(singlePayload.slice(offset, offset + chunkSize));
  }
  return chunks.map((chunk, index) => (
    `cwr2p.${transferId}.${index + 1}.${chunks.length}.${totalChecksum}.${legacyChecksum(chunk)}.${chunk}`
  ));
}

test("过大的 cwr2 不再生成分片二维码，但历史分片仍可乱序解码", () => {
  const facts = Array.from({ length: 8 }, (_, index) => cwr2Fact(index));
  const cwr2Record = {
    ...record,
    schema_version: 2,
    id: "cwr2_multipart",
    source: { scope: "last-7-days", logical_key: "last-7-days:multipart", snapshot_hash: "snapshot" },
    manifest: {
      version: 1,
      fact_schema_version: 1,
      metric_schema_version: 1,
      accounting_timezone: "Asia/Shanghai",
      fact_count: facts.length,
      fact_ids: facts.map((fact) => fact.fact_id),
      coverage: {
        kind: "calendar_range",
        scan_mode: "best_effort",
        start_date: "2026-07-13",
        end_date: "2026-07-19",
        complete_through_date: null,
        observed_through_at: "2026-07-19T14:08:00.000Z",
      },
      manifest_hash: "manifest",
    },
    facts,
  };
  assert.equal(encodeSingleReceiptQr(cwr2Record, { maxVersion: 10 }), null);
  const payloads = legacyMultipartPayloads(encodeReceiptPayload(cwr2Record));
  const decoded = decodeMultipartReceiptPayloads([...payloads].reverse());
  assert.equal(decoded.i, "cwr2_multipart");
  assert.equal(decoded.f.length, 8);
});

test("只有完整载荷能放进一个二维码时才返回扫码数据", () => {
  const encoded = encodeSingleReceiptQr(record);

  assert.ok(encoded);
  assert.equal(typeof encoded.payload, "string");
  assert.ok(encoded.version <= 25);
  assert.equal(decodeReceiptPayload(encoded.payload).i, record.id);
});
