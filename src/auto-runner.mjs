#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  automaticOutputPath,
  readAutoConfig,
  readAutoState,
  writeAutoState,
} from "./core/auto-mode.mjs";
import { dateKey } from "./lib/time.mjs";

const LOCK_STALE_MS = 10 * 60 * 1000;

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function emptyActivityError(error) {
  return /没有找到|No Codex sessions found/.test(String(error?.message || ""));
}

function pendingTime(pendingPath, fallback = new Date()) {
  try {
    const value = new Date(fs.readFileSync(pendingPath, "utf8").trim());
    return Number.isNaN(value.getTime()) ? fallback : value;
  } catch {
    return fallback;
  }
}

function crossesConfiguredDay(workReceiptHome, left, right) {
  const config = readAutoConfig({ workReceiptHome });
  const timezone = config?.preferences?.timezone || "Asia/Shanghai";
  return dateKey(left, timezone) !== dateKey(right, timezone);
}

function acquireLock(lockPath, pendingPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const descriptor = fs.openSync(lockPath, "wx");
    fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })}\n`);
    fs.closeSync(descriptor);
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    try {
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (age > LOCK_STALE_MS) {
        fs.rmSync(lockPath, { force: true });
        return acquireLock(lockPath, pendingPath);
      }
    } catch {
      // Another worker may have released the lock between checks.
    }
    fs.writeFileSync(pendingPath, `${new Date().toISOString()}\n`, "utf8");
    return false;
  }
}

async function generateOnce({ workReceiptHome, now = new Date() }) {
  const config = readAutoConfig({ workReceiptHome });
  if (!config || config.mode !== "automatic") return { status: "disabled" };

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectDir = path.dirname(scriptDir);
  const vendorScript = path.join(projectDir, "vendor", "dom-to-image-more.min.js");
  if (fs.existsSync(vendorScript)) process.env.CODEX_WORK_RECEIPT_DOM_TO_IMAGE = vendorScript;
  process.env.CODEX_WORK_RECEIPT_HOME = workReceiptHome;

  const previousState = readAutoState({ workReceiptHome }) || {};
  const attemptedAt = new Date().toISOString();
  try {
    const { generateReceipt } = await import("./core/generator.mjs");
    const outputFile = automaticOutputPath(config, now);
    const generated = await generateReceipt({
      mode: "today",
      sessionId: null,
      hours: null,
      timezone: config.preferences?.timezone || "Asia/Shanghai",
      locale: config.preferences?.locale || "zh-CN",
      theme: config.preferences?.theme || "classic",
      output: outputFile,
      dataDir: workReceiptHome,
    }, {
      projectDir,
      now,
      codexHome: config.hook?.codex_home || null,
    });
    const state = {
      state_version: 1,
      status: "ok",
      last_attempt_at: attemptedAt,
      last_success_at: new Date().toISOString(),
      output_file: generated.outputFile,
      structured_file: generated.persisted.companionPath,
      import_file: generated.persisted.transferPath,
      receipt_id: generated.record.id,
      snapshot_hash: generated.record.source.snapshot_hash,
      error: null,
    };
    writeAutoState({ workReceiptHome }, state);
    return state;
  } catch (error) {
    const state = {
      ...previousState,
      state_version: 1,
      status: emptyActivityError(error) ? "waiting" : "error",
      last_attempt_at: attemptedAt,
      error: String(error?.message || error),
    };
    writeAutoState({ workReceiptHome }, state);
    return state;
  }
}

export async function runAutomaticReceipt({ workReceiptHome, now = new Date(), retryAfterCoalesce = true }) {
  const lockPath = path.join(workReceiptHome, "auto.lock");
  const pendingPath = path.join(workReceiptHome, "auto.pending");
  if (!acquireLock(lockPath, pendingPath)) {
    if (!retryAfterCoalesce) return { status: "coalesced" };
    await delay(800);
    if (fs.existsSync(lockPath)) return { status: "coalesced" };
    return runAutomaticReceipt({
      workReceiptHome,
      now: pendingTime(pendingPath),
      retryAfterCoalesce: false,
    });
  }

  try {
    await delay(350);
    const pendingBeforeRun = fs.existsSync(pendingPath) ? pendingTime(pendingPath) : null;
    fs.rmSync(pendingPath, { force: true });
    let result = await generateOnce({ workReceiptHome, now });
    if (pendingBeforeRun && crossesConfiguredDay(workReceiptHome, now, pendingBeforeRun)) {
      result = await generateOnce({ workReceiptHome, now: pendingBeforeRun });
    }
    if (fs.existsSync(pendingPath)) {
      const nextRunAt = pendingTime(pendingPath);
      fs.rmSync(pendingPath, { force: true });
      await delay(350);
      result = await generateOnce({ workReceiptHome, now: nextRunAt });
    }
    return result;
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
}

async function main() {
  const workReceiptHome = argumentValue("--work-receipt-home");
  if (!workReceiptHome) return;
  const triggeredAtValue = new Date(argumentValue("--triggered-at") || Date.now());
  const triggeredAt = Number.isNaN(triggeredAtValue.getTime()) ? new Date() : triggeredAtValue;
  try {
    await runAutomaticReceipt({ workReceiptHome: path.resolve(workReceiptHome), now: triggeredAt });
  } catch {
    // Automatic receipt failures must never interrupt the Codex turn.
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
