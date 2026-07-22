import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { decodeReceiptFile } from "../src/core/file-payload.mjs";
import {
  getHtmlStarPrompt,
  getOpenSourcePrompt,
  OPEN_SOURCE_REPOSITORY_URL,
  printOpenSourcePrompt,
} from "../src/core/open-source.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.dirname(TEST_DIR);
const CLI_PATH = path.join(PROJECT_DIR, "src", "cli.mjs");

function countOccurrences(source, target) {
  return source.split(target).length - 1;
}

function createCliEnvironment() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-cli-"));
  const homeDir = path.join(tempDir, "home");
  const codexHome = path.join(tempDir, "codex-home");
  const sessionsDir = path.join(codexHome, "sessions");
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });
  return {
    tempDir,
    homeDir,
    codexHome,
    environment: {
      ...process.env,
      HOME: homeDir,
      CODEX_HOME: codexHome,
    },
  };
}

function writeSession(codexHome) {
  const timestamp = new Date().toISOString();
  const sessionPath = path.join(codexHome, "sessions", "rollout-star-prompt.jsonl");
  const rows = [
    { timestamp, type: "session_meta", payload: { id: "star-prompt-session" } },
    { timestamp, type: "turn_context", payload: { model: "gpt-test" } },
    { timestamp, type: "event_msg", payload: { type: "user_message" } },
    { timestamp, type: "event_msg", payload: { type: "task_complete", duration_ms: 1_000 } },
    {
      timestamp,
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 80,
            cached_input_tokens: 50,
            output_tokens: 20,
            reasoning_output_tokens: 10,
            total_tokens: 100,
          },
        },
      },
    },
  ];
  fs.writeFileSync(sessionPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function writeManySessions(codexHome, count) {
  const timestamp = new Date().toISOString();
  for (let index = 0; index < count; index += 1) {
    const sessionPath = path.join(codexHome, "sessions", `rollout-file-import-${index}.jsonl`);
    const rows = [
      { timestamp, type: "session_meta", payload: { id: `file-import-session-${index}` } },
      { timestamp, type: "turn_context", payload: { model: "gpt-test" } },
      { timestamp, type: "event_msg", payload: { type: "user_message" } },
      { timestamp, type: "event_msg", payload: { type: "task_complete", duration_ms: 1_000 } },
      {
        timestamp,
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 80 + index,
              cached_input_tokens: 50,
              output_tokens: 20,
              reasoning_output_tokens: 10,
              total_tokens: 100 + index,
            },
          },
        },
      },
    ];
    fs.writeFileSync(sessionPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  }
}

test("开源引导为小票和票仔提供独立的中英文文案", () => {
  const receiptZh = getOpenSourcePrompt("receipt", "zh-CN");
  const petZh = getOpenSourcePrompt("pet", "zh-CN");
  const receiptEn = getOpenSourcePrompt("receipt", "en");
  const petEn = getOpenSourcePrompt("pet", "en");

  assert.equal(receiptZh.url, OPEN_SOURCE_REPOSITORY_URL);
  assert.match(receiptZh.message, /AI 小票工具/);
  assert.match(petZh.message, /喜欢票仔/);
  assert.match(receiptEn.message, /AI Work Receipt/);
  assert.match(petEn.message, /Ticket Buddy/);

  const lines = [];
  printOpenSourcePrompt("receipt", "zh-CN", (line) => lines.push(line));
  assert.deepEqual(lines, [
    "",
    `开源项目：${OPEN_SOURCE_REPOSITORY_URL}`,
    "如果你也喜欢这个 AI 小票工具，欢迎来 GitHub 给我点个 Star ⭐",
  ]);
});

test("HTML 小票提供简短的中英文 Star 引导", () => {
  assert.deepEqual(getHtmlStarPrompt("zh-CN"), {
    url: OPEN_SOURCE_REPOSITORY_URL,
    label: "喜欢这个工具？点个 Star ⭐",
  });
  assert.deepEqual(getHtmlStarPrompt("en"), {
    url: OPEN_SOURCE_REPOSITORY_URL,
    label: "Enjoying it? Star on GitHub ⭐",
  });
});

test("小票生成成功后只输出一次项目地址和 Star 引导", () => {
  const fixture = createCliEnvironment();
  writeSession(fixture.codexHome);
  const output = execFileSync(process.execPath, [
    CLI_PATH,
    "--latest",
    "--no-open",
    "--output",
    path.join(fixture.tempDir, "receipt.html"),
    "--data-dir",
    path.join(fixture.tempDir, "data"),
  ], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });

  assert.equal(countOccurrences(output, OPEN_SOURCE_REPOSITORY_URL), 1);
  assert.match(output, /如果你也喜欢这个 AI 小票工具/);
  assert.match(output, /微信导入文件：.*receipt\.cwr\.json/);
  const transferPath = path.join(fixture.tempDir, "receipt.cwr.json");
  assert.equal(fs.existsSync(transferPath), true);
  assert.equal(decodeReceiptFile(fs.readFileSync(transferPath, "utf8")).v, 2);
  assert.match(fs.readFileSync(path.join(fixture.tempDir, "receipt.html"), "utf8"), /下载微信导入文件/);
});

