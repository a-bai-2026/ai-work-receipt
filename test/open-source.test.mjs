import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
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

test("帮助、卸载和失败输出不会展示 Star 引导", () => {
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
  const failed = spawnSync(process.execPath, [CLI_PATH, "--unknown-option"], {
    cwd: fixture.tempDir,
    env: fixture.environment,
    encoding: "utf8",
  });

  assert.doesNotMatch(helpOutput, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
  assert.doesNotMatch(uninstallOutput, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
  assert.notEqual(failed.status, 0);
  assert.doesNotMatch(`${failed.stdout}${failed.stderr}`, new RegExp(OPEN_SOURCE_REPOSITORY_URL));
});
