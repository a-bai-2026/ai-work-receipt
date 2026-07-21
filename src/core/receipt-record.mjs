import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { canonicalStringify, sha256Hex } from "./canonical.mjs";
import {
  buildLogicalReceiptKey,
  buildProtocolReceiptId,
  buildSummaryReceiptId,
} from "./fact-identity.mjs";
import {
  buildCompensation,
  DEFAULT_LOCALE,
  getWorkProfileCopy,
} from "./presentation.mjs";

const SCHEMA_VERSION = 2;
const SOURCE_VERSION = "cwr2";
const COLLECTOR_VERSION = "0.6.0";

function fingerprintSessionIds(sessionIds) {
  return crypto.createHash("sha256").update([...sessionIds].sort().join("|")).digest("hex").slice(0, 16);
}

export function buildReceiptRecord(metrics, defaultTheme = "classic", locale = DEFAULT_LOCALE, canonical = {}) {
  const sessionFingerprint = fingerprintSessionIds(metrics.sessionIds);
  const logicalKey = buildLogicalReceiptKey(metrics);
  const summaryOnly = metrics.mode === "last-hours";
  const schemaVersion = summaryOnly ? 1 : SCHEMA_VERSION;
  const sourceVersion = summaryOnly ? "cwr1" : SOURCE_VERSION;
  const id = summaryOnly
    ? buildSummaryReceiptId(logicalKey)
    : buildProtocolReceiptId(SOURCE_VERSION, logicalKey);
  const snapshotHash = sha256Hex({
    start: metrics.startAt.toISOString(),
    end: metrics.endAt.toISOString(),
    tokens: metrics.tokens,
    tools: metrics.toolCalls,
    turns: metrics.completedTurns,
    interruptions: metrics.interruptions,
    scope: metrics.mode,
    rangeStartDate: metrics.rangeStartDate,
    rangeEndDate: metrics.rangeEndDate,
    windowStartAt: metrics.windowStartAt?.toISOString() || null,
    windowEndAt: metrics.windowEndAt?.toISOString() || null,
  });
  const workProfileId = metrics.workProfileId || "temporary-hire";
  const workProfile = getWorkProfileCopy(workProfileId, locale);
  const facts = Array.isArray(canonical.facts) ? canonical.facts : [];
  const coverage = canonical.coverage || {
    kind: "selected_sessions",
    scan_mode: "none",
    start_date: metrics.rangeStartDate,
    end_date: metrics.rangeEndDate,
    complete_through_date: null,
    observed_through_at: new Date().toISOString(),
  };
  const manifestCore = {
    version: 1,
    fact_schema_version: 1,
    metric_schema_version: 1,
    accounting_timezone: "Asia/Shanghai",
    fact_count: facts.length,
    fact_ids: facts.map((fact) => fact.fact_id),
    coverage,
  };
  const manifest = {
    ...manifestCore,
    manifest_hash: sha256Hex(canonicalStringify(manifestCore)),
  };

  const record = {
    schema_version: schemaVersion,
    locale,
    id,
    generated_at: new Date().toISOString(),
    source: {
      type: "codex",
      version: sourceVersion,
      scope: metrics.mode,
      hours: metrics.windowHours || null,
      collector_version: COLLECTOR_VERSION,
      logical_key: logicalKey,
      session_fingerprint: sessionFingerprint,
      snapshot_hash: snapshotHash,
    },
    period: {
      start_at: (metrics.windowStartAt || metrics.startAt).toISOString(),
      end_at: (metrics.windowEndAt || metrics.endAt).toISOString(),
      timezone: metrics.timezone,
      range_start_date: metrics.rangeStartDate,
      range_end_date: metrics.rangeEndDate,
    },
    stats: {
      session_count: metrics.sessionCount,
      completed_turns: metrics.completedTurns,
      user_messages: metrics.userMessages,
      tool_calls: metrics.toolCalls,
      interruptions: metrics.interruptions,
      work_duration_ms: Math.round(metrics.workDurationMs),
      average_first_token_ms: Math.round(metrics.averageFirstTokenMs),
      tokens: { ...metrics.tokens },
      models: [...metrics.models],
      receipt_work_points: metrics.workPoints,
      receipt_formula_version: "receipt_work_points_v1",
    },
    presentation: {
      default_theme: defaultTheme,
      work_profile: workProfileId,
      work_title: workProfile.title,
      review: workProfile.review,
      compensation: buildCompensation(metrics.mode, metrics.workPoints, locale),
    },
    privacy: {
      contains_prompts: false,
      contains_responses: false,
      contains_code: false,
      contains_paths: false,
      contains_filenames: false,
    },
  };
  if (!summaryOnly) {
    record.manifest = manifest;
    record.facts = facts;
  }
  return record;
}

export function persistReceiptRecord(record, outputHtmlPath, requestedDataDir = null) {
  const dataDir = path.resolve(
    requestedDataDir || process.env.CODEX_WORK_RECEIPT_HOME || path.join(os.homedir(), ".codex-work-receipt"),
  );
  const receiptsDir = path.join(dataDir, "receipts");
  fs.mkdirSync(receiptsDir, { recursive: true });

  const receiptPath = path.join(receiptsDir, `${record.id}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(dataDir, "latest.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const allRecords = fs.readdirSync(receiptsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(receiptsDir, name), "utf8")));
  const deduplicated = new Map();
  for (const item of allRecords) {
    const logicalKey = item.source?.logical_key || (
      item.source?.scope === "latest" && item.source?.session_fingerprint
        ? `latest:${item.source.session_fingerprint}`
        : item.id
    );
    const current = deduplicated.get(logicalKey);
    if (!current || String(item.generated_at).localeCompare(String(current.generated_at)) > 0) {
      deduplicated.set(logicalKey, item);
    }
  }
  const history = [...deduplicated.values()]
    .sort((left, right) => String(left.period?.end_at).localeCompare(String(right.period?.end_at)));
  const historyPath = path.join(dataDir, "history.jsonl");
  const historyDescriptor = fs.openSync(historyPath, "w");
  try {
    for (const item of history) fs.writeSync(historyDescriptor, `${JSON.stringify(item)}\n`, null, "utf8");
  } finally {
    fs.closeSync(historyDescriptor);
  }

  const companionPath = /\.html?$/i.test(outputHtmlPath)
    ? outputHtmlPath.replace(/\.html?$/i, ".json")
    : `${outputHtmlPath}.json`;
  fs.writeFileSync(companionPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { dataDir, receiptPath, companionPath };
}
