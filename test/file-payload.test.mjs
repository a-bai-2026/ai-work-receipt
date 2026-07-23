import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReceiptFileEnvelope,
  createReceiptFile,
  decodeReceiptFile,
} from "../src/core/file-payload.mjs";
import { encodeSingleReceiptQr } from "../src/core/qr-payload.mjs";
import { buildReceiptRecord } from "../src/core/receipt-record.mjs";
import { compactReceipt } from "../src/core/transfer-record.mjs";

const metrics = {
  mode: "today",
  timezone: "Asia/Shanghai",
  targetDate: "2026-07-22",
  rangeStartDate: "2026-07-22",
  rangeEndDate: "2026-07-22",
  activeDayCount: 1,
  sessionIds: ["file-transfer-session"],
  sessionCount: 1,
  startAt: new Date("2026-07-22T01:00:00.000Z"),
  endAt: new Date("2026-07-22T02:00:00.000Z"),
  completedTurns: 8,
  userMessages: 9,
  toolCalls: 21,
  interruptions: 0,
  workDurationMs: 3_600_000,
  averageFirstTokenMs: 1250,
  tokens: {
    input_tokens: 12_000,
    cached_input_tokens: 10_000,
    output_tokens: 2_000,
    reasoning_output_tokens: 500,
    total_tokens: 14_000,
  },
  models: ["test-model"],
  workProfileId: "toolchain-commander",
  workPoints: 520,
};

function hash(seed) {
  return crypto.createHash("sha256").update(String(seed)).digest("hex");
}

function fact(index) {
  return {
    fact_id: `cwf_${hash(`fact-${index}`)}`,
    session_id: `cws_${hash(`session-${index}`)}`,
    identity_quality: "metadata",
    source_type: "codex",
    local_date: "2026-07-22",
    bucket_start_at: "2026-07-22T01:00:00.000Z",
    bucket_end_at: "2026-07-22T02:00:00.000Z",
    source_watermark_at: "2026-07-22T02:00:00.000Z",
    observed_at: "2026-07-22T02:00:01.000Z",
    source_revision: {
      kind: "append-only-jsonl-v1",
      row_count: 100 + index,
      byte_length: 10_000 + index,
      tail_hash: hash(`tail-${index}`),
    },
    content_hash: hash(`content-${index}`),
    stats: {
      completed_turns: 8,
      user_messages: 9,
      tool_calls: 21,
      interruptions: 0,
      work_duration_ms: 3_600_000,
      first_token_total_ms: 10_000,
      first_token_sample_count: 8,
      input_tokens: 12_000,
      cached_input_tokens: 10_000,
      output_tokens: 2_000,
      reasoning_output_tokens: 500,
      total_tokens: 14_000,
      token_reset_count: 0,
      models: ["test-model"],
    },
  };
}

function recordWithFacts(count) {
  const facts = Array.from({ length: count }, (_, index) => fact(index));
  return buildReceiptRecord(metrics, "classic", "zh-CN", {
    facts,
    coverage: {
      kind: "calendar_range",
      scan_mode: "full",
      start_date: "2026-07-22",
      end_date: "2026-07-22",
      complete_through_date: null,
      observed_through_at: "2026-07-22T02:00:01.000Z",
    },
  });
}

test("cwr-file-v1 使用与二维码相同的隐私安全传输投影", () => {
  const record = recordWithFacts(2);
  const transferFile = createReceiptFile(record);
  const decoded = decodeReceiptFile(transferFile.content);

  assert.deepEqual(decoded, compactReceipt(record));
  assert.equal(transferFile.envelope.format, "codex-work-receipt");
  assert.equal(transferFile.envelope.file_version, 1);
  assert.equal(transferFile.envelope.payload_schema, "cwr2");
  assert.equal("x" in decoded, false);
  assert.doesNotMatch(transferFile.content, /cache_hit_rate|activity_by_hour|tool_usage/);
  assert.match(transferFile.envelope.integrity.digest, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(
    transferFile.content,
    /prompt_text|response_text|file_path|filename|project_path|source_code/,
  );
});

test("微信导入文件被修改后会被完整性校验拒绝", () => {
  const envelope = buildReceiptFileEnvelope(recordWithFacts(1));
  envelope.payload.s[0] += 1;

  assert.throws(() => decodeReceiptFile(envelope), /完整性校验失败/);
});

test("微信导入文件拒绝错误格式、版本和协议", () => {
  const envelope = buildReceiptFileEnvelope(recordWithFacts(1));

  assert.throws(() => decodeReceiptFile("not-json"), /有效的 JSON/);
  assert.throws(() => decodeReceiptFile({ ...envelope, format: "other" }), /不是有效/);
  assert.throws(() => decodeReceiptFile({ ...envelope, file_version: 2 }), /不支持的导入文件版本/);
  assert.throws(() => decodeReceiptFile({ ...envelope, payload_schema: "cwr3" }), /不支持的小票数据协议/);
});

test("大量 canonical facts 仍输出一个文件，并自动关闭数据二维码", () => {
  const record = recordWithFacts(80);
  const transferFile = createReceiptFile(record);

  assert.equal(decodeReceiptFile(transferFile.content).f.length, 80);
  assert.equal(encodeSingleReceiptQr(record), null);
  assert.ok(Buffer.byteLength(transferFile.content, "utf8") < 2 * 1024 * 1024);
});

test("提供跨仓库可复用的 cwr-file-v1 兼容夹具", () => {
  const fixturePath = fileURLToPath(new URL("../docs/fixtures/cwr-file-v1.json", import.meta.url));
  const payload = decodeReceiptFile(fs.readFileSync(fixturePath, "utf8"));

  assert.equal(payload.v, 1);
  assert.equal(payload.i, "cwr_fixture");
  assert.equal(payload.s[0], 1);
});
