#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

import { parseArgs, printHelp } from "./core/args.mjs";
import {
  automaticOutputPath,
  configureManualMode,
  enableAutomaticMode,
  getAutomaticStatus,
  getWorkReceiptHome,
  readAutoConfig,
  startAutomaticRun,
} from "./core/auto-mode.mjs";
import { generateReceipt } from "./core/generator.mjs";
import { promptForGenerationMode } from "./core/mode-selector.mjs";
import { printOpenSourcePrompt } from "./core/open-source.mjs";
import { getRollingSummaryNotice, getScopeLabel } from "./core/presentation.mjs";
import { encodeSingleReceiptQr } from "./core/qr-payload.mjs";
import { promptForRange } from "./core/selector.mjs";
import { installCodexSkill } from "./core/skill-installer.mjs";
import { installCodexPet, uninstallCodexPet } from "./core/pet-installer.mjs";
import { formatNumber } from "./lib/time.mjs";
import { listRecentCodexSessions } from "./parsers/codex.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.dirname(SCRIPT_DIR);
function openFile(filePath) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function printAutomaticEnabled(result, locale) {
  const outputFile = automaticOutputPath(result.config);
  const importFile = outputFile.replace(/\.html?$/i, ".cwr.json");
  if (locale === "en") {
    console.log("Automatic saving enabled.");
    console.log("Codex will quietly refresh today's receipt and WeChat import file whenever a turn stops.");
    console.log(`Automatic receipt: ${outputFile}`);
    console.log(`WeChat import file: ${importFile}`);
    console.log("Restart Codex. If Codex asks you to review the new hook, open /hooks and trust AI Work Receipt.");
  } else {
    console.log("自动保存已启用。");
    console.log("Codex 每完成一轮工作，都会静默刷新今天的小票和微信导入文件。");
    console.log(`自动小票：${outputFile}`);
    console.log(`微信导入文件：${importFile}`);
    console.log("请重启 Codex；如果 Codex 提示审查新 Hook，请打开 /hooks 并信任 AI 打工小票。");
  }
}

function printManualEnabled(result, locale) {
  if (locale === "en") {
    console.log("Manual-only mode enabled. No AI Work Receipt hook will run in the background.");
    if (result.removedHook?.removed) console.log("The AI Work Receipt hook was removed; existing receipts were kept.");
  } else {
    console.log("已切换为仅手动模式，AI 打工小票不会在后台自动运行。");
    if (result.removedHook?.removed) console.log("已移除 AI 打工小票 Hook，历史小票仍然保留。");
  }
}

function enableAuto(options) {
  const result = enableAutomaticMode({
    projectDir: PROJECT_DIR,
    dataDir: options.dataDir,
    locale: options.locale,
    timezone: options.timezone,
    theme: options.theme,
  });
  startAutomaticRun(result.config);
  printAutomaticEnabled(result, options.locale);
  printOpenSourcePrompt("receipt", options.locale);
  return result;
}

function enableManual(options, { showOpenSourcePrompt = true } = {}) {
  const result = configureManualMode({
    dataDir: options.dataDir,
    locale: options.locale,
    timezone: options.timezone,
    theme: options.theme,
  });
  printManualEnabled(result, options.locale);
  if (showOpenSourcePrompt) printOpenSourcePrompt("receipt", options.locale);
  return result;
}

function printAutoStatus(options) {
  const status = getAutomaticStatus({ dataDir: options.dataDir });
  if (options.locale === "en") {
    console.log(`Mode: ${status.mode}`);
    console.log(`Local data: ${status.workReceiptHome}`);
    console.log(`Runtime: ${status.runtimeInstalled ? "installed" : "not installed"}`);
    console.log(`Codex hook: ${status.hookInstalled ? "installed" : "not installed"}`);
    if (status.state?.last_success_at) console.log(`Last automatic receipt: ${status.state.last_success_at}`);
    if (status.state?.import_file) console.log(`WeChat import file: ${status.state.import_file}`);
    if (status.state?.error) console.log(`Last message: ${status.state.error}`);
  } else {
    const modeLabel = status.mode === "automatic" ? "自动保存" : status.mode === "manual" ? "仅手动" : "尚未设置";
    console.log(`模式：${modeLabel}`);
    console.log(`本地数据：${status.workReceiptHome}`);
    console.log(`本地执行器：${status.runtimeInstalled ? "已安装" : "未安装"}`);
    console.log(`Codex Hook：${status.hookInstalled ? "已安装" : "未安装"}`);
    if (status.state?.last_success_at) console.log(`最近自动生成：${status.state.last_success_at}`);
    if (status.state?.import_file) console.log(`微信导入文件：${status.state.import_file}`);
    if (status.state?.error) console.log(`最近状态：${status.state.error}`);
  }
}

