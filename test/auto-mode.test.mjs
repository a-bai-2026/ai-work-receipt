import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AUTO_HOOK_MARKER,
  configureManualMode,
  enableAutomaticMode,
  getAutomaticStatus,
  readAutoConfig,
} from "../src/core/auto-mode.mjs";
import { decodeReceiptFile } from "../src/core/file-payload.mjs";
import { runAutomaticReceipt } from "../src/auto-runner.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.dirname(TEST_DIR);

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-auto-"));
  const homeDir = path.join(root, "home");
  const codexHome = path.join(root, "codex-home");
  const dataDir = path.join(root, "receipt-home");
  fs.mkdirSync(path.join(codexHome, "sessions"), { recursive: true });
  fs.mkdirSync(homeDir, { recursive: true });
  return { root, homeDir, codexHome, dataDir };
}

function ownHookCount(document) {
  return (document.hooks?.Stop || []).flatMap((group) => group.hooks || [])
    .filter((handler) => String(handler.command || "").includes(AUTO_HOOK_MARKER))
    .length;
}

function sessionRows(timestamp, turnCount = 1, sessionId = "automatic-session") {
  const rows = [
    { timestamp, type: "session_meta", payload: { id: sessionId } },
    { timestamp, type: "turn_context", payload: { model: "gpt-test" } },
    { timestamp, type: "event_msg", payload: { type: "user_message" } },
  ];
  for (let index = 0; index < turnCount; index += 1) {
    rows.push({
      timestamp,
      type: "event_msg",
      payload: { type: "task_complete", duration_ms: 1_000 },
    });
  }
  rows.push({
    timestamp,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 80 * turnCount,
          cached_input_tokens: 50 * turnCount,
          output_tokens: 20 * turnCount,
          reasoning_output_tokens: 10 * turnCount,
          total_tokens: 100 * turnCount,
        },
      },
    },
  });
  return rows;
}

function writeSession(codexHome, timestamp, turnCount = 1, name = "automatic") {
  const sessionPath = path.join(codexHome, "sessions", `rollout-${name}.jsonl`);
  const rows = sessionRows(timestamp, turnCount, `${name}-session`);
  fs.writeFileSync(sessionPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

test("自动模式安装稳定运行器并安全合并 Codex Stop Hook", () => {
  const current = fixture();
  const hooksPath = path.join(current.codexHome, "hooks.json");
  fs.writeFileSync(hooksPath, `${JSON.stringify({
    description: "existing hooks",
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "existing-stop-hook" }] }],
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "existing-pre-hook" }] }],
    },
  }, null, 2)}\n`, "utf8");

  const first = enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
    timezone: "Asia/Shanghai",
  });
  const second = enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
    timezone: "Asia/Shanghai",
  });
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));

  assert.equal(first.config.mode, "automatic");
  assert.equal(second.config.mode, "automatic");
  assert.equal(ownHookCount(hooks), 1);
  assert.equal(hooks.description, "existing hooks");
  assert.equal(hooks.hooks.Stop[0].hooks[0].command, "existing-stop-hook");
  assert.equal(hooks.hooks.PreToolUse[0].hooks[0].command, "existing-pre-hook");
  assert.equal(fs.existsSync(path.join(current.dataDir, "runtime", "src", "auto-runner.mjs")), true);
  assert.equal(fs.existsSync(path.join(current.dataDir, "runtime", "vendor", "dom-to-image-more.min.js")), true);

  const status = getAutomaticStatus({ homeDir: current.homeDir, dataDir: current.dataDir });
  assert.equal(status.mode, "automatic");
  assert.equal(status.hookInstalled, true);
  assert.equal(status.runtimeInstalled, true);
});

test("切换为仅手动只移除自己的 Hook 并保留历史与其他 Hook", () => {
  const current = fixture();
  const hooksPath = path.join(current.codexHome, "hooks.json");
  enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
  });
  const historyPath = path.join(current.dataDir, "history.jsonl");
  fs.writeFileSync(historyPath, "kept\n", "utf8");
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  hooks.hooks.Stop.unshift({ hooks: [{ type: "command", command: "keep-me" }] });
  fs.writeFileSync(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, "utf8");

  const result = configureManualMode({
    homeDir: current.homeDir,
    dataDir: current.dataDir,
  });
  const updatedHooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));

  assert.equal(result.config.mode, "manual");
  assert.equal(result.removedHook.removed, true);
  assert.equal(ownHookCount(updatedHooks), 0);
  assert.equal(updatedHooks.hooks.Stop[0].hooks[0].command, "keep-me");
  assert.equal(fs.readFileSync(historyPath, "utf8"), "kept\n");
  assert.equal(readAutoConfig({ workReceiptHome: current.dataDir }).mode, "manual");
});

