import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildReceiptRecord, persistReceiptRecord } from "../src/core/receipt-record.mjs";

const metrics = {
  mode: "latest",
  timezone: "Asia/Shanghai",
  sessionIds: ["session-a"],
  sessionCount: 1,
  startAt: new Date("2026-07-16T15:00:00.000Z"),
  endAt: new Date("2026-07-16T16:00:00.000Z"),
  completedTurns: 4,
  userMessages: 5,
  toolCalls: 8,
  interruptions: 0,
  workDurationMs: 90000,
  averageFirstTokenMs: 2000,
  tokens: {
    input_tokens: 100,
    cached_input_tokens: 80,
    output_tokens: 20,
    reasoning_output_tokens: 10,
    total_tokens: 120,
  },
  models: ["test-model"],
  workTitle: "测试员工",
  review: "测试完成。",
  workPoints: 128,
};

test("结构记录只包含统计和隐私声明", () => {
  const record = buildReceiptRecord(metrics);

  const serialized = JSON.stringify(record);
  assert.equal(record.schema_version, 1);
  assert.equal(record.presentation.compensation.amount, 128);
  assert.equal(record.presentation.compensation.unit, "AI 工分");
  assert.equal(record.privacy.contains_prompts, false);
  assert.equal(record.privacy.contains_code, false);
  assert.doesNotMatch(serialized, /"prompt_text":|"response_text":|"file_path":|"filename":/);

  const updated = buildReceiptRecord({ ...metrics, toolCalls: 99, endAt: new Date("2026-07-16T17:00:00.000Z") });
  assert.equal(updated.id, record.id);
  assert.notEqual(updated.source.snapshot_hash, record.source.snapshot_hash);
});

test("无扩展名输出不会被结构 JSON 覆盖", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-"));
  const outputPath = path.join(tempDir, "receipt");
  const dataDir = path.join(tempDir, "data");
  const record = buildReceiptRecord(metrics);
  fs.writeFileSync(outputPath, "<html>receipt</html>", "utf8");

  const persisted = persistReceiptRecord(record, outputPath, dataDir);

  assert.equal(persisted.companionPath, `${outputPath}.json`);
  assert.equal(fs.readFileSync(outputPath, "utf8"), "<html>receipt</html>");
  assert.equal(JSON.parse(fs.readFileSync(persisted.companionPath, "utf8")).id, record.id);
});
