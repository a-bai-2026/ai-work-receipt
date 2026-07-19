import { dateKey, rowDate } from "../lib/time.mjs";
import {
  calendarDayCount,
  isCalendarScope,
  isDateInRange,
  isTimeWindowScope,
} from "./range.mjs";
import { selectWorkProfileId } from "./presentation.mjs";

function zeroUsage() {
  return {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
  };
}

function addUsage(target, source) {
  for (const key of Object.keys(target)) target[key] += Number(source[key] || 0);
}

function sessionTokenUsage(rows, range) {
  const events = rows
    .filter((row) => row.type === "event_msg" && row.payload?.type === "token_count")
    .filter((row) => row.payload?.info?.total_token_usage);

  if (!events.length) return zeroUsage();
  const totals = zeroUsage();
  const previous = zeroUsage();

  for (const row of events) {
    const currentUsage = row.payload.info.total_token_usage;
    const date = rowDate(row);
    const selected = (!isCalendarScope(range.scope) && !isTimeWindowScope(range.scope))
      || isDateInRange(date, range);

    for (const key of Object.keys(totals)) {
      const current = Math.max(0, Number(currentUsage[key] || 0));
      if (selected) totals[key] += current >= previous[key] ? current - previous[key] : current;
      previous[key] = current;
    }
  }

  return totals;
}

function calculateWorkPoints(metrics) {
  const workMinutes = Math.ceil(metrics.workDurationMs / 60_000);
  const outputTokenK = Number(metrics.tokens.output_tokens || 0) / 1000;
  const reasoningTokenK = Number(metrics.tokens.reasoning_output_tokens || 0) / 1000;
  const points =
    60 +
    metrics.completedTurns * 8 +
    metrics.toolCalls * 3 +
    outputTokenK * 1.2 +
    reasoningTokenK * 1.8 +
    workMinutes * 2 +
    metrics.interruptions * 12;
  return Math.max(0, Math.round(points));
}

function emptyRangeMessage(range) {
  if (range.scope === "last-hours") return `最近 ${range.hours} 小时没有找到 Codex 活动`;
  if (range.scope === "today") return `没有找到 ${range.targetDate} 的 Codex 活动`;
  if (range.scope === "last-7-days") return `没有找到 ${range.startDate} 至 ${range.endDate} 的 Codex 活动`;
  if (range.scope === "this-week") return `本周暂时没有找到 Codex 活动`;
  return "没有找到可统计的 Codex 会话";
}

export function collectMetrics(sessions, range) {
  const scopedSessions = [];
  const sessionIds = [];
  const tokens = zeroUsage();
  let completedTurns = 0;
  let userMessages = 0;
  let toolCalls = 0;
  let interruptions = 0;
  let workDurationMs = 0;
  let totalFirstTokenMs = 0;
  let firstTokenSamples = 0;
  const timestamps = [];
  const activeDateKeys = new Set();
  const models = new Set();

  for (const session of sessions) {
    const scopedRows = isCalendarScope(range.scope) || isTimeWindowScope(range.scope)
      ? session.rows.filter((row) => isDateInRange(rowDate(row), range))
      : session.rows;

    if (!scopedRows.length) continue;
    scopedSessions.push(session);
    sessionIds.push(session.sessionId);
    addUsage(tokens, sessionTokenUsage(session.rows, range));

    for (const row of scopedRows) {
      const date = rowDate(row);
      if (date) {
        timestamps.push(date);
        activeDateKeys.add(dateKey(date, range.timezone));
      }

      if (row.type === "turn_context" && row.payload?.model) models.add(row.payload.model);
      if (row.type === "event_msg") {
        const eventType = row.payload?.type;
        if (eventType === "task_complete") {
          completedTurns += 1;
          workDurationMs += Number(row.payload.duration_ms || 0);
          if (Number.isFinite(row.payload.time_to_first_token_ms)) {
            totalFirstTokenMs += row.payload.time_to_first_token_ms;
            firstTokenSamples += 1;
          }
        } else if (eventType === "user_message") userMessages += 1;
        else if (eventType === "turn_aborted") {
          interruptions += 1;
          workDurationMs += Number(row.payload.duration_ms || 0);
        }
      }

      if (
        row.type === "response_item" &&
        (row.payload?.type === "custom_tool_call" || row.payload?.type === "function_call")
      ) toolCalls += 1;
    }

    const fallbackModel = [...session.rows]
      .reverse()
      .find((row) => row.type === "turn_context" && row.payload?.model)?.payload?.model;
    if (fallbackModel) models.add(fallbackModel);
  }

  if (!scopedSessions.length || !timestamps.length) throw new Error(emptyRangeMessage(range));

  timestamps.sort((left, right) => left - right);
  const rangeStartDate = range.startDate || dateKey(timestamps[0], range.timezone);
  const rangeEndDate = range.endDate || dateKey(timestamps.at(-1), range.timezone);
  const metrics = {
    mode: range.scope,
    timezone: range.timezone,
    targetDate: range.targetDate,
    rangeStartDate,
    rangeEndDate,
    windowStartAt: range.startAt,
    windowEndAt: range.endAt,
    windowHours: range.hours,
    calendarDayCount: isCalendarScope(range.scope) ? calendarDayCount(range) : 1,
    activeDayCount: Math.max(1, activeDateKeys.size),
    sessionIds,
    sessionCount: scopedSessions.length,
    startAt: timestamps[0],
    endAt: timestamps.at(-1),
    completedTurns,
    userMessages,
    toolCalls,
    interruptions,
    workDurationMs,
    averageFirstTokenMs: firstTokenSamples ? totalFirstTokenMs / firstTokenSamples : 0,
    tokens,
    models: [...models],
  };
  metrics.workProfileId = selectWorkProfileId(metrics);
  metrics.workPoints = calculateWorkPoints(metrics);
  return metrics;
}
