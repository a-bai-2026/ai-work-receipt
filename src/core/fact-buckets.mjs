import { canonicalStringify, sha256Hex } from "./canonical.mjs";
import {
  ACCOUNTING_TIMEZONE,
  buildFactId,
  buildSessionId,
  FACT_SCHEMA_VERSION,
  METRIC_SCHEMA_VERSION,
} from "./fact-identity.mjs";
import { dateKey, rowDate } from "../lib/time.mjs";
import { isCalendarScope, isDateInRange, shiftDateKey } from "./range.mjs";

const TOKEN_KEYS = [
  "input_tokens",
  "cached_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];

function zeroUsage() {
  return Object.fromEntries(TOKEN_KEYS.map((key) => [key, 0]));
}

function tokenUsage(row) {
  return row.type === "event_msg" && row.payload?.type === "token_count"
    ? row.payload?.info?.total_token_usage || null
    : null;
}

function tokenDeltaForDate(rows, localDate, timezone) {
  const totals = zeroUsage();
  const previous = zeroUsage();
  let resetCount = 0;

  for (const row of rows) {
    const usage = tokenUsage(row);
    const date = rowDate(row);
    if (!usage || !date) continue;
    const key = dateKey(date, timezone);
    if (key > localDate) break;
    let rowReset = false;

    for (const tokenKey of TOKEN_KEYS) {
      const current = Math.max(0, Number(usage[tokenKey] || 0));
      if (key === localDate) {
        if (current >= previous[tokenKey]) totals[tokenKey] += current - previous[tokenKey];
        else {
          totals[tokenKey] += current;
          rowReset = true;
        }
      }
      previous[tokenKey] = current;
    }
    if (key === localDate && rowReset) resetCount += 1;
  }

  return { totals, resetCount };
}

function metricsForRows(sessionRows, bucketRows, localDate, timezone) {
  let completedTurns = 0;
  let userMessages = 0;
  let toolCalls = 0;
  let interruptions = 0;
  let workDurationMs = 0;
  let firstTokenTotalMs = 0;
  let firstTokenSampleCount = 0;
  const models = new Set();

  for (const row of bucketRows) {
    if (row.type === "turn_context" && row.payload?.model) models.add(row.payload.model);
    if (row.type === "event_msg") {
      if (row.payload?.type === "task_complete") {
        completedTurns += 1;
        workDurationMs += Math.max(0, Number(row.payload.duration_ms || 0));
        if (Number.isFinite(row.payload.time_to_first_token_ms)) {
          firstTokenTotalMs += Math.max(0, Number(row.payload.time_to_first_token_ms));
          firstTokenSampleCount += 1;
        }
      } else if (row.payload?.type === "user_message") userMessages += 1;
      else if (row.payload?.type === "turn_aborted") {
        interruptions += 1;
        workDurationMs += Math.max(0, Number(row.payload.duration_ms || 0));
      }
    }
    if (
      row.type === "response_item" &&
      (row.payload?.type === "custom_tool_call" || row.payload?.type === "function_call")
    ) toolCalls += 1;
  }

  if (!models.size) {
    const fallback = [...sessionRows]
      .reverse()
      .find((row) => row.type === "turn_context" && row.payload?.model)?.payload?.model;
    if (fallback) models.add(fallback);
  }

  const tokenResult = tokenDeltaForDate(sessionRows, localDate, timezone);
  return {
    completed_turns: completedTurns,
    user_messages: userMessages,
    tool_calls: toolCalls,
    interruptions,
    work_duration_ms: Math.round(workDurationMs),
    first_token_total_ms: Math.round(firstTokenTotalMs),
    first_token_sample_count: firstTokenSampleCount,
    ...tokenResult.totals,
    token_reset_count: tokenResult.resetCount,
    models: [...models].sort(),
  };
}

function coverageForRange(range, scanMode, observedAt) {
  if (!isCalendarScope(range.scope)) {
    return {
      kind: "selected_sessions",
      scan_mode: "none",
      start_date: range.startDate,
      end_date: range.endDate,
      complete_through_date: null,
      observed_through_at: observedAt,
    };
  }

  const full = scanMode === "full";
  return {
    kind: "calendar_range",
    scan_mode: full ? "full" : "best_effort",
    start_date: range.startDate,
    end_date: range.endDate,
    complete_through_date: full ? shiftDateKey(range.endDate, -1) : null,
    observed_through_at: observedAt,
  };
}

export function buildCanonicalFacts(sessions, range, options = {}) {
  const sourceType = options.sourceType || "codex";
  const accountingTimezone = options.accountingTimezone || ACCOUNTING_TIMEZONE;
  const collectorVersion = options.collectorVersion || "0.6.0";
  const observedAt = options.observedAt || new Date().toISOString();
  const facts = [];

  for (const session of sessions) {
    const identityQuality = session.identityQuality || "metadata";
    const sessionId = buildSessionId(sourceType, session.sessionId, identityQuality);
    const sessionRows = [...session.rows].sort(
      (left, right) => Number(left.__sourceLine || 0) - Number(right.__sourceLine || 0),
    );
    const buckets = new Map();

    for (const row of sessionRows) {
      const date = rowDate(row);
      if (!date || (isCalendarScope(range.scope) && !isDateInRange(date, range))) continue;
      const localDate = dateKey(date, accountingTimezone);
      const rows = buckets.get(localDate) || [];
      rows.push(row);
      buckets.set(localDate, rows);
    }

    for (const [localDate, bucketRows] of buckets) {
      const timestamps = bucketRows.map(rowDate).filter(Boolean).sort((left, right) => left - right);
      if (!timestamps.length) continue;
      const stats = metricsForRows(sessionRows, bucketRows, localDate, accountingTimezone);
      const factId = buildFactId({ sourceType, sessionId, accountingTimezone, localDate });
      const sourceRevision = session.sourceRevision || {
        kind: "append-only-jsonl-v1",
        row_count: sessionRows.length,
        byte_length: 0,
        tail_hash: sha256Hex(sessionRows.map((row) => row.__sourceLine || 0)),
      };
      const content = {
        fact_id: factId,
        session_id: sessionId,
        source_type: sourceType,
        accounting_timezone: accountingTimezone,
        local_date: localDate,
        bucket_start_at: timestamps[0].toISOString(),
        bucket_end_at: timestamps.at(-1).toISOString(),
        stats,
      };

      facts.push({
        ...content,
        identity_quality: identityQuality,
        fact_schema_version: FACT_SCHEMA_VERSION,
        metric_schema_version: METRIC_SCHEMA_VERSION,
        collector_version: collectorVersion,
        source_watermark_at: timestamps.at(-1).toISOString(),
        source_revision: sourceRevision,
        observed_at: observedAt,
        content_hash: sha256Hex(canonicalStringify(content)),
      });
    }
  }

  facts.sort((left, right) => (
    left.local_date.localeCompare(right.local_date) || left.fact_id.localeCompare(right.fact_id)
  ));

  const uniqueFactIds = new Set(facts.map((fact) => fact.fact_id));
  if (uniqueFactIds.size !== facts.length) {
    throw new Error("检测到重复的规范事实，请更新生成器后重新生成小票");
  }

  return {
    facts,
    coverage: coverageForRange(range, sessions.scanMode || options.scanMode || "best_effort", observedAt),
  };
}