test("自动与手动模式配置成功后各输出一次小票 Star 引导", () => {
  const automaticFixture = createCliEnvironment();
  const automaticOutput = execFileSync(process.execPath, [
    CLI_PATH,
    "--enable-auto",
    "--lang",
    "en",
    "--data-dir",
    path.join(automaticFixture.tempDir, "data"),
  ], {
    cwd: automaticFixture.tempDir,
    env: automaticFixture.environment,
    encoding: "utf8",
  });
  assert.equal(countOccurrences(automaticOutput, OPEN_SOURCE_REPOSITORY_URL), 1);
  assert.match(automaticOutput, /If you enjoy AI Work Receipt/);

  const manualFixture = createCliEnvironment();
  const manualOutput = execFileSync(process.execPath, [
    CLI_PATH,
    "--disable-auto",
    "--data-dir",
    path.join(manualFixture.tempDir, "data"),
  ], {
    cwd: manualFixture.tempDir,
    env: manualFixture.environment,
    encoding: "utf8",
  });
  assert.equal(countOccurrences(manualOutput, OPEN_SOURCE_REPOSITORY_URL), 1);
  assert.match(manualOutput, /如果你也喜欢这个 AI 小票工具/);
});

test("超过单个二维码容量时 CLI 仍完整输出文件导入流程", () => {
  const fixture = createCliEnvironment();
  writeManySessions(fixture.codexHome, 80);
  const outputPath = path.join(fixture.tempDir, "oversized.html");
  const output = execFileSync(process.execPath, [
    CLI_PATH,
    "--today",
    "--no-open",
    "--output",
    outputPath,
    "--data-dir",
    path.join(fixture.tempDir, "data"),
  ], {
    cwd: fixture.tempDir,
    env: {
      ...fixture.environment,
      CODEX_WORK_RECEIPT_FULL_SCAN: "1",
    },
    encoding: "utf8",
  });

  const transferPath = path.join(fixture.tempDir, "oversized.cwr.json");
  const companionPath = path.join(fixture.tempDir, "oversized.json");
  const html = fs.readFileSync(outputPath, "utf8");
  const payload = decodeReceiptFile(fs.readFileSync(transferPath, "utf8"));

  assert.equal(fs.existsSync(outputPath), true);
  assert.equal(fs.existsSync(companionPath), true);
  assert.equal(payload.f.length, 80);
  assert.match(output, /数据超过单码容量，已改用微信聊天文件导入/);
  assert.match(html, /下载微信导入文件/);
  assert.doesNotMatch(html, /data-data-qr-panel hidden/);
  assert.doesNotMatch(html, /也可以扫码导入/);
});

test("单独安装票仔和安装 Companion 都只输出一次票仔 Star 引导", () => {
  const petFixture = createCliEnvironment();
  const petOutput = execFileSync(process.execPath, [CLI_PATH, "--install-pet"], {
    cwd: petFixture.tempDir,
    env: petFixture.environment,
    encoding: "utf8",
  });
  assert.equal(countOccurrences(petOutput, OPEN_SOURCE_REPOSITORY_URL), 1);
  assert.match(petOutput, /如果你也喜欢票仔/);

  const companionFixture = createCliEnvironment();
  const companionOutput = execFileSync(process.execPath, [
    CLI_PATH,
    "--install-companion",
    "--lang",
    "en",
  ], {
    cwd: companionFixture.tempDir,
    env: companionFixture.environment,
    encoding: "utf8",
  });
  assert.equal(countOccurrences(companionOutput, OPEN_SOURCE_REPOSITORY_URL), 1);
  assert.match(companionOutput, /If you enjoy Ticket Buddy/);
});

test("帮助、状态、卸载和失败输出不会展示 Star 引导", () => {
  const fixture = createCliEnvironment();
  const helpOutput = execFileSync(process.execPath, [CLI_PATH, "--help"], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });
  const uninstallOutput = execFileSync(process.execPath, [CLI_PATH, "--uninstall-pet"], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });
  const statusOutput = execFileSync(process.execPath, [
    CLI_PATH,
    "--auto-status",
    "--data-dir",
    path.join(fixture.tempDir, "data"),
  ], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });
  const failed = spawnSync(process.execPath, [CLI_PATH, "--unknown-option"], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });

  assert.doesNotMatch(helpOutput, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
  assert.doesNotMatch(statusOutput, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
  assert.doesNotMatch(uninstallOutput, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
  assert.notEqual(failed.status, 0);
  assert.doesNotMatch(`${failed.stdout}${failed.stderr}`, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
});