test("自动运行静默刷新同一天的 HTML、JSON 与微信导入文件", async () => {
  const current = fixture();
  const now = new Date("2026-07-22T12:00:00.000Z");
  writeSession(current.codexHome, now.toISOString(), 1);
  enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
    timezone: "Asia/Shanghai",
  });

  const first = await runAutomaticReceipt({ workReceiptHome: current.dataDir, now });
  assert.equal(first.status, "ok");
  assert.equal(fs.existsSync(first.output_file), true);
  assert.equal(fs.existsSync(first.structured_file), true);
  assert.equal(fs.existsSync(first.import_file), true);
  assert.equal(decodeReceiptFile(fs.readFileSync(first.import_file, "utf8")).s[1], 1);
  const firstHtml = fs.readFileSync(first.output_file, "utf8");
  assert.match(firstHtml, /下载微信导入文件/);
  assert.doesNotMatch(firstHtml, /也可以扫码导入/);

  writeSession(current.codexHome, now.toISOString(), 2);
  const second = await runAutomaticReceipt({ workReceiptHome: current.dataDir, now });
  assert.equal(second.status, "ok");
  assert.equal(second.output_file, first.output_file);
  assert.equal(second.receipt_id, first.receipt_id);
  assert.notEqual(second.snapshot_hash, first.snapshot_hash);
  assert.equal(decodeReceiptFile(fs.readFileSync(second.import_file, "utf8")).s[1], 2);
});

test("午夜边界的相邻 Stop 触发会分别刷新两个自然日", async () => {
  const current = fixture();
  const beforeMidnight = new Date("2026-07-22T15:59:59.000Z");
  const afterMidnight = new Date("2026-07-22T16:00:00.100Z");
  writeSession(current.codexHome, beforeMidnight.toISOString(), 1, "day-one");
  writeSession(current.codexHome, afterMidnight.toISOString(), 1, "day-two");
  enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
    timezone: "Asia/Shanghai",
  });

  const firstRun = runAutomaticReceipt({ workReceiptHome: current.dataDir, now: beforeMidnight });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const secondRun = runAutomaticReceipt({ workReceiptHome: current.dataDir, now: afterMidnight });
  await Promise.all([firstRun, secondRun]);

  assert.equal(fs.existsSync(path.join(
    current.dataDir,
    "auto",
    "2026-07-22",
    "codex-receipt-today-2026-07-22.cwr.json",
  )), true);
  assert.equal(fs.existsSync(path.join(
    current.dataDir,
    "auto",
    "2026-07-23",
    "codex-receipt-today-2026-07-23.cwr.json",
  )), true);
});

test("无效的现有 hooks.json 会阻止安装而不是覆盖用户配置", () => {
  const current = fixture();
  const hooksPath = path.join(current.codexHome, "hooks.json");
  fs.writeFileSync(hooksPath, "not-json\n", "utf8");

  assert.throws(() => enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
  }), /无法解析现有 Codex Hooks 配置/);
  assert.equal(fs.readFileSync(hooksPath, "utf8"), "not-json\n");
});

test("配置缺失时切换仅手动仍会清理当前 CODEX_HOME 中自己的 Hook", () => {
  const current = fixture();
  const hooksPath = path.join(current.codexHome, "hooks.json");
  fs.writeFileSync(hooksPath, `${JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{
        type: "command",
        command: `node hook.mjs --marker ${AUTO_HOOK_MARKER}`,
      }] }],
    },
  }, null, 2)}\n`, "utf8");

  const result = configureManualMode({
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
  });
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));

  assert.equal(result.removedHook.removed, true);
  assert.equal(ownHookCount(hooks), 0);
});

test("结构不合法的 Hooks 配置不会被自动修正或覆盖", () => {
  const current = fixture();
  const hooksPath = path.join(current.codexHome, "hooks.json");
  const invalidStructure = '{"hooks":{"Stop":{"hooks":[]}}}\n';
  fs.writeFileSync(hooksPath, invalidStructure, "utf8");

  assert.throws(() => enableAutomaticMode({
    projectDir: PROJECT_DIR,
    homeDir: current.homeDir,
    codexHome: current.codexHome,
    dataDir: current.dataDir,
  }), /Stop 必须是数组/);
  assert.equal(fs.readFileSync(hooksPath, "utf8"), invalidStructure);
});
