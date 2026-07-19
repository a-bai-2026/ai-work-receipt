import { stableId } from "./canonical.mjs";

export const ACCOUNTING_TIMEZONE = "Asia/Shanghai";
export const FACT_SCHEMA_VERSION = 1;
export const METRIC_SCHEMA_VERSION = 1;

export function buildSessionId(sourceType, rawSessionId, identityQuality = "metadata") {
  return stableId("cws", "codex-work-receipt/session/v1", [
    sourceType,
    identityQuality,
    rawSessionId,
  ]);
}

export function buildFactId({ sourceType, sessionId, accountingTimezone, localDate }) {
  return stableId("cwf", "codex-work-receipt/fact/session-day/v1", [
    sourceType,
    sessionId,
    accountingTimezone,
    localDate,
  ]);
}

export function buildLogicalReceiptKey(metrics) {
  const sessionPart = stableId("cwg", "codex-work-receipt/session-group/v1", [
    ...[...metrics.sessionIds].sort(),
  ]);
  if (metrics.mode === "latest" || metrics.mode === "session") {
    return `${metrics.mode}:${sessionPart}:${metrics.timezone}`;
  }
  if (metrics.mode === "last-hours") {
    return `last-hours:${metrics.windowHours}:${metrics.windowStartAt.toISOString()}:${metrics.windowEndAt.toISOString()}:${metrics.timezone}`;
  }
  if (metrics.mode === "this-week") {
    return `this-week:${metrics.rangeStartDate}:${metrics.timezone}`;
  }
  return `${metrics.mode}:${metrics.rangeStartDate}:${metrics.rangeEndDate}:${metrics.timezone}`;
}

export function buildSummaryReceiptId(logicalReceiptKey) {
  return stableId("cwr", "codex-work-receipt/receipt/v1", [logicalReceiptKey]);
}

export function buildProtocolReceiptId(sourceVersion, logicalReceiptKey) {
  return stableId("cwr2", "codex-work-receipt/receipt/v2", [sourceVersion, logicalReceiptKey]);
}
