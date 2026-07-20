import fs from "node:fs";
import { createRequire } from "node:module";

import { buildCode128B } from "../core/barcode.mjs";
import { formatDate, formatDuration, formatNumber, formatTime } from "../lib/time.mjs";
import {
  buildCompensation,
  DEFAULT_LOCALE,
  getReceiptCopy,
  getRollingSummaryNotice,
  getScopeLabel,
} from "../core/presentation.mjs";

const require = createRequire(import.meta.url);
const DOM_TO_IMAGE_SOURCE = fs.readFileSync(require.resolve("dom-to-image-more"), "utf8");

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

function formatCopy(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    String(template),
  );
}

export function renderHtml({ record, dataQrDataUrl = null, dataQrDataUrls = null, miniProgramCodeDataUrl = null }) {
  const locale = record.locale || DEFAULT_LOCALE;
  const copy = getReceiptCopy(locale);
  const startAt = new Date(record.period.start_at);
  const endAt = new Date(record.period.end_at);
  const timezone = record.period.timezone;
  const displayDate = formatDate(endAt, timezone, locale);
  const rangeStartDate = record.period.range_start_date || formatDateKey(record.period.start_at.slice(0, 10), "zh-CN").replaceAll("/", "-");
  const rangeEndDate = record.period.range_end_date || formatDateKey(record.period.end_at.slice(0, 10), "zh-CN").replaceAll("/", "-");
  const isCalendarScope = new Set(["today", "last-7-days", "this-week"]).has(record.source.scope);
  const spansMultipleDates = rangeStartDate !== rangeEndDate;
  const scopeLabel = getScopeLabel(record.source.scope, locale, record.source.hours);
  const rollingSummaryNotice = record.source.scope === "last-hours"
    ? getRollingSummaryNotice(locale, record.source.hours)
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
  const exportConfig = JSON.stringify({
    idleLabel: copy.exportImage,
    busyLabel: copy.exportingImage,
    successLabel: copy.exportSuccess,
    errorLabel: copy.exportError,
    miniProgramLabel: copy.exportMiniProgramLabel,
    fileBase: `codex-work-receipt-${record.source.scope}-${spansMultipleDates ? `${rangeStartDate}-to-${rangeEndDate}` : `${rangeEndDate}-${record.id.slice(4, 12)}`}`,
  }).replaceAll("<", "\\u003c");
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
  const qrUrls = Array.isArray(dataQrDataUrls) && dataQrDataUrls.length
    ? dataQrDataUrls
    : dataQrDataUrl
      ? [dataQrDataUrl]
      : [];
  const dataQrItems = qrUrls.map((url, index) => `
        <div class="qr-item" data-data-qr-index="${index}">
          <div class="qr-frame"><img src="${url}" alt="${escapeHtml(copy.dataQrAlt)} ${index + 1}/${qrUrls.length}"></div>
          <strong>${escapeHtml(copy.importData)}${qrUrls.length > 1 ? ` ${index + 1}/${qrUrls.length}` : ""}</strong>
          <span>${escapeHtml(copy.importDataHint)}</span>
        </div>`).join("");
  const isMultipart = qrUrls.length > 1;
  const multipartSetupSeconds = 10;
  const multipartConfig = JSON.stringify({
    enabled: isMultipart,
    setupSeconds: multipartSetupSeconds,
    frameMs: 4000,
    blankMs: 240,
    setupHint: copy.multipartOpenHint,
    partLabel: copy.multipartPartLabel,
  }).replaceAll("<", "\\u003c");
  const transferVisual = isMultipart
    ? `
      <div class="multipart-live" id="multipart-live">
        <div class="multipart-panel multipart-setup" id="multipart-setup">
          <div class="qr-item multipart-setup__item">
            <div class="qr-frame qr-frame--large">${miniProgramVisual}</div>
            <strong>${escapeHtml(copy.multipartOpenTitle)}</strong>
            <span id="multipart-setup-hint">${escapeHtml(formatCopy(copy.multipartOpenHint, { seconds: multipartSetupSeconds }))}</span>
          </div>
        </div>
        <div class="multipart-panel multipart-stage" id="multipart-stage" hidden>
          <div class="qr-frame qr-frame--large"><img id="multipart-active-qr" alt="${escapeHtml(copy.dataQrAlt)}"></div>
          <strong class="multipart-stage__title">${escapeHtml(copy.multipartTransferTitle)}</strong>
          <span class="multipart-stage__part" id="multipart-part-label">${escapeHtml(formatCopy(copy.multipartPartLabel, { current: 1, total: qrUrls.length }))}</span>
          <span class="multipart-stage__hint">${escapeHtml(copy.multipartTransferHint)}</span>
          <button class="multipart-secondary" id="multipart-show-mini" type="button">${escapeHtml(copy.multipartRestart)}</button>
        </div>
      </div>
      <div class="qr-grid qr-grid--export-only" hidden>
        <div class="qr-item">
          <div class="qr-frame">${miniProgramVisual}</div>
          <strong data-export-mini-label>${escapeHtml(copy.openMiniProgram)}</strong>
          <span>${escapeHtml(copy.openMiniProgramHint)}</span>
        </div>
        ${dataQrItems}
      </div>`
    : `
      <div class="qr-grid qr-grid--single">
        <div class="qr-item">
          <div class="qr-frame">${miniProgramVisual}</div>
          <strong data-export-mini-label>${escapeHtml(copy.openMiniProgram)}</strong>
          <span>${escapeHtml(copy.openMiniProgramHint)}</span>
        </div>
        ${dataQrItems}
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
    .page {
      width: min(100%, 540px);
      margin: 0 auto;
      padding: 30px 18px 54px;
    }
    .toolbar {
      display: grid;
      justify-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }
    .theme-switcher {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
    .theme-button {
      appearance: none;
      border: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--paper) 74%, transparent);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      padding: 8px 12px;
    }
    .theme-button[aria-pressed="true"] {
      background: var(--ink);
      color: var(--paper);
    }
    .export-actions {
      display: grid;
      justify-items: center;
      gap: 6px;
    }
    .export-button {
      appearance: none;
      min-width: 168px;
      border: 1px solid var(--ink);
      border-radius: 999px;
      background: var(--ink);
      color: var(--paper);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      padding: 10px 18px;
      transition: opacity .15s ease, transform .15s ease;
    }
    .export-button:hover { transform: translateY(-1px); }
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
    .qr-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 20px;
    }
    .qr-item { text-align: center; }
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
    .qr-grid--export-only { display: none; }
    .multipart-live { margin-top: 20px; }
    .multipart-panel {
      display: grid;
      place-items: center;
      min-height: 310px;
      padding: 18px;
      border: 1px solid var(--line);
      background: color-mix(in srgb, var(--paper) 94%, var(--ink));
      text-align: center;
    }
    .multipart-panel[hidden] { display: none; }
    .multipart-setup__item { width: 100%; }
    .qr-frame--large { width: min(100%, 250px); }
    .multipart-stage__title,
    .multipart-stage__part,
    .multipart-stage__hint { display: block; }
    .multipart-stage__title { margin-top: 4px; font-size: 14px; }
    .multipart-stage__part { margin-top: 8px; font-size: 12px; font-weight: 800; letter-spacing: .06em; }
    .multipart-stage__hint { max-width: 360px; margin-top: 6px; color: var(--muted); font-size: 10px; line-height: 1.5; }
    #multipart-active-qr[aria-busy="true"] { visibility: hidden; }
    .multipart-secondary {
      margin-top: 14px;
      padding: 7px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--ink);
      background: transparent;
      font: inherit;
      font-size: 10px;
      cursor: pointer;
    }
    .multipart-secondary:hover { background: color-mix(in srgb, var(--ink) 7%, transparent); }
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
    @media (max-width: 420px) {
      .page { padding-inline: 10px; }
      .receipt { padding-inline: 20px; }
      .meta { grid-template-columns: 1fr; }
      .meta div:nth-child(even) { text-align: left; }
      .qr-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
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
  <script>${inlineScript(DOM_TO_IMAGE_SOURCE)}</script>
  <script>
    const exportConfig = ${exportConfig};
    const multipartConfig = ${multipartConfig};
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

    const multipartLive = document.getElementById("multipart-live");
    if (multipartConfig.enabled && multipartLive) {
      const setup = document.getElementById("multipart-setup");
      const setupHint = document.getElementById("multipart-setup-hint");
      const stage = document.getElementById("multipart-stage");
      const activeQr = document.getElementById("multipart-active-qr");
      const partLabel = document.getElementById("multipart-part-label");
      const showMiniButton = document.getElementById("multipart-show-mini");
      const urls = [...document.querySelectorAll(".qr-grid--export-only [data-data-qr-index] img")]
        .map((image) => image.src)
        .filter(Boolean);
      let setupTimer = null;
      let rotationTimer = null;
      let switchTimer = null;
      let activeIndex = 0;

      function stopMultipartTimers() {
        if (setupTimer !== null) clearInterval(setupTimer);
        if (rotationTimer !== null) clearInterval(rotationTimer);
        if (switchTimer !== null) clearTimeout(switchTimer);
        setupTimer = null;
        rotationTimer = null;
        switchTimer = null;
      }

      function setupHintText(seconds) {
        return String(multipartConfig.setupHint).replaceAll("{seconds}", String(seconds));
      }

      function partLabelText(index) {
        return String(multipartConfig.partLabel)
          .replaceAll("{current}", String(index + 1))
          .replaceAll("{total}", String(urls.length));
      }

      function showPart(index, immediate = false) {
        if (!urls.length) return;
        activeIndex = (index + urls.length) % urls.length;
        const applyPart = () => {
          activeQr.src = urls[activeIndex];
          activeQr.alt = partLabelText(activeIndex);
          activeQr.setAttribute("aria-busy", "false");
          partLabel.textContent = partLabelText(activeIndex);
          switchTimer = null;
        };
        if (immediate) {
          applyPart();
          return;
        }
        activeQr.setAttribute("aria-busy", "true");
        switchTimer = setTimeout(applyPart, multipartConfig.blankMs);
      }

      function startMultipartTransfer() {
        stopMultipartTimers();
        setup.hidden = true;
        stage.hidden = false;
        showPart(0, true);
        rotationTimer = setInterval(() => showPart(activeIndex + 1), multipartConfig.frameMs);
      }

      function showMultipartSetup() {
        stopMultipartTimers();
        stage.hidden = true;
        setup.hidden = false;
        let remaining = multipartConfig.setupSeconds;
        setupHint.textContent = setupHintText(remaining);
        setupTimer = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            startMultipartTransfer();
            return;
          }
          setupHint.textContent = setupHintText(remaining);
        }, 1000);
      }

      showMiniButton.addEventListener("click", showMultipartSetup);
      window.addEventListener("beforeunload", stopMultipartTimers);
      showMultipartSetup();
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
      const multipartLiveNode = node.querySelector(".multipart-live");
      if (multipartLiveNode) multipartLiveNode.remove();

      const exportGridNode = node.querySelector(".qr-grid--export-only");
      if (exportGridNode) {
        exportGridNode.removeAttribute("hidden");
        exportGridNode.style.display = "grid";
      }

      node.querySelectorAll("[data-data-qr-index]").forEach((item) => item.remove());
      node.querySelectorAll(".qr-grid").forEach((grid) => {
        grid.style.gridTemplateColumns = "minmax(0, 1fr)";
        grid.style.justifyItems = "center";
      });

      const miniProgramLabel = node.querySelector("[data-export-mini-label]");
      if (miniProgramLabel) miniProgramLabel.textContent = exportConfig.miniProgramLabel;
      const transferDescription = node.querySelector(".transfer-heading p");
      if (transferDescription) transferDescription.remove();
      const transferNote = node.querySelector(".transfer-note");
      if (transferNote) transferNote.remove();

      node.querySelectorAll(".paper").forEach((paper) => {
        paper.style.boxShadow = "none";
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
