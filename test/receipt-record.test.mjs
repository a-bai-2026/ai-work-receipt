import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { decodeReceiptFile } from "../src/core/file-payload.mjs";
import { buildReceiptRecord, persistReceiptRecord } from "../src/core/receipt-record.mjs";

const metrics = {
  mode: "latest",
  timezone: "Asia/Shanghai",
  targetDate: "2026-07-17",
  rangeStartDate: "2026-07-17",
  rangeEndDate: "2026-07-17",
  activeDayCount: 1,
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
  workProfileId: "toolchain-commander",
  workPoints: 128,
};

test("结构记录只包含统计和隐私声明", () => {
  const record = buildReceiptRecord(metrics);

  const serialized = JSON.stringify(record);
  assert.equal(record.schema_version, 2);
  assert.equal(record.source.version, "cwr2");
  assert.equal(record.source.collector_version, "0.6.0");
  assert.equal(record.presentation.compensation.amount, 128);
  assert.equal(record.presentation.compensation.unit, "AI 工分");
  assert.equal(record.presentation.work_profile, "toolchain-commander");
  assert.equal(record.presentation.work_title, "工具链指挥官");
  assert.equal(record.period.range_start_date, "2026-07-17");
  assert.equal(record.privacy.contains_prompts, false);
  assert.equal(record.privacy.contains_code, false);
  assert.equal(record.manifest.fact_count, 0);
  assert.doesNotMatch(serialized, /"prompt_text":|"response_text":|"file_path":|"filename":/);

  const updated = buildReceiptRecord({ ...metrics, toolCalls: 99, endAt: new Date("2026-07-16T17:00:00.000Z") });
  assert.equal(updated.id, record.id);
  assert.notEqual(updated.source.snapshot_hash, record.source.snapshot_hash);
});

test("英文结构记录使用同一语义角色和英文展示文案", () => {
  const record = buildReceiptRecord(metrics, "diner", "en");

  assert.equal(record.locale, "en");
  assert.equal(record.presentation.work_profile, "toolchain-commander");
  assert.equal(record.presentation.work_title, "Toolchain Commander");
  assert.match(record.presentation.review, /calling tools/);
  assert.equal(record.presentation.compensation.label, "SHIFT PAY");
  assert.equal(record.presentation.compensation.unit, "AI work pts");
});

test("同一自然周重复生成会更新同一张历史小票", () => {
  const weekly = buildReceiptRecord({
    ...metrics,
    mode: "this-week",
    rangeStartDate: "2026-07-13",
    rangeEndDate: "2026-07-16",
  });
  const updatedWeekly = buildReceiptRecord({
    ...metrics,
    mode: "this-week",
    rangeStartDate: "2026-07-13",
    rangeEndDate: "2026-07-18",
    endAt: new Date("2026-07-18T16:00:00.000Z"),
  });

  assert.equal(updatedWeekly.id, weekly.id);
  assert.notEqual(updatedWeekly.source.snapshot_hash, weekly.source.snapshot_hash);
});

test("滚动小时范围使用兼容摘要协议且不生成自然日事实", () => {
  const record = buildReceiptRecord({
    ...metrics,
    mode: "last-hours",
    rangeStartDate: "2026-07-18",
    rangeEndDate: "2026-07-18",
    windowStartAt: new Date("2026-07-18T09:00:00.000Z"),
    windowEndAt: new Date("2026-07-18T12:00:00.000Z"),
    windowHours: 3,
  }, "payroll", "zh-CN");

  assert.equal(record.schema_version, 1);
  assert.equal(record.source.version, "cwr1");
  assert.equal(record.source.scope, "last-hours");
  assert.equal(record.source.hours, 3);
  assert.equal(record.period.start_at, "2026-07-18T09:00:00.000Z");
  assert.equal(record.period.end_at, "2026-07-18T12:00:00.000Z");
  assert.equal("manifest" in record, false);
  assert.equal("facts" in record, false);
});

test("无扩展名输出不会被结构 JSON 覆盖", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-"));
  const outputPath = path.join(tempDir, "receipt");
  const dataDir = path.join(tempDir, "data");
  const record = buildReceiptRecord(metrics);
  fs.writeFileSync(outputPath, "<html>receipt</html>", "utf8");

  const persisted = persistReceiptRecord(record, outputPath, dataDir);

  assert.equal(persisted.companionPath, `${outputPath}.json`);
  assert.equal(persisted.transferPath, `${outputPath}.cwr.json`);
  assert.equal(fs.readFileSync(outputPath, "utf8"), "<html>receipt</html>");
  assert.equal(JSON.parse(fs.readFileSync(persisted.companionPath, "utf8")).id, record.id);
  assert.equal(decodeReceiptFile(fs.readFileSync(persisted.transferPath, "utf8")).i, record.id);
});

test("本地历史逐条写入而不是拼接成单个大字符串", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-history-"));
  const outputPath = path.join(tempDir, "receipt.html");
  const dataDir = path.join(tempDir, "data");
  const record = buildReceiptRecord(metrics);
  const originalJoin = Array.prototype.join;

  Array.prototype.join = function guardedJoin(separator) {
    if (separator === "\n") throw new Error("历史记录不应通过换行符整体拼接");
    return originalJoin.call(this, separator);
  };
  try {
    persistReceiptRecord(record, outputPath, dataDir);
  } finally {
    Array.prototype.join = originalJoin;
  }

  const history = fs.readFileSync(path.join(dataDir, "history.jsonl"), "utf8");
  assert.equal(history.trim().split("\n").length, 1);
  assert.equal(JSON.parse(history).id, record.id);
});
