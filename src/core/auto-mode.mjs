import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { dateKey } from "../lib/time.mjs";
import { writeJsonAtomicSync } from "../lib/files.mjs";

const require = createRequire(import.meta.url);

export const AUTO_HOOK_MARKER = "codex-work-receipt-auto-hook-v1";
export const AUTO_CONFIG_VERSION = 1;

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function timestampSlug(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, "-");
}

export function getWorkReceiptHome({ homeDir = os.homedir(), dataDir = null } = {}) {
  return path.resolve(
    dataDir || process.env.CODEX_WORK_RECEIPT_HOME || path.join(homeDir, ".codex-work-receipt"),
  );
}

export function getAutoPaths({ workReceiptHome }) {
  const root = path.resolve(workReceiptHome);
  return {
    root,
    configPath: path.join(root, "config.json"),
    statePath: path.join(root, "auto-state.json"),
    runtimeDir: path.join(root, "runtime"),
    autoOutputDir: path.join(root, "auto"),
    logDir: path.join(root, "logs"),
  };
}

export function readAutoConfig({ workReceiptHome }) {
  const { configPath } = getAutoPaths({ workReceiptHome });
  if (!fs.existsSync(configPath)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

export function readAutoState({ workReceiptHome }) {
  const { statePath } = getAutoPaths({ workReceiptHome });
  if (!fs.existsSync(statePath)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeAutoState({ workReceiptHome }, value) {
  const { statePath } = getAutoPaths({ workReceiptHome });
  writeJsonAtomicSync(statePath, value);
}

function packageVersion(projectDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
}

function installRuntime({ projectDir, workReceiptHome, nodePath }) {
  const { runtimeDir } = getAutoPaths({ workReceiptHome });
  const stagingDir = path.join(
    path.dirname(runtimeDir),
    `.runtime.install-${process.pid}-${Date.now()}`,
  );
  const domToImageSource = require.resolve("dom-to-image-more");

  fs.mkdirSync(stagingDir, { recursive: true });
  try {
    fs.cpSync(path.join(projectDir, "src"), path.join(stagingDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(stagingDir, "assets"), { recursive: true });
    fs.copyFileSync(
      path.join(projectDir, "assets", "miniprogram-code.png"),
      path.join(stagingDir, "assets", "miniprogram-code.png"),
    );
    fs.copyFileSync(path.join(projectDir, "package.json"), path.join(stagingDir, "package.json"));
    fs.mkdirSync(path.join(stagingDir, "vendor"), { recursive: true });
    fs.copyFileSync(domToImageSource, path.join(stagingDir, "vendor", "dom-to-image-more.min.js"));
    writeJsonAtomicSync(path.join(stagingDir, "runtime.json"), {
      version: 1,
      package_version: packageVersion(projectDir),
      node_path: nodePath,
      installed_at: new Date().toISOString(),
    });

    fs.rmSync(runtimeDir, { recursive: true, force: true });
    fs.renameSync(stagingDir, runtimeDir);
  } catch (error) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }

  return {
    runtimeDir,
    runtimeVersion: packageVersion(projectDir),
    hookEntry: path.join(runtimeDir, "src", "auto-hook.mjs"),
    runnerEntry: path.join(runtimeDir, "src", "auto-runner.mjs"),
  };
}

function posixQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function windowsQuote(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function hookHandler({ nodePath, hookEntry, workReceiptHome }) {
  const args = [hookEntry, "--work-receipt-home", workReceiptHome, "--marker", AUTO_HOOK_MARKER];
  return {
    type: "command",
    command: [nodePath, ...args].map(posixQuote).join(" "),
    commandWindows: [nodePath, ...args].map(windowsQuote).join(" "),
    timeout: 5,
  };
}

function isOwnHook(handler) {
  return isObject(handler) && (
    String(handler.command || "").includes(AUTO_HOOK_MARKER) ||
    String(handler.commandWindows || handler.command_windows || "").includes(AUTO_HOOK_MARKER)
  );
}

function removeOwnHooks(document) {
  if (!isObject(document?.hooks) || !Array.isArray(document.hooks.Stop)) return false;
  let changed = false;
  const nextGroups = [];
  for (const group of document.hooks.Stop) {
    if (!isObject(group) || !Array.isArray(group.hooks)) {
      nextGroups.push(group);
      continue;
    }
    const nextHandlers = group.hooks.filter((handler) => {
      const own = isOwnHook(handler);
      if (own) changed = true;
      return !own;
    });
    if (nextHandlers.length || !group.hooks.some(isOwnHook)) {
      nextGroups.push({ ...group, hooks: nextHandlers });
    }
  }
  if (changed) document.hooks.Stop = nextGroups;
  return changed;
}

function readHooksDocument(hooksPath) {
  if (!fs.existsSync(hooksPath)) return {};
  let document;
  try {
    document = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  } catch (error) {
    throw new Error(`无法解析现有 Codex Hooks 配置：${hooksPath}：${error.message}`);
  }
  if (!isObject(document)) throw new Error(`Codex Hooks 配置必须是 JSON 对象：${hooksPath}`);
  return document;
}

function persistHooksDocument(hooksPath, document, { createBackup = true } = {}) {
  let backupPath = null;
  if (createBackup && fs.existsSync(hooksPath)) {
    backupPath = `${hooksPath}.codex-work-receipt-${timestampSlug()}.bak`;
    fs.copyFileSync(hooksPath, backupPath);
  }
  writeJsonAtomicSync(hooksPath, document);
  return backupPath;
}

function installHook({ hooksPath, handler }) {
  const document = readHooksDocument(hooksPath);
  removeOwnHooks(document);
  if (document.hooks !== undefined && !isObject(document.hooks)) {
    throw new Error(`Codex Hooks 配置中的 hooks 必须是 JSON 对象：${hooksPath}`);
  }
  if (!document.hooks) document.hooks = {};
  if (document.hooks.Stop !== undefined && !Array.isArray(document.hooks.Stop)) {
    throw new Error(`Codex Hooks 配置中的 Stop 必须是数组：${hooksPath}`);
  }
  if (!document.hooks.Stop) document.hooks.Stop = [];
  document.hooks.Stop.push({ hooks: [handler] });
  const backupPath = persistHooksDocument(hooksPath, document, {
    createBackup: fs.existsSync(hooksPath),
  });
  return { hooksPath, backupPath };
}

export function removeAutomaticHook({ hooksPath }) {
  if (!hooksPath || !fs.existsSync(hooksPath)) return { hooksPath, removed: false, backupPath: null };
  const document = readHooksDocument(hooksPath);
  const removed = removeOwnHooks(document);
  if (!removed) return { hooksPath, removed: false, backupPath: null };
  const backupPath = persistHooksDocument(hooksPath, document);
  return { hooksPath, removed: true, backupPath };
}

function hookIsInstalled(hooksPath) {
  if (!hooksPath || !fs.existsSync(hooksPath)) return false;
  try {
    const document = readHooksDocument(hooksPath);
    return Array.isArray(document.hooks?.Stop) && document.hooks.Stop.some(
      (group) => Array.isArray(group?.hooks) && group.hooks.some(isOwnHook),
    );
  } catch {
    return false;
  }
}

function codexHomePath({ homeDir, codexHome }) {
  return path.resolve(codexHome || process.env.CODEX_HOME || path.join(homeDir, ".codex"));
}

export function enableAutomaticMode({
  projectDir,
  homeDir = os.homedir(),
  codexHome = null,
  dataDir = null,
  locale = "zh-CN",
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
  theme = "classic",
  nodePath = process.execPath,
} = {}) {
  if (!projectDir) throw new Error("启用自动保存时缺少项目目录");
  const workReceiptHome = getWorkReceiptHome({ homeDir, dataDir });
  const paths = getAutoPaths({ workReceiptHome });
  const previous = readAutoConfig({ workReceiptHome });
  const resolvedCodexHome = codexHomePath({ homeDir, codexHome });
  const hooksPath = path.join(resolvedCodexHome, "hooks.json");

  if (previous?.hook?.hooks_path && path.resolve(previous.hook.hooks_path) !== hooksPath) {
    removeAutomaticHook({ hooksPath: previous.hook.hooks_path });
  }

  const runtime = installRuntime({ projectDir, workReceiptHome, nodePath });
  const installedHook = installHook({
    hooksPath,
    handler: hookHandler({
      nodePath,
      hookEntry: runtime.hookEntry,
      workReceiptHome,
    }),
  });
  const config = {
    config_version: AUTO_CONFIG_VERSION,
    mode: "automatic",
    preferences: { locale, timezone, theme },
    work_receipt_home: workReceiptHome,
    runtime: {
      package_version: runtime.runtimeVersion,
      node_path: nodePath,
      runner_entry: runtime.runnerEntry,
    },
    hook: {
      marker: AUTO_HOOK_MARKER,
      codex_home: resolvedCodexHome,
      hooks_path: hooksPath,
    },
    updated_at: new Date().toISOString(),
  };
  writeJsonAtomicSync(paths.configPath, config);
  return { config, paths, installedHook };
}

export function configureManualMode({
  homeDir = os.homedir(),
  codexHome = null,
  dataDir = null,
  locale = "zh-CN",
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
  theme = "classic",
} = {}) {
  const workReceiptHome = getWorkReceiptHome({ homeDir, dataDir });
  const paths = getAutoPaths({ workReceiptHome });
  const previous = readAutoConfig({ workReceiptHome });
  const currentHooksPath = path.join(codexHomePath({ homeDir, codexHome }), "hooks.json");
  const hookTargets = new Set([previous?.hook?.hooks_path, currentHooksPath].filter(Boolean));
  const removedHooks = [...hookTargets].map((hooksPath) => removeAutomaticHook({ hooksPath }));
  const removedHook = removedHooks.find((item) => item.removed) || removedHooks[0] || {
    hooksPath: currentHooksPath,
    removed: false,
    backupPath: null,
  };
  const config = {
    config_version: AUTO_CONFIG_VERSION,
    mode: "manual",
    preferences: { locale, timezone, theme },
    work_receipt_home: workReceiptHome,
    runtime: previous?.runtime || null,
    hook: null,
    updated_at: new Date().toISOString(),
  };
  writeJsonAtomicSync(paths.configPath, config);
  return { config, paths, removedHook };
}

export function automaticOutputPath(config, now = new Date()) {
  const workReceiptHome = config.work_receipt_home;
  const timezone = config.preferences?.timezone || "Asia/Shanghai";
  const day = dateKey(now, timezone);
  return path.join(
    getAutoPaths({ workReceiptHome }).autoOutputDir,
    day,
    `codex-receipt-today-${day}.html`,
  );
}

export function startAutomaticRun(config) {
  const nodePath = config?.runtime?.node_path;
  const runnerEntry = config?.runtime?.runner_entry;
  if (!nodePath || !runnerEntry || !fs.existsSync(runnerEntry)) return false;
  const child = spawn(nodePath, [
    runnerEntry,
    "--work-receipt-home",
    config.work_receipt_home,
    "--triggered-at",
    new Date().toISOString(),
  ], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return true;
}

export function getAutomaticStatus({
  homeDir = os.homedir(),
  codexHome = null,
  dataDir = null,
} = {}) {
  const workReceiptHome = getWorkReceiptHome({ homeDir, dataDir });
  const config = readAutoConfig({ workReceiptHome });
  const state = readAutoState({ workReceiptHome });
  const hooksPath = config?.hook?.hooks_path || path.join(codexHomePath({ homeDir, codexHome }), "hooks.json");
  return {
    workReceiptHome,
    config,
    state,
    mode: config?.mode || "unconfigured",
    hookInstalled: hookIsInstalled(hooksPath),
    runtimeInstalled: Boolean(
      config?.runtime?.runner_entry &&
      config?.runtime?.node_path &&
      fs.existsSync(config.runtime.runner_entry) &&
      fs.existsSync(config.runtime.node_path)
    ),
    outputFile: config?.mode === "automatic" ? automaticOutputPath(config) : state?.output_file || null,
  };
}
