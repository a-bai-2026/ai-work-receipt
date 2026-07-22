#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

async function main() {
  try {
    const workReceiptHome = argumentValue("--work-receipt-home");
    if (!workReceiptHome) return;
    const input = JSON.parse(await readStdin());
    if (input?.hook_event_name !== "Stop" || !input?.session_id) return;

    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const runnerEntry = path.join(scriptDir, "auto-runner.mjs");
    if (!fs.existsSync(runnerEntry)) return;
    const child = spawn(process.execPath, [
      runnerEntry,
      "--work-receipt-home",
      workReceiptHome,
      "--triggered-at",
      new Date().toISOString(),
    ], {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
  } catch {
    // Automatic receipt failures must never interrupt the Codex turn.
  }
}

await main();
