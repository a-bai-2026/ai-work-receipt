import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCHEMA_VERSION = 1;
const COLLECTOR_VERSION = "0.2.0";

function fingerprintSessionIds(sessionIds) {
  return crypto.createHash("sha256").update([...sessionIds].sort().join("|")).digest("hex").slice(0, 16);
}

export function buildReceiptRecord(metrics, defaultTheme = "classic") {
  const sessionFingerprint = fingerprintSessionIds(metrics.sessionIds);
  const logicalKey = metrics.mode === "latest"
    ? `latest:${sessionFingerprint}`
    : `today:${metrics.targetDate}:${metrics.timezone}`;
  const id = `cwr_${crypto.createHash("sha256").update(logicalKey).digest("hex").slice(0, 16)}`;
  const snapshotHash = crypto.createHash("sha256").update(JSON.stringify({
    start: metrics.startAt.toISOString(),
    end: metrics.endAt.toISOString(),
    tokens: metrics.tokens,
    tools: metrics.toolCalls,
    turns: metrics.completedTurns,
    interruptions: metrics.interruptions,
  })).digest("hex").slice(0, 16);

  return {
    schema_version: SCHEMA_VERSION,
    id,
    generated_at: new Date().toISOString(),
    source: {
      type: "codex",
      scope: metrics.mode,
      collector_version: COLLECTOR_VERSION,
      logical_key: logicalKey,
      session_fingerprint: sessionFingerprint,
      snapshot_hash: snapshotHash,
    },
    period: {
      start_at: metrics.startAt.toISOString(),
      end_at: metrics.endAt.toISOString(),
      timezone: metrics.timezone,
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
    },
    presentation: {
      default_theme: defaultTheme,
      work_title: metrics.workTitle,
      review: metrics.review,
      compensation: {
        label: metrics.mode === "latest" ? "本单工资" : "本日工资",
        amount: Number(metrics.workPoints || 0),
        unit: "AI 工分",
        note: "按轮次、工具调用、Token 和改需求次数娱乐折算，不代表真实费用。",
        formula_version: "work_points_v1",
      },
    },
    privacy: {
      contains_prompts: false,
      contains_responses: false,
      contains_code: false,
      contains_paths: false,
      contains_filenames: false,
    },
  };
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
  fs.writeFileSync(
    path.join(dataDir, "history.jsonl"),
    history.length ? `${history.map((item) => JSON.stringify(item)).join("\n")}\n` : "",
    "utf8",
  );

  const companionPath = /\.html?$/i.test(outputHtmlPath)
    ? outputHtmlPath.replace(/\.html?$/i, ".json")
    : `${outputHtmlPath}.json`;
  fs.writeFileSync(companionPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { dataDir, receiptPath, companionPath };
}