async function runSetup(options) {
  if (!isInteractive()) throw new Error("--setup 需要在交互式终端中运行；也可以使用 --enable-auto 或 --disable-auto");
  const selected = await promptForGenerationMode({ locale: options.locale });
  return selected === "automatic" ? enableAuto(options) : enableManual(options);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp(options.locale);
    return;
  }
  if (options.setup) {
    await runSetup(options);
    return;
  }
  if (options.enableAuto) {
    enableAuto(options);
    return;
  }
  if (options.disableAuto) {
    enableManual(options);
    return;
  }
  if (options.autoStatus) {
    printAutoStatus(options);
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

  if (!options.modeExplicit && isInteractive()) {
    const workReceiptHome = getWorkReceiptHome({ dataDir: options.dataDir });
    if (!readAutoConfig({ workReceiptHome })) {
      const selectedMode = await promptForGenerationMode({ locale: options.locale });
      if (selectedMode === "automatic") {
        enableAuto(options);
        return;
      }
      enableManual(options, { showOpenSourcePrompt: false });
    }
    const selected = await promptForRange({
      locale: options.locale,
      timezone: options.timezone,
      loadRecentSessions: () => listRecentCodexSessions(10),
    });
    options.mode = selected.mode;
    options.sessionId = selected.sessionId;
    options.hours = selected.hours || options.hours;
  }

  const generated = await generateReceipt(options, {
    projectDir: PROJECT_DIR,
    createDataQr: async (record) => {
      const dataQr = encodeSingleReceiptQr(record);
      if (!dataQr) return null;
      return {
        version: dataQr.version,
        dataUrl: await QRCode.toDataURL(dataQr.payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 360,
          color: { dark: "#171713", light: "#ffffff" },
        }),
      };
    },
  });
  const {
    record,
    outputFile,
    persisted,
    dataQrDataUrl,
    dataQrVersion,
    miniProgramCodeDataUrl,
  } = generated;

  if (options.locale === "en") {
    console.log(`Generated HTML: ${outputFile}`);
    console.log(`Structured data: ${persisted.companionPath}`);
    console.log(`WeChat import file: ${persisted.transferPath}`);
    console.log(`Local history: ${persisted.receiptPath}`);
    console.log(`Range: ${getScopeLabel(record.source.scope, options.locale, record.source.hours)} · ${record.stats.session_count} session(s)`);
    console.log(`Stats: ${record.stats.completed_turns} turns · ${formatNumber(record.stats.tokens.total_tokens, options.locale)} Tokens · ${record.stats.tool_calls} tool calls`);
    console.log(dataQrDataUrl
      ? `Data QR: available as one code · QR version ${dataQrVersion}`
      : "Data QR: not generated because the payload exceeds one code; use the WeChat import file");
    console.log(record.manifest
      ? `Import data: ${record.manifest.fact_count} canonical fact(s) · schema v${record.schema_version}`
      : `Import data: rolling summary · schema v${record.schema_version}`);
    if (record.source.scope === "last-hours") {
      console.log(`Note: ${getRollingSummaryNotice(options.locale, record.source.hours)}`);
    }
    if (!miniProgramCodeDataUrl) console.log("Mini-program code: not configured; using the explicit placeholder");
  } else {
    console.log(`已生成网页：${outputFile}`);
    console.log(`结构数据：${persisted.companionPath}`);
    console.log(`微信导入文件：${persisted.transferPath}`);
    console.log(`本地历史：${persisted.receiptPath}`);
    console.log(`统计范围：${getScopeLabel(record.source.scope, options.locale, record.source.hours)} · ${record.stats.session_count} 个会话`);
    console.log(`统计：${record.stats.completed_turns} 轮 · ${formatNumber(record.stats.tokens.total_tokens, options.locale)} Token · ${record.stats.tool_calls} 次工具调用`);
    console.log(dataQrDataUrl
      ? `数据二维码：可用 · 单码 · QR version ${dataQrVersion}`
      : "数据二维码：数据超过单码容量，已改用微信聊天文件导入");
    console.log(record.manifest
      ? `导入数据：${record.manifest.fact_count} 条规范事实 · schema v${record.schema_version}`
      : `导入数据：滚动摘要 · schema v${record.schema_version}`);
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
