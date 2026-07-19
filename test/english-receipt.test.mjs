import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";

import { compactReceipt } from "../src/core/qr-payload.mjs";
import { getWorkProfileCopy, selectWorkProfileId } from "../src/core/presentation.mjs";
import { buildReceiptRecord } from "../src/core/receipt-record.mjs";
import { renderHtml } from "../src/renderers/html.mjs";

const metrics = {
  mode: "latest",
  timezone: "Asia/Shanghai",
  targetDate: "2026-07-18",
  rangeStartDate: "2026-07-18",
  rangeEndDate: "2026-07-18",
  activeDayCount: 1,
  sessionIds: ["english-session"],
  sessionCount: 1,
  startAt: new Date("2026-07-18T10:00:00.000Z"),
  endAt: new Date("2026-07-18T11:00:00.000Z"),
  completedTurns: 8,
  userMessages: 9,
  toolCalls: 42,
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

test("工种规则先生成语义 ID，再分别映射中英文文案", () => {
  const profileId = selectWorkProfileId(metrics);

  assert.equal(profileId, "toolchain-commander");
  assert.equal(getWorkProfileCopy(profileId, "zh-CN").title, "工具链指挥官");
  assert.equal(getWorkProfileCopy(profileId, "en").title, "Toolchain Commander");
});

test("英文 HTML 会完整本地化主要小票内容", () => {
  const record = buildReceiptRecord(metrics, "payroll", "en");
  const html = renderHtml({
    record,
    dataQrDataUrl: "data:image/png;base64,DATA",
    miniProgramCodeDataUrl: "data:image/png;base64,MINI",
  });

  assert.match(html, /<html lang="en"/);
  assert.match(html, /AI Work Receipt/);
  assert.match(html, /Latest session/);
  assert.match(html, /Toolchain Commander/);
  assert.match(html, /SHIFT PAY/);
  assert.match(html, /Classic White/);
  assert.match(html, /Vintage Pink/);
  assert.match(html, /Night Shift Green/);
  assert.match(html, /--paper: #ffffff/);
  assert.match(html, /--paper: #f7dde3/);
  assert.match(html, /--paper: #66742f/);
  assert.match(html, /--ink: #ffe077/);
  assert.match(html, /Open mini program/);
  assert.match(html, /qr-grid qr-grid--single/);
  assert.doesNotMatch(html, /id="multipart-live"/);
  assert.match(html, /Structured data is also stored locally/);
  assert.match(html, /Save full PNG/);
  assert.match(html, /id="save-receipt-image"/);
  assert.match(html, /domtoimage\.toPng/);
  assert.match(html, /data-barcode-value="[A-Z0-9]+-008"/);
  assert.match(html, /barcode-segment--bar/);
  assert.match(html, /barcode-segment--space/);
  assert.match(html, /style="flex-grow:[1-4]"/);
  assert.doesNotMatch(html, /background: repeating-linear-gradient\(90deg/);

  const exportStart = html.indexOf('<div class="export-sheet" id="receipt-export">');
  const exportEnd = html.indexOf('<p class="privacy">', exportStart);
  const exportMarkup = html.slice(exportStart, exportEnd);
  assert.match(exportMarkup, /paper receipt/);
  assert.match(exportMarkup, /paper transfer-stub/);
  assert.doesNotMatch(exportMarkup, /theme-switcher|save-receipt-image|class="privacy"/);
  assert.match(html, /function sanitizeExportNode/);
  assert.match(html, /node\.querySelectorAll\("\[data-data-qr-index\]"\)\.forEach\(\(item\) => item\.remove\(\)\)/);
  assert.match(html, /grid\.style\.gridTemplateColumns = "minmax\(0, 1fr\)"/);
  assert.match(html, /domtoimage\.toPng\(renderNode/);
  assert.match(html, /data-export-mini-label/);
});

test("多分片 HTML 实时轮播数据码，导出时仅保留小程序码", () => {
  const record = buildReceiptRecord(metrics, "classic", "zh-CN");
  const html = renderHtml({
    record,
    dataQrDataUrls: [
      "data:image/png;base64,PART1",
      "data:image/png;base64,PART2",
      "data:image/png;base64,PART3",
    ],
    miniProgramCodeDataUrl: "data:image/png;base64,MINI",
  });

  assert.match(html, /id="multipart-live"/);
  assert.match(html, /id="multipart-setup"/);
  assert.match(html, /id="multipart-stage" hidden/);
  assert.match(html, /id="multipart-active-qr"/);
  assert.equal((html.match(/id="multipart-active-qr"/g) || []).length, 1);
  assert.match(html, /qr-grid qr-grid--export-only/);
  assert.match(html, /data-data-qr-index="0"/);
  assert.match(html, /data-data-qr-index="2"/);
  assert.match(html, /startMultipartTransfer/);
  assert.match(html, /showMultipartSetup/);
  assert.match(html, /sanitizeExportNode\(clone\)/);
  assert.match(html, /miniProgramLabel\.textContent = exportConfig\.miniProgramLabel/);
  assert.doesNotMatch(html, /qr-grid qr-grid--single/);

  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(inlineScripts.length > 0);
  assert.doesNotThrow(() => new Script(inlineScripts.at(-1)[1]));
});

test("英文网页的数据二维码继续兼容当前中文小程序", () => {
  const record = buildReceiptRecord(metrics, "diner", "en");
  const compact = compactReceipt(record);

  assert.equal(compact.l, "en");
  assert.equal(compact.r, "toolchain-commander");
  assert.equal(compact.p[1], "工具链指挥官");
  assert.equal(compact.p[3][0], "本单工资");
  assert.equal(compact.p[3][2], "AI 工分");
});

test("自然日范围会在小票顶部展示完整统计周期", () => {
  const record = buildReceiptRecord({
    ...metrics,
    mode: "last-7-days",
    rangeStartDate: "2026-07-12",
    rangeEndDate: "2026-07-18",
    startAt: new Date("2026-07-12T02:00:00.000Z"),
    endAt: new Date("2026-07-18T11:00:00.000Z"),
  }, "classic", "zh-CN");
  const html = renderHtml({
    record,
    dataQrDataUrl: "data:image/png;base64,DATA",
    miniProgramCodeDataUrl: "data:image/png;base64,MINI",
  });

  assert.match(html, /统计周期: 2026\/07\/12—2026\/07\/18 · 最近 7 个自然日/);
  assert.match(html, /codex-work-receipt-last-7-days-2026-07-12-to-2026-07-18/);
});

test("滚动小时范围展示请求窗口和动态小时文案", () => {
  const record = buildReceiptRecord({
    ...metrics,
    mode: "last-hours",
    windowStartAt: new Date("2026-07-18T08:00:00.000Z"),
    windowEndAt: new Date("2026-07-18T11:00:00.000Z"),
    windowHours: 3,
  }, "payroll", "en");
  const html = renderHtml({ record, dataQrDataUrl: "data:image/png;base64,DATA" });

  assert.match(html, /Last 3 hours/);
  assert.match(html, /Work hours: 16:00—19:00/);
  assert.match(html, /WINDOW PAY/);
});
