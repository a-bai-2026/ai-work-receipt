#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

import { parseArgs, printHelp } from "./core/args.mjs";
import { buildCanonicalFacts } from "./core/fact-buckets.mjs";
import { collectMetrics } from "./core/metrics.mjs";
import { printOpenSourcePrompt } from "./core/open-source.mjs";
import { getRollingSummaryNotice, getScopeLabel } from "./core/presentation.mjs";
import { encodeReceiptPayloads } from "./core/qr-payload.mjs";
import { outputSlugForRange, resolveRange } from "./core/range.mjs";
import { buildReceiptRecord, persistReceiptRecord } from "./core/receipt-record.mjs";
import { promptForRange } from "./core/selector.mjs";
import { installCodexSkill } from "./core/skill-installer.mjs";
import { installCodexPet, uninstallCodexPet } from "./core/pet-installer.mjs";
import { formatNumber } from "./lib/time.mjs";
import { listRecentCodexSessions, loadCodexSessions } from "./parsers/codex.mjs";
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
    printHelp(options.locale);
    return;
  }
  if (options.installSkill) {
    const installed = installCodexSkill({ projectDir: PROJECT_DIR });
    if (options.locale === "en") {
      console.log(`AI Work Receipt skill installed: ${installed.targetDir}`);
      console.log("You can now ask Codex: Create an AI work receipt for my latest session.");
      console.log("Restart Codex if the current session does not detect the new skill.");
    } else {
      console.log(`AI 打工小票 Skill 已安装：${installed.targetDir}`);
      console.log("以后可以直接对 Codex 说：给刚刚这次工作开一张 AI 打工小票。");
      console.log("如果当前会话没有识别到新 Skill，请重启 Codex 后再试。");
    }
    return;
  }
  if (options.installPet || options.installCompanion) {
    const installedPet = installCodexPet({ projectDir: PROJECT_DIR });
    const installedSkill = options.installCompanion
      ? installCodexSkill({ projectDir: PROJECT_DIR })
      : null;
    if (options.locale === "en") {
      if (installedSkill) console.log(`AI Work Receipt skill installed: ${installedSkill.targetDir}`);
      console.log(`Codex pet installed: ${installedPet.targetDir}`);
      console.log("Restart Codex, open Settings > Pets, select Refresh, then choose 票仔 · AI 小票工 (Ticket Buddy).");
      console.log("Use /pet to wake it. You can then ask: Ticket Buddy, create a receipt for today.");
    } else {
      if (installedSkill) console.log(`AI 打工小票 Skill 已安装：${installedSkill.targetDir}`);
      console.log(`Codex 桌宠已安装：${installedPet.targetDir}`);
      console.log("请重启 Codex，打开 Settings > Pets，点击 Refresh 后选择“票仔 · AI 小票工”。");
      console.log("输入 /pet 唤醒票仔；以后可以说：票仔，开今天的票。");
    }
    printOpenSourcePrompt("pet", options.locale);
    return;
  }
  if (options.uninstallPet) {
    const removed = uninstallCodexPet();
    if (options.locale === "en") {
      console.log(removed.existed ? `Codex pet removed: ${removed.targetDir}` : "Codex pet was not installed.");
    } else {
      console.log(removed.existed ? `Codex 桌宠已卸载：${removed.targetDir}` : "尚未安装 AI 打工小票桌宠。");
    }
    return;
  }

  if (!options.modeExplicit && process.stdin.isTTY && process.stdout.isTTY) {
    const selected = await promptForRange({
      locale: options.locale,
      timezone: options.timezone,
      loadRecentSessions: () => listRecentCodexSessions(10),
    });
    options.mode = selected.mode;
    options.sessionId = selected.sessionId;
    options.hours = selected.hours || options.hours;
  }

  const range = resolveRange(options.mode, options.timezone, new Date(), options.sessionId, options.hours);
  const sessions = loadCodexSessions(range);
  const metrics = collectMetrics(sessions, range);
  const observedAt = new Date().toISOString();
  const canonical = range.scope === "last-hours"
    ? {}
    : buildCanonicalFacts(sessions, range, { observedAt });
  const record = buildReceiptRecord(metrics, options.theme, options.locale, canonical);
  const qrPayloads = encodeReceiptPayloads(record);
  const dataQrDataUrls = await Promise.all(qrPayloads.map((payload) => QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#171713", light: "#ffffff" },
  })));

  const requestedOutput = options.output || path.join(
    DEFAULT_OUTPUT_DIR,
    `codex-receipt-${outputSlugForRange(range, record.id)}.html`,
  );
  const outputFile = path.resolve(/\.html?$/i.test(requestedOutput) ? requestedOutput : `${requestedOutput}.html`);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const miniProgramCodeDataUrl = imageAsDataUrl(DEFAULT_MINIPROGRAM_CODE);

  fs.writeFileSync(
    outputFile,
    renderHtml({ record, dataQrDataUrls, miniProgramCodeDataUrl }),
    "utf8",
  );
  const persisted = persistReceiptRecord(record, outputFile, options.dataDir);

  if (options.locale === "en") {
    console.log(`Generated HTML: ${outputFile}`);
    console.log(`Structured data: ${persisted.companionPath}`);
    console.log(`Local history: ${persisted.receiptPath}`);
    console.log(`Range: ${getScopeLabel(record.source.scope, options.locale, record.source.hours)} · ${record.stats.session_count} session(s)`);
    console.log(`Stats: ${record.stats.completed_turns} turns · ${formatNumber(record.stats.tokens.total_tokens, options.locale)} Tokens · ${record.stats.tool_calls} tool calls`);
    console.log(record.manifest
      ? `Data QR: ${qrPayloads.length} code(s) · ${record.manifest.fact_count} canonical fact(s) · schema v${record.schema_version}`
      : `Data QR: ${qrPayloads.length} code(s) · rolling summary · schema v${record.schema_version}`);
    if (record.source.scope === "last-hours") {
      console.log(`Note: ${getRollingSummaryNotice(options.locale, record.source.hours)}`);
    }
    if (!miniProgramCodeDataUrl) console.log("Mini-program code: not configured; using the explicit placeholder");
  } else {
    console.log(`已生成网页：${outputFile}`);
    console.log(`结构数据：${persisted.companionPath}`);
    console.log(`本地历史：${persisted.receiptPath}`);
    console.log(`统计范围：${getScopeLabel(record.source.scope, options.locale, record.source.hours)} · ${record.stats.session_count} 个会话`);
    console.log(`统计：${record.stats.completed_turns} 轮 · ${formatNumber(record.stats.tokens.total_tokens, options.locale)} Token · ${record.stats.tool_calls} 次工具调用`);
    console.log(record.manifest
      ? `数据二维码：${qrPayloads.length} 个 · ${record.manifest.fact_count} 条规范事实 · schema v${record.schema_version}`
      : `数据二维码：${qrPayloads.length} 个 · 滚动摘要 · schema v${record.schema_version}`);
    if (record.source.scope === "last-hours") {
      console.log(`提示：${getRollingSummaryNotice(options.locale, record.source.hours)}`);
    }
    if (!miniProgramCodeDataUrl) console.log("小程序码：尚未配置，页面使用明确占位符");
  }
  printOpenSourcePrompt("receipt", options.locale);
  if (options.open) openFile(outputFile);
}

main().catch((error) => {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
});
