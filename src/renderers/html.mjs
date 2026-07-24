import fs from "node:fs";
import { createRequire } from "node:module";

import { buildCode128B } from "../core/barcode.mjs";
import { createReceiptFile } from "../core/file-payload.mjs";
import { formatDate, formatDuration, formatNumber, formatTime } from "../lib/time.mjs";
import {
  buildCompensation,
  DEFAULT_LOCALE,
  getCustomSummaryNotice,
  getReceiptCopy,
  getRollingSummaryNotice,
  getScopeLabel,
} from "../core/presentation.mjs";
import { getHtmlStarPrompt } from "../core/open-source.mjs";

const require = createRequire(import.meta.url);
const DOM_TO_IMAGE_SOURCE = fs.readFileSync(
  process.env.CODEX_WORK_RECEIPT_DOM_TO_IMAGE || require.resolve("dom-to-image-more"),
  "utf8",
);
const MODELFLARE_LOGO_DATA_URL = `data:image/png;base64,${fs.readFileSync(
  new URL("../../docs/images/sponsors/modelflare-logo.png", import.meta.url),
).toString("base64")}`;
const MODELFLARE_URL = "https://modelflare.dev/sign-up?partner=OB9YXNSEEGOL";

function inlineScript(value) {
  return String(value).replaceAll("</script", "<\\/script");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function receiptRow(label, value, emphasize = false) {
  return `<div class="receipt-row${emphasize ? " receipt-row--emphasize" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function receiptBarcode(value) {
  const barcode = buildCode128B(value);
  const segments = barcode.segments.map((segment) => {
    const kind = segment.isBar ? "bar" : "space";
    return `<span class="barcode-segment barcode-segment--${kind}" style="flex-grow:${segment.width}"></span>`;
  }).join("");

  return `<div class="barcode" data-barcode-value="${escapeHtml(barcode.value)}" aria-hidden="true">${segments}</div>`;
}

function formatCount(value, units, locale) {
  const amount = Math.max(0, Math.round(value || 0));
  const unit = units[amount === 1 ? 0 : 1];
  return `${formatNumber(amount, locale)} ${unit}`;
}

function formatDateKey(value, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return String(value || "");
  return locale === "en" ? `${match[2]}/${match[3]}/${match[1]}` : `${match[1]}/${match[2]}/${match[3]}`;
}

function formatDecimal(value, locale, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
    maximumFractionDigits,
  }).format(Math.max(0, Number(value || 0)));
}

function formatPercent(value, locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Math.min(1, Math.max(0, Number(value || 0))));
}

function formatSeconds(milliseconds, locale) {
  return `${formatDecimal(Number(milliseconds || 0) / 1000, locale)}s`;
}

function renderBreakdown(items, { key, labels = {}, unit, emptyLabel, locale }) {
  if (!items.length) return `<p class="structure-empty">${escapeHtml(emptyLabel)}</p>`;
  const maximum = Math.max(1, ...items.map((item) => Number(item.count || 0)));
  return items.slice(0, 6).map((item) => {
    const name = String(item[key] || "");
    const label = labels[name] || name;
    const count = Math.max(0, Number(item.count || 0));
    const width = count ? Math.max(6, Math.round((count / maximum) * 100)) : 0;
    return `
          <div class="structure-row">
            <span class="structure-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="structure-bar" aria-hidden="true"><i style="width:${width}%"></i></span>
            <strong>${escapeHtml(`${formatDecimal(count, locale, 0)} ${unit}`)}</strong>
          </div>`;
  }).join("");
}

function renderInsights(record, copy, locale) {
  const insights = record.stats.insights || {};
  const perTurn = insights.per_turn || {};
  const firstToken = insights.latency_ms?.first_token || {};
  const turnLatency = insights.latency_ms?.turn || {};
  const activity = Array.from({ length: 24 }, (_, hour) => Number(insights.activity_by_hour?.[hour] || 0));
  const activityPeak = Math.max(0, ...activity);
  const heatmapCells = activity.map((count, hour) => {
    const strength = count && activityPeak ? 16 + Math.round((count / activityPeak) * 84) : 4;
    const aria = copy.insights.heatmapCell
      .replaceAll("{hour}", String(hour).padStart(2, "0"))
      .replaceAll("{count}", formatDecimal(count, locale, 0));
    return `<span class="heatmap-cell" style="--heat:${strength}%" role="img" aria-label="${escapeHtml(aria)}" title="${escapeHtml(aria)}"></span>`;
  }).join("");
  const firstTokenValue = firstToken.sample_count
    ? `${copy.insights.p50} ${formatSeconds(firstToken.p50, locale)}`
    : copy.insights.noSamples;
  const firstTokenDetail = firstToken.sample_count
    ? `${copy.insights.p90} ${formatSeconds(firstToken.p90, locale)}`
    : "—";
  const turnValue = turnLatency.sample_count
    ? `${copy.insights.p50} ${formatSeconds(turnLatency.p50, locale)}`
    : copy.insights.noSamples;
  const turnDetail = turnLatency.sample_count
    ? `${copy.insights.p90} ${formatSeconds(turnLatency.p90, locale)}`
    : "—";
  const modelItems = insights.model_usage?.length
    ? insights.model_usage
    : (record.stats.models || []).map((model) => ({ model, count: 0 }));
  const toolItems = insights.tool_usage || [];
  const modelRows = renderBreakdown(modelItems, {
    key: "model",
    unit: copy.insights.turnsUnit,
    emptyLabel: copy.insights.noSamples,
    locale,
  });
  const toolRows = renderBreakdown(toolItems, {
    key: "category",
    labels: copy.insights.toolCategories,
    unit: copy.insights.callsUnit,
    emptyLabel: copy.insights.noSamples,
    locale,
  });

  return `
      <section class="insights" aria-label="${escapeHtml(copy.insights.title)}">
        <h2 class="insights-title">${escapeHtml(copy.insights.title)}</h2>
        <div class="insight-metrics">
          <div class="insight-metric">
            <span>${escapeHtml(copy.insights.cacheHit)}</span>
            <strong>${escapeHtml(formatPercent(insights.cache_hit_rate, locale))}</strong>
            <small>${escapeHtml(formatNumber(record.stats.tokens.cached_input_tokens, locale))} / ${escapeHtml(formatNumber(record.stats.tokens.input_tokens, locale))}</small>
          </div>
          <div class="insight-metric">
            <span>${escapeHtml(copy.insights.perTurn)}</span>
            <strong>${escapeHtml(`${formatDecimal(perTurn.total_tokens, locale)} Token`)}</strong>
            <small>${escapeHtml(`${formatDecimal(perTurn.output_tokens, locale)} ${copy.insights.outputTokens} · ${formatDecimal(perTurn.tool_calls, locale)} ${copy.insights.toolCalls}`)}</small>
          </div>
          <div class="insight-metric">
            <span>${escapeHtml(copy.insights.firstTokenLatency)}</span>
            <strong>${escapeHtml(firstTokenValue)}</strong>
            <small>${escapeHtml(firstTokenDetail)}</small>
          </div>
          <div class="insight-metric">
            <span>${escapeHtml(copy.insights.turnLatency)}</span>
            <strong>${escapeHtml(turnValue)}</strong>
            <small>${escapeHtml(turnDetail)}</small>
          </div>
        </div>
        <div class="heatmap-block">
          <h3>${escapeHtml(copy.insights.heatmap)}</h3>
          <div class="heatmap-grid">${heatmapCells}</div>
          <div class="heatmap-axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
        </div>
        <div class="structure-grid">
          <section class="structure-group">
            <h3>${escapeHtml(copy.insights.models)}</h3>${modelRows}
          </section>
          <section class="structure-group">
            <h3>${escapeHtml(copy.insights.tools)}</h3>${toolRows}
          </section>
        </div>
      </section>`;
}

function renderFeatureCommands(featureCopy, locale) {
  const languageArgument = locale === "en" ? " --lang en" : "";
  const tabs = featureCopy.groups.map((group, groupIndex) => {
    const commands = group.commands.map((item) => {
      const command = `npx codex-work-receipt@latest ${item.args}${languageArgument}`;
      return `
          <li class="feature-command">
            <strong class="feature-command__name">${escapeHtml(item.label)}</strong>
            <div class="feature-command__action">
              <code tabindex="0">${escapeHtml(command)}</code>
              <button class="feature-copy-button" type="button" data-copy-command="${escapeHtml(command)}" aria-label="${escapeHtml(`${featureCopy.copyLabel}: ${item.label}`)}" title="${escapeHtml(featureCopy.copyLabel)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                <span data-copy-label>${escapeHtml(featureCopy.copyLabel)}</span>
              </button>
            </div>
          </li>`;
    }).join("");
    const tabId = `feature-tab-${group.id}`;
    const panelId = `feature-panel-${group.id}`;
    return {
      tab: `<button id="${tabId}" class="feature-tab" type="button" role="tab" aria-selected="${groupIndex === 0 ? "true" : "false"}" aria-controls="${panelId}" tabindex="${groupIndex === 0 ? "0" : "-1"}" data-feature-tab="${escapeHtml(group.id)}">${escapeHtml(group.title)}<span>${formatNumber(group.commands.length, locale)}</span></button>`,
      panel: `
        <section id="${panelId}" class="feature-panel" role="tabpanel" aria-labelledby="${tabId}" data-feature-panel="${escapeHtml(group.id)}">
          <ul>${commands}
          </ul>
        </section>`,
    };
  });
  return `
        <div class="feature-tabs" data-feature-tabs>
          <div class="feature-tabs__list" role="tablist" aria-label="${escapeHtml(featureCopy.tabAria)}">${tabs.map((item) => item.tab).join("")}</div>
          <div class="feature-tabs__panels">${tabs.map((item) => item.panel).join("")}</div>
        </div>`;
}

export function renderHtml({ record, dataQrDataUrl = null, miniProgramCodeDataUrl = null, transferFile = null }) {
  const locale = record.locale || DEFAULT_LOCALE;
  const copy = getReceiptCopy(locale);
  const githubStarPrompt = getHtmlStarPrompt(locale);
  const changelogUrl = `${githubStarPrompt.url}/blob/main/CHANGELOG.md`;
  const startAt = new Date(record.period.start_at);
  const endAt = new Date(record.period.end_at);
  const timezone = record.period.timezone;
  const displayDate = formatDate(endAt, timezone, locale);
  const rangeStartDate = record.period.range_start_date || formatDateKey(record.period.start_at.slice(0, 10), "zh-CN").replaceAll("/", "-");
  const rangeEndDate = record.period.range_end_date || formatDateKey(record.period.end_at.slice(0, 10), "zh-CN").replaceAll("/", "-");
  const isCalendarScope = new Set(["today", "last-7-days", "this-week"]).has(record.source.scope)
    || (record.source.scope === "custom-range" && record.source.range_kind === "calendar-days");
  const spansMultipleDates = rangeStartDate !== rangeEndDate;
  const scopeLabel = getScopeLabel(record.source.scope, locale, record.source.hours, {
    rangeKind: record.source.range_kind,
    filterKind: record.source.filter_kind,
  });
  const rollingSummaryNotice = record.source.scope === "last-hours"
    ? getRollingSummaryNotice(locale, record.source.hours)
    : record.source.scope === "custom-range" && record.source.range_kind === "exact-time"
      ? getCustomSummaryNotice(locale)
    : null;
  const dateRange = spansMultipleDates
    ? `${formatDateKey(rangeStartDate, locale)}—${formatDateKey(rangeEndDate, locale)}`
    : formatDateKey(rangeEndDate, locale);
  const businessPeriod = isCalendarScope
    ? `${dateRange} · ${scopeLabel}`
    : `${formatTime(startAt, timezone, locale)}—${formatTime(endAt, timezone, locale)}`;
  const businessPeriodLabel = isCalendarScope ? copy.meta.period : copy.meta.hours;
  const modelLabel = record.stats.models.length ? record.stats.models.join(" / ") : copy.modelMissing;
  const shortReceiptId = record.id.replace(/^cwr2?_/, "").slice(0, 8).toUpperCase() || "UNKNOWN";
  const receiptNumber = `${shortReceiptId}-${String(record.stats.completed_turns).padStart(3, "0")}`;
  const compensation = record.presentation.compensation || buildCompensation(record.source.scope, 0, locale);
  const responseSeconds = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(record.stats.average_first_token_ms / 1000);
  const fileBase = `codex-work-receipt-${record.source.scope}-${spansMultipleDates ? `${rangeStartDate}-to-${rangeEndDate}` : `${rangeEndDate}-${record.id.slice(4, 12)}`}`;
  const exportConfig = JSON.stringify({
    idleLabel: copy.exportImage,
    busyLabel: copy.exportingImage,
    successLabel: copy.exportSuccess,
    errorLabel: copy.exportError,
    miniProgramLabel: copy.exportMiniProgramLabel,
    fileBase,
  }).replaceAll("<", "\\u003c");
  const resolvedTransferFile = transferFile || {
    ...createReceiptFile(record),
    filename: `${fileBase}.cwr.json`,
  };
  const transferConfig = JSON.stringify({
    filename: resolvedTransferFile.filename || `${fileBase}.cwr.json`,
    content: resolvedTransferFile.content,
    mimeType: resolvedTransferFile.mimeType,
    successLabel: copy.downloadSuccess,
    errorLabel: copy.downloadError,
  }).replaceAll("<", "\\u003c");
  const featureConfig = JSON.stringify({
    copyLabel: copy.sidebar.features.copyLabel,
    copiedLabel: copy.sidebar.features.copiedLabel,
    copyErrorLabel: copy.sidebar.features.copyErrorLabel,
    copiedStatus: copy.sidebar.features.copiedStatus,
    copyErrorStatus: copy.sidebar.features.copyErrorStatus,
  }).replaceAll("<", "\\u003c");
  const featureCommands = renderFeatureCommands(copy.sidebar.features, locale);
  const featureCommandCount = copy.sidebar.features.groups
    .reduce((total, group) => total + group.commands.length, 0);
  const featureCountLabel = copy.sidebar.features.countLabel
    .replace("{count}", formatNumber(featureCommandCount, locale));
  const insights = renderInsights(record, copy, locale);
  const rows = [
    receiptRow(copy.rows.scope, scopeLabel),
    receiptRow(copy.rows.sessions, formatCount(record.stats.session_count, copy.units.sessions, locale)),
    receiptRow(copy.rows.turns, formatCount(record.stats.completed_turns, copy.units.turns, locale)),
    receiptRow(copy.rows.messages, formatCount(record.stats.user_messages, copy.units.messages, locale)),
    receiptRow(copy.rows.tools, formatCount(record.stats.tool_calls, copy.units.tools, locale)),
    receiptRow(copy.rows.tokens, formatNumber(record.stats.tokens.total_tokens, locale), true),
    receiptRow(copy.rows.cachedTokens, formatNumber(record.stats.tokens.cached_input_tokens, locale)),
    receiptRow(copy.rows.interruptions, formatCount(record.stats.interruptions, copy.units.interruptions, locale)),
    receiptRow(copy.rows.firstResponse, `${responseSeconds} ${copy.units.seconds[1]}`),
    receiptRow(copy.rows.duration, formatDuration(record.stats.work_duration_ms), true),
  ].join("");

  const miniProgramVisual = miniProgramCodeDataUrl
    ? `<img src="${miniProgramCodeDataUrl}" alt="${escapeHtml(copy.miniProgramAlt)}">`
    : `<div class="mini-placeholder" role="img" aria-label="${escapeHtml(copy.placeholderAria)}"><span>${escapeHtml(copy.placeholderLabel)}</span><strong>${escapeHtml(copy.placeholderValue)}</strong></div>`;
  const fileImportSteps = copy.fileImportSteps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  const dataQrPanel = dataQrDataUrl
    ? `
        <div class="qr-item qr-panel" data-data-qr-panel hidden>
          <div class="qr-frame qr-frame--large"><img src="${dataQrDataUrl}" alt="${escapeHtml(copy.dataQrAlt)}"></div>
          <strong>${escapeHtml(copy.dataQrTitle)}</strong>
          <span>${escapeHtml(copy.dataQrHint)}</span>
          <button class="secondary-button" data-show-mini-program type="button">${escapeHtml(copy.showMiniProgramCode)}</button>
        </div>`
    : "";
  const scanAlternative = dataQrDataUrl
    ? `
        <div class="scan-alternative">
          <strong>${escapeHtml(copy.scanAlternativeTitle)}</strong>
          <span>${escapeHtml(copy.scanAlternativeHint)}</span>
          <button class="secondary-button" data-show-data-qr type="button">${escapeHtml(copy.showDataQr)}</button>
        </div>`
    : "";
  const transferVisual = `
      <div class="transfer-layout">
        <div class="qr-switcher">
          <div class="qr-item qr-panel" data-mini-program-panel>
            <div class="qr-frame qr-frame--large">${miniProgramVisual}</div>
            <strong data-export-mini-label>${escapeHtml(copy.openMiniProgram)}</strong>
            <span>${escapeHtml(copy.openMiniProgramHint)}</span>
          </div>
          ${dataQrPanel}
        </div>
        <div class="file-import-card" data-file-import-controls>
          <strong>${escapeHtml(copy.fileImportTitle)}</strong>
          <ol>${fileImportSteps}</ol>
          <button class="download-file-button" id="download-import-file" type="button">${escapeHtml(copy.downloadFile)}</button>
          <span class="download-file-hint">${escapeHtml(copy.downloadFileHint)}</span>
          <span class="download-status" id="download-status" role="status" aria-live="polite"></span>
          <p>${escapeHtml(copy.fileImportPrivacy)}</p>
          ${scanAlternative}
        </div>
      </div>`;

  return `<!doctype html>
<html lang="${escapeHtml(copy.htmlLang)}" data-theme="${escapeHtml(record.presentation.default_theme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.pageTitle)} · ${escapeHtml(displayDate)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #171713;
      --paper: #ffffff;
      --desk: #eeeae3;
      --desk-soft: #f6f3ee;
      --muted: #6d6c65;
      --line: #aaa8a0;
      --accent: #f3f2ed;
      --shadow: rgba(31, 30, 24, .18);
      --mark-bg: #ffffff;
      --mark-fg: #171713;
    }
    html[data-theme="diner"] {
      --ink: #a7475d;
      --paper: #f7dde3;
      --desk: #f2ece8;
      --desk-soft: #faf6f3;
      --muted: #b46b7b;
      --line: #d29aa7;
      --accent: #f0cdd6;
      --shadow: rgba(116, 58, 72, .18);
      --mark-bg: #f7dde3;
      --mark-fg: #a7475d;
    }
    html[data-theme="payroll"] {
      --ink: #ffe077;
      --paper: #66742f;
      --desk: #edebe3;
      --desk-soft: #f7f5ef;
      --muted: #e8cf74;
      --line: #9aa35d;
      --accent: #5c682b;
      --shadow: rgba(48, 57, 19, .24);
      --mark-bg: #66742f;
      --mark-fg: #ffe077;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 20% 10%, rgba(255,255,255,.7), transparent 30%),
        linear-gradient(135deg, var(--desk-soft), var(--desk));
      color: var(--ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      transition: background .2s ease, color .2s ease;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 540px) 180px;
      gap: 240px;
      max-width: 1020px;
      margin: 0 auto;
      padding: 30px 18px 54px;
      align-items: start;
    }
    .page {
      width: 100%;
      padding: 0;
    }
    .sidebar {
      position: sticky;
      top: 30px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sidebar-card {
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #1a1a1a;
      color: #ccc;
    }
    .sidebar-card__title {
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 0 0 6px;
      color: #e0e0e0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .03em;
    }
    .sidebar-card__title svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      color: #e0e0e0;
    }
    .sidebar-card p {
      margin: 0 0 8px;
      color: #999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
      line-height: 1.5;
    }
    .sidebar-card a {
      color: #fff;
      font-size: 11px;
      text-decoration: none;
    }
    .sidebar-card a:hover,
    .sidebar-card a:focus-visible {
      color: #fff;
      text-decoration: underline;
    }
    .sidebar-sponsor { text-align: center; }
    .sidebar-sponsor__label {
      display: block;
      margin-bottom: 8px;
      color: #777;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 9px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .sidebar-sponsor__link { display: block; }
    .sidebar-sponsor img {
      display: block;
      width: 40px;
      height: 40px;
      margin: 0 auto 6px;
      border-radius: 4px;
    }
    .sidebar-sponsor__name {
      color: #ccc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
    }
    .sidebar-features {
      --feature-ink: #282620;
      --feature-muted: #756f65;
      --feature-line: #c9c2b6;
      --feature-soft-line: #ded7cc;
      --feature-paper: #f6f2e9;
      --feature-paper-soft: #fbfaf7;
      --feature-command: #ece8df;
      padding: 0;
      overflow: hidden;
      border-color: var(--feature-line);
      background: var(--feature-paper);
      color: var(--feature-ink);
      text-align: left;
      transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .sidebar-features[open] {
      background: var(--feature-paper-soft);
      box-shadow: 0 10px 28px rgba(53, 48, 39, .1);
    }
    .sidebar-features__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px;
      cursor: pointer;
      list-style: none;
      user-select: none;
      transition: background .15s ease;
    }
    .sidebar-features__summary::-webkit-details-marker { display: none; }
    .sidebar-features__summary:hover { background: #eee8dc; }
    .sidebar-features__summary .sidebar-card__title {
      margin: 0;
      color: var(--feature-ink);
    }
    .sidebar-features__summary .sidebar-card__title svg { color: var(--feature-muted); }
    .sidebar-features__summary:focus-visible {
      outline: 2px solid var(--feature-ink);
      outline-offset: -3px;
    }
    .sidebar-features__meta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }
    .sidebar-features__count {
      color: var(--feature-muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 9px;
      white-space: nowrap;
    }
    .sidebar-features__chevron {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--feature-muted);
      transition: transform .18s ease;
    }
    .sidebar-features[open] .sidebar-features__chevron { transform: rotate(180deg); }
    .sidebar-features__body {
      padding: 0 12px 12px;
      border-top: 1px solid var(--feature-soft-line);
      background: var(--feature-paper-soft);
      animation: feature-reveal .15s ease-out;
    }
    .sidebar-features .sidebar-features__description {
      margin: 10px 0 12px;
      color: var(--feature-muted);
    }
    .feature-tabs__list {
      display: flex;
      gap: 5px;
      margin: 0 -2px 12px;
      padding: 2px;
      overflow-x: auto;
      scrollbar-width: thin;
      scrollbar-color: #b8b0a4 transparent;
    }
    .feature-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 34px;
      padding: 7px 10px;
      flex: 0 0 auto;
      border: 1px solid var(--feature-line);
      border-radius: 5px;
      background: var(--feature-command);
      color: var(--feature-muted);
      cursor: pointer;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .feature-tab span {
      min-width: 17px;
      padding: 1px 4px;
      border-radius: 999px;
      background: rgba(40, 38, 32, .08);
      font-size: 8px;
      text-align: center;
    }
    .feature-tab[aria-selected="true"] {
      border-color: var(--feature-ink);
      background: var(--feature-ink);
      color: #fff;
    }
    .feature-tab[aria-selected="true"] span { background: rgba(255, 255, 255, .18); }
    .feature-tab:focus-visible {
      outline: 2px solid #81786c;
      outline-offset: 2px;
    }
    .feature-tabs[data-ready="true"] .feature-panel[hidden] { display: none; }
    .feature-panel + .feature-panel {
      margin-top: 14px;
      padding-top: 13px;
      border-top: 1px solid var(--feature-soft-line);
    }
    .feature-tabs[data-ready="true"] .feature-panel + .feature-panel {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    .feature-panel ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .feature-command {
      min-width: 0;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed var(--feature-soft-line);
    }
    .feature-command:nth-child(-n + 2) {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    .feature-command__name {
      display: block;
      margin-bottom: 5px;
      color: var(--feature-ink);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
    }
    .feature-command__action {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 5px;
      align-items: stretch;
    }
    .feature-command code {
      display: block;
      min-width: 0;
      padding: 6px;
      overflow-x: auto;
      border: 1px solid #d5cfc4;
      border-radius: 4px;
      background: var(--feature-command);
      color: #34312c;
      font-size: 9px;
      line-height: 1.35;
      white-space: nowrap;
      scrollbar-width: thin;
      scrollbar-color: #b8b0a4 transparent;
    }
    .feature-command code:focus-visible {
      outline: 2px solid #81786c;
      outline-offset: 1px;
    }
    .feature-copy-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-width: 48px;
      padding: 5px 6px;
      border: 1px solid #bdb5a9;
      border-radius: 4px;
      background: #fff;
      color: #4c4942;
      cursor: pointer;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 9px;
      font-weight: 600;
    }
    .feature-copy-button:hover { background: #e5dfd4; }
    .feature-copy-button:focus-visible {
      outline: 2px solid var(--feature-ink);
      outline-offset: 2px;
    }
    .feature-copy-button svg {
      width: 11px;
      height: 11px;
      flex-shrink: 0;
    }
    .feature-copy-button[data-state="success"] {
      border-color: #78a782;
      background: #eef7ef;
      color: #276036;
    }
    .feature-copy-button[data-state="error"] {
      border-color: #c88c84;
      background: #fff1ef;
      color: #8b3028;
    }
    .feature-copy-status {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @keyframes feature-reveal {
      from { opacity: 0; transform: translateY(-3px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (min-width: 1120px) {
      .sidebar {
        align-items: center;
      }
      .sidebar-card {
        width: 100%;
      }
      .sidebar-features[open] {
        width: clamp(360px, calc(100vw - 880px), 560px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sidebar-features,
      .sidebar-features__summary,
      .sidebar-features__chevron { transition: none; }
      .sidebar-features__body { animation: none; }
    }
    .toolbar {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .theme-switcher {
      display: flex;
      flex-wrap: nowrap;
    }
    .theme-button {
      appearance: none;
      border: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
      border-radius: 0;
      background: color-mix(in srgb, var(--paper) 74%, transparent);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      padding: 7px 12px;
      margin-left: -1px;
      transition: background .15s ease, color .15s ease;
    }
    .theme-button:first-child {
      margin-left: 0;
      border-radius: 6px 0 0 6px;
    }
    .theme-button:last-child {
      border-radius: 0 6px 6px 0;
    }
    .theme-button[aria-pressed="true"] {
      position: relative;
      z-index: 1;
      border-color: var(--ink);
      background: var(--ink);
      color: var(--paper);
    }
    .export-actions {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .export-button {
      appearance: none;
      border: 1px solid #333;
      border-radius: 6px;
      background: #222;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 14px;
      transition: opacity .15s ease, transform .15s ease;
    }
    .export-button:hover { opacity: .85; transform: translateY(-1px); }
    .export-button:disabled { cursor: wait; opacity: .62; transform: none; }
    .export-status {
      min-height: 16px;
      color: var(--muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
    }
    .export-status[data-state="error"] { color: #b33a2e; }
    .export-sheet { padding: 10px 0; }
    .paper {
      position: relative;
      background:
        repeating-linear-gradient(0deg, color-mix(in srgb, var(--ink) 2%, transparent) 0, color-mix(in srgb, var(--ink) 2%, transparent) 1px, transparent 1px, transparent 4px),
        var(--paper);
      box-shadow: 0 22px 60px var(--shadow);
      filter: contrast(.985);
    }
    .paper::before,
    .paper::after {
      content: "";
      position: absolute;
      left: 0;
      width: 100%;
      height: 10px;
      background: linear-gradient(135deg, transparent 7px, var(--paper) 0) 0 0 / 14px 14px repeat-x;
    }
    .paper::before { top: -9px; transform: rotate(180deg); }
    .paper::after { bottom: -9px; }
    .receipt { padding: 34px 28px 32px; }
    .brand { text-align: center; }
    .brand-mark {
      display: inline-grid;
      place-items: center;
      width: 46px;
      height: 46px;
      margin-bottom: 12px;
      border: 2px solid var(--ink);
      border-radius: 50%;
      background: var(--mark-bg);
      color: var(--mark-fg);
      font-size: 22px;
      font-weight: 800;
    }
    h1 {
      margin: 0;
      font-size: clamp(22px, 7vw, 30px);
      letter-spacing: .08em;
    }
    .subtitle {
      margin: 9px 0 0;
      color: var(--muted);
      font-size: 12px;
      letter-spacing: .12em;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 18px;
      margin: 26px 0 16px;
      font-size: 12px;
    }
    .meta div:nth-child(even) { text-align: right; }
    .divider {
      height: 1px;
      margin: 18px 0;
      border-top: 1px dashed var(--line);
    }
    .receipt-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 24px;
      padding: 6px 0;
      font-size: 14px;
    }
    .receipt-row span { color: var(--muted); }
    .receipt-row strong { text-align: right; font-weight: 700; }
    .receipt-row--emphasize {
      margin: 3px -6px;
      padding: 8px 6px;
      background: var(--accent);
    }
    .insights-title {
      margin: 0 0 12px;
      font-size: 14px;
      letter-spacing: 0;
      text-align: center;
    }
    .insight-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-top: 1px solid var(--line);
      border-left: 1px solid var(--line);
    }
    .insight-metric {
      min-width: 0;
      padding: 10px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .insight-metric span,
    .insight-metric strong,
    .insight-metric small { display: block; }
    .insight-metric span {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.35;
    }
    .insight-metric strong {
      margin-top: 5px;
      font-size: 16px;
      line-height: 1.2;
    }
    .insight-metric small {
      margin-top: 4px;
      overflow: hidden;
      color: var(--muted);
      font-size: 9px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .heatmap-block,
    .structure-grid {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px dashed var(--line);
    }
    .heatmap-block h3,
    .structure-group h3 {
      margin: 0 0 9px;
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(24, minmax(0, 1fr));
      gap: 2px;
    }
    .heatmap-cell {
      display: block;
      height: 22px;
      background: color-mix(in srgb, var(--ink) var(--heat), transparent);
    }
    .heatmap-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      color: var(--muted);
      font-size: 8px;
    }
    .structure-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .structure-group { min-width: 0; }
    .structure-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(32px, .65fr) auto;
      gap: 6px;
      align-items: center;
      min-width: 0;
      padding: 4px 0;
      font-size: 9px;
    }
    .structure-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .structure-bar {
      display: block;
      height: 4px;
      background: color-mix(in srgb, var(--ink) 10%, transparent);
    }
    .structure-bar i {
      display: block;
      height: 100%;
      background: var(--ink);
    }
    .structure-row strong { font-size: 8px; white-space: nowrap; }
    .structure-empty { margin: 0; color: var(--muted); font-size: 9px; }
    .verdict { text-align: center; }
    .verdict h2 { margin: 0; font-size: 22px; letter-spacing: .04em; }
    .review {
      margin: 12px auto 0;
      max-width: 30em;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 14px;
      line-height: 1.7;
    }
    .salary {
      padding: 10px 0 2px;
      font-size: 14px;
    }
    .salary-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 18px;
    }
    .salary-line span { color: var(--muted); }
    .salary strong { font-size: 28px; }
    .salary strong small {
      margin-left: 6px;
      font-size: 12px;
      color: var(--muted);
    }
    .barcode {
      display: flex;
      align-items: stretch;
      box-sizing: border-box;
      width: 100%;
      height: 48px;
      margin: 18px auto 8px;
      max-width: 320px;
      padding: 0 20px;
      overflow: hidden;
    }
    .barcode-segment {
      display: block;
      flex-basis: 0;
      flex-shrink: 0;
      min-width: 0;
      height: 100%;
    }
    .barcode-segment--bar {
      background: var(--ink);
    }
    .barcode-segment--space {
      background: transparent;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      line-height: 1.65;
      color: var(--muted);
    }
    .transfer-stub {
      margin-top: 32px;
      padding: 26px 24px 24px;
    }
    .transfer-heading { text-align: center; }
    .transfer-heading h2 { margin: 0; font-size: 18px; letter-spacing: .08em; }
    .transfer-heading p { margin: 7px 0 0; color: var(--muted); font-size: 11px; }
    .transfer-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
      align-items: start;
      gap: 22px;
      margin-top: 20px;
    }
    .qr-switcher { min-width: 0; }
    .qr-item { text-align: center; }
    .qr-panel[hidden] { display: none; }
    .qr-frame {
      display: grid;
      place-items: center;
      width: min(100%, 176px);
      aspect-ratio: 1;
      margin: 0 auto 10px;
      padding: 10px;
      border: 1px solid var(--line);
      background: #fff;
    }
    .qr-frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .qr-item strong { display: block; font-size: 12px; }
    .qr-item span { display: block; margin-top: 4px; color: var(--muted); font-size: 10px; line-height: 1.45; }
    .qr-frame--large { width: min(100%, 210px); }
    .file-import-card {
      padding: 18px;
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--paper) 94%, var(--ink));
    }
    .file-import-card > strong { display: block; font-size: 14px; }
    .file-import-card ol {
      margin: 12px 0 16px;
      padding-left: 20px;
      color: var(--muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
      line-height: 1.65;
    }
    .download-file-button {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--ink);
      border-radius: 999px;
      background: var(--ink);
      color: var(--paper);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
    }
    .download-file-button:hover { transform: translateY(-1px); }
    .download-file-hint,
    .download-status {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 10px;
      line-height: 1.45;
      text-align: center;
    }
    .download-status { min-height: 14px; }
    .download-status[data-state="success"] { color: #287a36; }
    .download-status[data-state="error"] { color: #b33a2e; }
    .file-import-card > p {
      margin: 14px 0 0;
      color: var(--muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 10px;
      line-height: 1.55;
      text-align: center;
    }
    .scan-alternative {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px dashed var(--line);
      text-align: center;
    }
    .scan-alternative strong,
    .scan-alternative span { display: block; }
    .scan-alternative strong { font-size: 12px; }
    .scan-alternative span { margin-top: 4px; color: var(--muted); font-size: 10px; line-height: 1.45; }
    .secondary-button {
      margin-top: 10px;
      padding: 7px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--ink);
      background: transparent;
      font: inherit;
      font-size: 10px;
      cursor: pointer;
    }
    .secondary-button:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); }
    .mini-placeholder {
      display: grid;
      place-content: center;
      width: 100%;
      height: 100%;
      border: 2px dashed #9a9a92;
      color: #5f5f59;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
    }
    .mini-placeholder span { font-size: 13px; }
    .mini-placeholder strong { margin-top: 4px; font-size: 18px; }
    .transfer-note {
      margin: 18px 0 0;
      padding-top: 14px;
      border-top: 1px dashed var(--line);
      color: var(--muted);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 11px;
      line-height: 1.65;
      text-align: center;
    }
    .transfer-note--warning {
      padding: 12px 14px;
      border: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
      background: color-mix(in srgb, var(--accent) 76%, var(--paper));
      color: var(--ink);
      font-weight: 700;
    }
    .privacy {
      margin: 24px auto 0;
      max-width: 440px;
      color: color-mix(in srgb, var(--ink) 64%, transparent);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 12px;
      line-height: 1.6;
      text-align: center;
    }
    @media (max-width: 1119px) {
      .layout {
        grid-template-columns: 1fr;
        max-width: 540px;
        gap: 0;
      }
      .sidebar {
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 28px;
      }
      .sidebar-card {
        flex: 1 1 160px;
        min-width: 0;
      }
      .sidebar-features {
        width: 100%;
        max-width: 100%;
        margin-inline: 0;
        flex-basis: 100%;
      }
      .feature-tabs__list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: visible;
      }
      .feature-tab {
        width: 100%;
        min-width: 0;
        white-space: normal;
      }
    }
    @media (max-width: 560px) {
      .feature-panel ul { grid-template-columns: 1fr; }
      .feature-command:nth-child(2) {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed var(--feature-soft-line);
      }
    }
    @media (max-width: 420px) {
      .layout { padding-inline: 10px; }
      .toolbar {
        flex-direction: column;
        gap: 10px;
      }
      .receipt { padding-inline: 20px; }
      .meta { grid-template-columns: 1fr; }
      .meta div:nth-child(even) { text-align: left; }
      .transfer-layout { grid-template-columns: 1fr; }
      .structure-grid { grid-template-columns: 1fr; }
      .sidebar { flex-direction: column; }
      .sidebar-card { flex-basis: auto; }
    }
  </style>
</head>
<body>
  <div class="layout">
  <main class="page">
    <div class="toolbar">
      <nav class="theme-switcher" aria-label="${escapeHtml(copy.themeAria)}">
        <button class="theme-button" type="button" data-theme-value="classic">${escapeHtml(copy.themes.classic)}</button>
        <button class="theme-button" type="button" data-theme-value="diner">${escapeHtml(copy.themes.diner)}</button>
        <button class="theme-button" type="button" data-theme-value="payroll">${escapeHtml(copy.themes.payroll)}</button>
      </nav>
      <div class="export-actions">
        <button class="export-button" id="save-receipt-image" type="button">${escapeHtml(copy.exportImage)}</button>
        <span class="export-status" id="export-status" role="status" aria-live="polite"></span>
      </div>
    </div>

    <div class="export-sheet" id="receipt-export">
      <article class="paper receipt" aria-label="${escapeHtml(copy.receiptAria)}">
      <header class="brand">
        <div class="brand-mark">C</div>
        <h1>${escapeHtml(copy.receiptTitle)}</h1>
        <p class="subtitle">CODEX WORK RECEIPT</p>
      </header>

      <section class="meta">
        <div>${escapeHtml(copy.meta.date)}: ${escapeHtml(displayDate)}</div>
        <div>${escapeHtml(businessPeriodLabel)}: ${escapeHtml(businessPeriod)}</div>
        <div>${escapeHtml(copy.meta.number)}: ${escapeHtml(receiptNumber)}</div>
        <div>${escapeHtml(copy.meta.timezone)}: ${escapeHtml(timezone)}</div>
      </section>

      <div class="divider"></div>
      <section>${rows}</section>
      <div class="divider"></div>

      ${insights}

      <div class="divider"></div>

      <section class="verdict">
        <h2>${escapeHtml(record.presentation.work_title)}</h2>
        <p class="review">${escapeHtml(record.presentation.review)}</p>
      </section>

      <div class="divider"></div>
      <section class="salary">
        <div class="salary-line">
          <span>${escapeHtml(compensation.label)}</span>
          <strong>${escapeHtml(formatNumber(compensation.amount, locale))}<small>${escapeHtml(compensation.unit)}</small></strong>
        </div>
      </section>
      ${receiptBarcode(receiptNumber)}
      <footer class="footer">
        <div>MODEL · ${escapeHtml(modelLabel)}</div>
        <div>${escapeHtml(copy.footerThanks)}</div>
      </footer>
      </article>

      <section class="paper transfer-stub" aria-label="${escapeHtml(copy.transferAria)}">
      <header class="transfer-heading">
        <h2>${escapeHtml(copy.transferTitle)}</h2>
        <p>${escapeHtml(copy.transferDescription)}</p>
      </header>
      ${transferVisual}
      ${rollingSummaryNotice ? `<p class="transfer-note transfer-note--warning">${escapeHtml(rollingSummaryNotice)}</p>` : ""}
      <p class="transfer-note">${escapeHtml(copy.transferNote)}</p>
      </section>
    </div>

    <p class="privacy">${escapeHtml(copy.privacy)}</p>
  </main>
  <aside class="sidebar" aria-label="${escapeHtml(copy.sidebar.aria)}">
    <div class="sidebar-card">
      <h3 class="sidebar-card__title">
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
        ${escapeHtml(copy.sidebar.supportTitle)}
      </h3>
      <p>${escapeHtml(copy.sidebar.supportDescription)}</p>
      <a class="github-star-link" href="${escapeHtml(githubStarPrompt.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(githubStarPrompt.label)}</a>
    </div>
    <div class="sidebar-card">
      <h3 class="sidebar-card__title">
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"/></svg>
        ${escapeHtml(copy.sidebar.changelogTitle)}
      </h3>
      <a href="${escapeHtml(changelogUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.sidebar.changelogLink)}</a>
    </div>
    <div class="sidebar-card sidebar-sponsor">
      <span class="sidebar-sponsor__label">${escapeHtml(copy.sidebar.sponsorLabel)}</span>
      <a class="sidebar-sponsor__link" href="${MODELFLARE_URL}" target="_blank" rel="noopener noreferrer">
        <img src="${MODELFLARE_LOGO_DATA_URL}" alt="${escapeHtml(copy.sidebar.sponsorAlt)}" width="40" height="40">
        <span class="sidebar-sponsor__name">ModelFlare<br>modelflare.dev</span>
      </a>
    </div>
    <details class="sidebar-card sidebar-features" data-feature-details>
      <summary class="sidebar-features__summary">
        <span class="sidebar-card__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" x2="20" y1="19" y2="19"></line></svg>
          ${escapeHtml(copy.sidebar.features.title)}
        </span>
        <span class="sidebar-features__meta">
          <span class="sidebar-features__count">${escapeHtml(featureCountLabel)}</span>
          <svg class="sidebar-features__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
        </span>
      </summary>
      <div class="sidebar-features__body">
        <p class="sidebar-features__description">${escapeHtml(copy.sidebar.features.description)}</p>${featureCommands}
        <span class="feature-copy-status" data-feature-copy-status role="status" aria-live="polite"></span>
      </div>
    </details>
  </aside>
  </div>
  <script>${inlineScript(DOM_TO_IMAGE_SOURCE)}</script>
  <script>
    const exportConfig = ${exportConfig};
    const transferConfig = ${transferConfig};
    const featureConfig = ${featureConfig};
    const themes = new Set(["classic", "diner", "payroll"]);
    const buttons = [...document.querySelectorAll("[data-theme-value]")];
    function applyTheme(theme) {
      const selected = themes.has(theme) ? theme : "classic";
      document.documentElement.dataset.theme = selected;
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeValue === selected)));
      try { localStorage.setItem("codex-work-receipt-theme", selected); } catch {}
    }
    buttons.forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeValue)));
    let savedTheme = null;
    try { savedTheme = localStorage.getItem("codex-work-receipt-theme"); } catch {}
    applyTheme(savedTheme || document.documentElement.dataset.theme);

    const featureDetails = document.querySelector("[data-feature-details]");
    if (featureDetails) {
      try {
        const savedFeatureState = localStorage.getItem("codex-work-receipt-features-open");
        if (savedFeatureState === "true") featureDetails.open = true;
        if (savedFeatureState === "false") featureDetails.open = false;
      } catch {}
      featureDetails.addEventListener("toggle", () => {
        try { localStorage.setItem("codex-work-receipt-features-open", String(featureDetails.open)); } catch {}
      });
    }

    const featureTabs = document.querySelector("[data-feature-tabs]");
    if (featureTabs) {
      const tabs = [...featureTabs.querySelectorAll("[data-feature-tab]")];
      const panels = [...featureTabs.querySelectorAll("[data-feature-panel]")];
      const availableTabs = new Set(tabs.map((tab) => tab.dataset.featureTab));
      function activateFeatureTab(value, { focus = false } = {}) {
        const selected = availableTabs.has(value) ? value : tabs[0]?.dataset.featureTab;
        tabs.forEach((tab) => {
          const active = tab.dataset.featureTab === selected;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
          if (active && focus) {
            tab.focus();
            tab.scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        });
        panels.forEach((panel) => { panel.hidden = panel.dataset.featurePanel !== selected; });
        try { localStorage.setItem("codex-work-receipt-feature-tab", selected); } catch {}
      }
      let savedFeatureTab = null;
      try { savedFeatureTab = localStorage.getItem("codex-work-receipt-feature-tab"); } catch {}
      featureTabs.dataset.ready = "true";
      activateFeatureTab(savedFeatureTab || tabs[0]?.dataset.featureTab);
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateFeatureTab(tab.dataset.featureTab));
        tab.addEventListener("keydown", (event) => {
          let nextIndex = null;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
          if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = tabs.length - 1;
          if (nextIndex === null) return;
          event.preventDefault();
          activateFeatureTab(tabs[nextIndex].dataset.featureTab, { focus: true });
        });
      });
    }

    function fallbackCopyText(value) {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      Object.assign(textarea.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Clipboard copy was rejected");
    }

    async function copyFeatureCommand(value) {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          return;
        } catch {}
      }
      fallbackCopyText(value);
    }

    const featureCopyStatus = document.querySelector("[data-feature-copy-status]");
    document.querySelectorAll("[data-copy-command]").forEach((button) => {
      let resetTimer = null;
      button.addEventListener("click", async () => {
        const label = button.querySelector("[data-copy-label]");
        clearTimeout(resetTimer);
        button.disabled = true;
        try {
          await copyFeatureCommand(button.dataset.copyCommand || "");
          button.dataset.state = "success";
          if (label) label.textContent = featureConfig.copiedLabel;
          if (featureCopyStatus) featureCopyStatus.textContent = featureConfig.copiedStatus;
        } catch (error) {
          console.error(error);
          button.dataset.state = "error";
          if (label) label.textContent = featureConfig.copyErrorLabel;
          if (featureCopyStatus) featureCopyStatus.textContent = featureConfig.copyErrorStatus;
        } finally {
          button.disabled = false;
          resetTimer = setTimeout(() => {
            delete button.dataset.state;
            if (label) label.textContent = featureConfig.copyLabel;
          }, 1800);
        }
      });
    });

    const downloadFileButton = document.getElementById("download-import-file");
    const downloadStatus = document.getElementById("download-status");
    if (downloadFileButton && downloadStatus) {
      downloadFileButton.addEventListener("click", () => {
        try {
          const blob = new Blob([transferConfig.content], { type: transferConfig.mimeType });
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = transferConfig.filename;
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
          downloadStatus.textContent = transferConfig.successLabel;
          downloadStatus.dataset.state = "success";
        } catch (error) {
          console.error(error);
          downloadStatus.textContent = transferConfig.errorLabel;
          downloadStatus.dataset.state = "error";
        }
      });
    }

    const miniProgramPanel = document.querySelector("[data-mini-program-panel]");
    const dataQrPanel = document.querySelector("[data-data-qr-panel]");
    const showDataQrButton = document.querySelector("[data-show-data-qr]");
    const showMiniProgramButton = document.querySelector("[data-show-mini-program]");
    if (miniProgramPanel && dataQrPanel && showDataQrButton && showMiniProgramButton) {
      showDataQrButton.addEventListener("click", () => {
        miniProgramPanel.hidden = true;
        dataQrPanel.hidden = false;
      });
      showMiniProgramButton.addEventListener("click", () => {
        dataQrPanel.hidden = true;
        miniProgramPanel.hidden = false;
      });
    }

    const exportButton = document.getElementById("save-receipt-image");
    const exportStatus = document.getElementById("export-status");
    const exportNode = document.getElementById("receipt-export");

    function setExportStatus(message, state = "") {
      exportStatus.textContent = message;
      exportStatus.dataset.state = state;
    }

    function waitForImages(node) {
      return Promise.all([...node.querySelectorAll("img")].filter((image) => image.getAttribute("src")).map((image) => {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve, reject) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", reject, { once: true });
        });
      }));
    }

    function sanitizeExportNode(node) {
      const fileImportControls = node.querySelector("[data-file-import-controls]");
      if (fileImportControls) fileImportControls.remove();
      const dataQr = node.querySelector("[data-data-qr-panel]");
      if (dataQr) dataQr.remove();
      const miniProgram = node.querySelector("[data-mini-program-panel]");
      if (miniProgram) miniProgram.hidden = false;
      const transferLayout = node.querySelector(".transfer-layout");
      if (transferLayout) {
        transferLayout.style.gridTemplateColumns = "minmax(0, 1fr)";
        transferLayout.style.justifyItems = "center";
      }

      const miniProgramLabel = node.querySelector("[data-export-mini-label]");
      if (miniProgramLabel) miniProgramLabel.textContent = exportConfig.miniProgramLabel;
      const transferDescription = node.querySelector(".transfer-heading p");
      if (transferDescription) transferDescription.remove();
      node.querySelectorAll(".transfer-note").forEach((note) => note.remove());

      node.querySelectorAll(".paper").forEach((paper) => {
        paper.style.boxShadow = "none";
      });
    }

    function normalizeExportTextLayout(node) {
      const selectors = ".meta > div, .receipt-row > span, .receipt-row > strong, .salary-line > span, .salary-line > strong";
      node.querySelectorAll(selectors).forEach((item) => {
        ["width", "height", "inline-size", "block-size"].forEach((property) => {
          item.style.removeProperty(property);
        });
      });
      node.querySelectorAll(".receipt-row > strong, .salary-line > strong").forEach((value) => {
        value.style.setProperty("white-space", "nowrap");
        value.style.setProperty("flex-shrink", "0");
      });
    }

    function createExportNode(source, paperColor) {
      const clone = source.cloneNode(true);
      sanitizeExportNode(clone);
      const sourceWidth = Math.ceil(source.getBoundingClientRect().width || source.scrollWidth);
      Object.assign(clone.style, {
        position: "absolute",
        left: "-100000px",
        top: "0",
        width: sourceWidth + "px",
        background: paperColor,
        pointerEvents: "none",
      });
      document.body.appendChild(clone);
      return clone;
    }

    function downloadImage(dataUrl, filename) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      if (typeof link.download === "string") link.click();
      else window.open(dataUrl, "_blank", "noopener");
      link.remove();
    }

    exportButton.addEventListener("click", async () => {
      if (exportButton.disabled) return;
      exportButton.disabled = true;
      exportButton.textContent = exportConfig.busyLabel;
      setExportStatus("");
      let renderNode = null;

      try {
        if (document.fonts?.ready) await document.fonts.ready;
        const paperColor = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#ffffff";
        renderNode = createExportNode(exportNode, paperColor);
        await waitForImages(renderNode);
        const width = Math.ceil(renderNode.scrollWidth);
        const height = Math.ceil(renderNode.scrollHeight);
        const scale = Math.max(2, Math.min(3, 1500 / Math.max(1, width)));
        const dataUrl = await domtoimage.toPng(renderNode, {
          width,
          height,
          scale,
          pixelRatio: 1,
          bgcolor: paperColor,
          cacheBust: false,
          style: { background: paperColor },
          onclone(clone) {
            sanitizeExportNode(clone);
            normalizeExportTextLayout(clone);
            clone.style.position = "static";
            clone.style.left = "auto";
            clone.style.top = "auto";
            clone.style.width = width + "px";
            clone.style.background = paperColor;
          },
          logger: {},
        });
        const theme = themes.has(document.documentElement.dataset.theme)
          ? document.documentElement.dataset.theme
          : "classic";
        downloadImage(dataUrl, exportConfig.fileBase + "-" + theme + ".png");
        setExportStatus(exportConfig.successLabel, "success");
      } catch (error) {
        console.error(error);
        setExportStatus(exportConfig.errorLabel, "error");
      } finally {
        if (renderNode) renderNode.remove();
        exportButton.disabled = false;
        exportButton.textContent = exportConfig.idleLabel;
      }
    });
  </script>
</body>
</html>`;
}
