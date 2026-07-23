import { dateKey, rowDate } from "../lib/time.mjs";
import { toolCategoryForRow } from "../lib/tool-category.mjs";
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

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, Number(map.get(key) || 0) + amount);
}

function roundedRatio(numerator, denominator, digits = 2) {
  if (!denominator) return 0;
  const scale = 10 ** digits;
  return Math.round((Number(numerator || 0) / denominator) * scale) / scale;
}

function percentile(samples, quantile) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const position = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  return Math.round(lower + (upper - lower) * (position - lowerIndex));
}

function usageRows(map, keyName) {
  return [...map.entries()]
    .map(([name, count]) => ({ [keyName]: name, count }))
    .sort((left, right) => right.count - left.count || left[keyName].localeCompare(right[keyName]));
}

function localHour(date, timezone) {
  if (!date) return null;
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function buildInsights({
  tokens,
  completedTurns,
  toolCalls,
  completedDurationMs,
  firstTokenSamples,
  turnDurationSamples,
  activityByHour,
  modelUsage,
  toolUsage,
}) {
  const inputTokens = Math.max(0, Number(tokens.input_tokens || 0));
  const cachedInputTokens = Math.max(0, Number(tokens.cached_input_tokens || 0));
  return {
    cache_hit_rate: inputTokens ? Math.min(1, roundedRatio(cachedInputTokens, inputTokens, 4)) : 0,
    per_turn: {
      total_tokens: roundedRatio(tokens.total_tokens, completedTurns),
      output_tokens: roundedRatio(tokens.output_tokens, completedTurns),
      tool_calls: roundedRatio(toolCalls, completedTurns),
      work_duration_ms: Math.round(roundedRatio(completedDurationMs, completedTurns)),
    },
    latency_ms: {
      first_token: {
        sample_count: firstTokenSamples.length,
        p50: percentile(firstTokenSamples, 0.5),
        p90: percentile(firstTokenSamples, 0.9),
      },
      turn: {
        sample_count: turnDurationSamples.length,
        p50: percentile(turnDurationSamples, 0.5),
        p90: percentile(turnDurationSamples, 0.9),
      },
    },
    activity_by_hour: [...activityByHour],
    model_usage: usageRows(modelUsage, "model"),
    tool_usage: usageRows(toolUsage, "category"),
  };
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
  let completedDurationMs = 0;
  let totalFirstTokenMs = 0;
  let firstTokenSamples = 0;
  const firstTokenLatencySamples = [];
  const turnDurationSamples = [];
  const timestamps = [];
  const activeDateKeys = new Set();
  const models = new Set();
  const modelUsage = new Map();
  const toolUsage = new Map();
  const activityByHour = Array(24).fill(0);

  for (const session of sessions) {
    const scopedRows = isCalendarScope(range.scope) || isTimeWindowScope(range.scope)
      ? session.rows.filter((row) => isDateInRange(rowDate(row), range))
      : session.rows;

    if (!scopedRows.length) continue;
    scopedSessions.push(session);
    sessionIds.push(session.sessionId);
    addUsage(tokens, sessionTokenUsage(session.rows, range));

    let activeModel = null;
    let unattributedModelTurns = 0;
    let sessionHasSelectedModel = false;
    for (const row of session.rows) {
      if (row.type === "turn_context" && row.payload?.model) activeModel = row.payload.model;
      const selected = (!isCalendarScope(range.scope) && !isTimeWindowScope(range.scope))
        || isDateInRange(rowDate(row), range);
      if (!selected) continue;
      const date = rowDate(row);
      if (date) {
        timestamps.push(date);
        activeDateKeys.add(dateKey(date, range.timezone));
      }

      if (row.type === "turn_context" && row.payload?.model) {
        models.add(row.payload.model);
        sessionHasSelectedModel = true;
      }
      if (row.type === "event_msg") {
        const eventType = row.payload?.type;
        if (eventType === "task_complete") {
          const hasDuration = Number.isFinite(row.payload.duration_ms);
          const durationMs = hasDuration ? Math.max(0, Number(row.payload.duration_ms)) : 0;
          completedTurns += 1;
          workDurationMs += durationMs;
          completedDurationMs += durationMs;
          if (hasDuration) turnDurationSamples.push(durationMs);
          if (activeModel) {
            models.add(activeModel);
            sessionHasSelectedModel = true;
            increment(modelUsage, activeModel);
          }
          else unattributedModelTurns += 1;
          const hour = localHour(date, range.timezone);
          if (hour !== null) activityByHour[hour] += 1;
          if (Number.isFinite(row.payload.time_to_first_token_ms)) {
            const firstTokenMs = Math.max(0, Number(row.payload.time_to_first_token_ms));
            totalFirstTokenMs += firstTokenMs;
            firstTokenSamples += 1;
            firstTokenLatencySamples.push(firstTokenMs);
          }
        } else if (eventType === "user_message") userMessages += 1;
        else if (eventType === "turn_aborted") {
          interruptions += 1;
          workDurationMs += Math.max(0, Number(row.payload.duration_ms || 0));
          const hour = localHour(date, range.timezone);
          if (hour !== null) activityByHour[hour] += 1;
        }
      }

      const toolCategory = toolCategoryForRow(row);
      if (toolCategory) {
        toolCalls += 1;
        increment(toolUsage, toolCategory);
      }
    }

    const fallbackModel = [...session.rows]
      .reverse()
      .find((row) => row.type === "turn_context" && row.payload?.model)?.payload?.model;
    if (fallbackModel && (!sessionHasSelectedModel || unattributedModelTurns)) {
      models.add(fallbackModel);
      if (unattributedModelTurns) increment(modelUsage, fallbackModel, unattributedModelTurns);
    }
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
  metrics.insights = buildInsights({
    tokens,
    completedTurns,
    toolCalls,
    completedDurationMs,
    firstTokenSamples: firstTokenLatencySamples,
    turnDurationSamples,
    activityByHour,
    modelUsage,
    toolUsage,
  });
  metrics.workProfileId = selectWorkProfileId(metrics);
  metrics.workPoints = calculateWorkPoints(metrics);
  return metrics;
}
