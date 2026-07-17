#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

import { parseArgs, printHelp } from "./core/args.mjs";
import { collectMetrics } from "./core/metrics.mjs";
import { encodeReceiptPayload } from "./core/qr-payload.mjs";
import { buildReceiptRecord, persistReceiptRecord } from "./core/receipt-record.mjs";
import { formatNumber } from "./lib/time.mjs";
import { loadCodexSessions } from "./parsers/codex.mjs";
import { renderHtml } from "./renderers/html.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.dirname(SCRIPT_DIR);
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "codex-work-receipt-output");
const DEFAULT_MINIPROGRAM_CODE = path.join(PROJECT_DIR, "assets", "miniprogram-code.png");

function mimeTypeForImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".svg") return "image/svg+xml";
  throw new Error(`不支持的小程序码图片格式：${extension || "未知"}`);
}

function imageAsDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return `data:${mimeTypeForImage(filePath)};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function openFile(filePath) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sessions = loadCodexSessions(options.mode);
  const metrics = collectMetrics(sessions, options.mode, options.timezone);
  const record = buildReceiptRecord(metrics, options.theme);
  const qrPayload = encodeReceiptPayload(record);
  const dataQrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#171713", light: "#ffffff" },
  });

  const requestedOutput = options.output || path.join(DEFAULT_OUTPUT_DIR, `codex-receipt-${options.mode}.html`);
  const outputFile = path.resolve(/\.html?$/i.test(requestedOutput) ? requestedOutput : `${requestedOutput}.html`);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const configuredMiniProgramCode = options.miniProgramCode
    ? path.resolve(options.miniProgramCode)
    : DEFAULT_MINIPROGRAM_CODE;
  const miniProgramCodeDataUrl = imageAsDataUrl(configuredMiniProgramCode);

  fs.writeFileSync(
    outputFile,
    renderHtml({ record, dataQrDataUrl, miniProgramCodeDataUrl }),
    "utf8",
  );
  const persisted = persistReceiptRecord(record, outputFile, options.dataDir);

  console.log(`已生成网页：${outputFile}`);
  console.log(`结构数据：${persisted.companionPath}`);
  console.log(`本地历史：${persisted.receiptPath}`);
  console.log(`统计：${record.stats.completed_turns} 轮 · ${formatNumber(record.stats.tokens.total_tokens)} Token · ${record.stats.tool_calls} 次工具调用`);
  console.log(`数据二维码：${qrPayload.length} 字符 · schema v${record.schema_version}`);
  if (!miniProgramCodeDataUrl) console.log("小程序码：尚未配置，页面使用明确占位符");
  if (options.open) openFile(outputFile);
}

main().catch((error) => {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
});
