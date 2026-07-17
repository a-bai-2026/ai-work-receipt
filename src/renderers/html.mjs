import { formatDate, formatDuration, formatNumber, formatTime } from "../lib/time.mjs";

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

export function renderHtml({ record, dataQrDataUrl, miniProgramCodeDataUrl = null }) {
  const startAt = new Date(record.period.start_at);
  const endAt = new Date(record.period.end_at);
  const timezone = record.period.timezone;
  const displayDate = formatDate(endAt, timezone);
  const businessHours = `${formatTime(startAt, timezone)}—${formatTime(endAt, timezone)}`;
  const scopeLabel = record.source.scope === "latest" ? "最近一次会话" : "今日全部会话";
  const modelLabel = record.stats.models.length ? record.stats.models.join(" / ") : "未记录";
  const receiptNumber = `${record.id.slice(4, 12).toUpperCase()}-${String(record.stats.completed_turns).padStart(3, "0")}`;
  const compensation = record.presentation.compensation || {
    label: record.source.scope === "latest" ? "本单工资" : "本日工资",
    amount: 0,
    unit: "AI 工分",
  };
  const rows = [
    receiptRow("统计范围", scopeLabel),
    receiptRow("会话数量", `${formatNumber(record.stats.session_count)} 场`),
    receiptRow("完成轮次", `${formatNumber(record.stats.completed_turns)} 轮`),
    receiptRow("用户消息", `${formatNumber(record.stats.user_messages)} 条`),
    receiptRow("工具调用", `${formatNumber(record.stats.tool_calls)} 次`),
    receiptRow("消耗 Token", formatNumber(record.stats.tokens.total_tokens), true),
    receiptRow("其中缓存输入", formatNumber(record.stats.tokens.cached_input_tokens)),
    receiptRow("被人类打断", `${formatNumber(record.stats.interruptions)} 次`),
    receiptRow("平均首次响应", `${(record.stats.average_first_token_ms / 1000).toFixed(1)} 秒`),
    receiptRow("AI 工作时长", formatDuration(record.stats.work_duration_ms), true),
  ].join("");

  const miniProgramVisual = miniProgramCodeDataUrl
    ? `<img src="${miniProgramCodeDataUrl}" alt="微信小程序码">`
    : `<div class="mini-placeholder" role="img" aria-label="小程序码待接入"><span>小程序码</span><strong>待接入</strong></div>`;

  return `<!doctype html>
<html lang="zh-CN" data-theme="${escapeHtml(record.presentation.default_theme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex AI 打工小票 · ${escapeHtml(displayDate)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #171713;
      --paper: #fffef4;
      --desk: #d9d7cb;
      --desk-soft: #cfcdc1;
      --muted: #68675f;
      --line: rgba(23, 23, 19, .42);
      --accent: rgba(23, 23, 19, .055);
      --shadow: rgba(31, 30, 24, .18);
      --mark-bg: transparent;
      --mark-fg: var(--ink);
    }
    html[data-theme="diner"] {
      --ink: #7f1e18;
      --paper: #fff8e8;
      --desk: #d8a58e;
      --desk-soft: #f0d4bd;
      --muted: #9a4b3e;
      --line: rgba(127, 30, 24, .42);
      --accent: rgba(198, 54, 38, .08);
      --shadow: rgba(89, 34, 24, .2);
      --mark-bg: #bd2f23;
      --mark-fg: #fff8e8;
    }
    html[data-theme="payroll"] {
      --ink: #183d67;
      --paper: #f4f9ff;
      --desk: #aebdcb;
      --desk-soft: #dbe5ee;
      --muted: #53718f;
      --line: rgba(24, 61, 103, .38);
      --accent: rgba(40, 104, 166, .075);
      --shadow: rgba(28, 52, 79, .18);
      --mark-bg: #183d67;
      --mark-fg: #f4f9ff;
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
    .theme-switcher {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 22px;
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
      height: 48px;
      margin: 18px auto 8px;
      max-width: 280px;
      background: repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 5px, transparent 5px 8px);
      opacity: .84;
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
    <nav class="theme-switcher" aria-label="小票主题">
      <button class="theme-button" type="button" data-theme-value="classic">经典热敏</button>
      <button class="theme-button" type="button" data-theme-value="diner">餐馆结账</button>
      <button class="theme-button" type="button" data-theme-value="payroll">办公室工资条</button>
    </nav>

    <article class="paper receipt" aria-label="Codex AI 打工小票">
      <header class="brand">
        <div class="brand-mark">C</div>
        <h1>AI 打工小票</h1>
        <p class="subtitle">CODEX WORK RECEIPT</p>
      </header>

      <section class="meta">
        <div>日期：${escapeHtml(displayDate)}</div>
        <div>营业时段：${escapeHtml(businessHours)}</div>
        <div>小票编号：${escapeHtml(receiptNumber)}</div>
        <div>时区：${escapeHtml(timezone)}</div>
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
          <strong>${escapeHtml(formatNumber(compensation.amount))}<small>${escapeHtml(compensation.unit)}</small></strong>
        </div>
      </section>
      <div class="barcode" aria-hidden="true"></div>
      <footer class="footer">
        <div>MODEL · ${escapeHtml(modelLabel)}</div>
        <div>谢谢惠顾，欢迎明天继续改需求</div>
      </footer>
    </article>

    <section class="paper transfer-stub" aria-label="传到手机导入联">
      <header class="transfer-heading">
        <h2>传到手机 · LOCAL TRANSFER</h2>
        <p>主小票保持完整，这一联只负责打开小程序和搬运数据</p>
      </header>
      <div class="qr-grid">
        <div class="qr-item">
          <div class="qr-frame">${miniProgramVisual}</div>
          <strong>1 · 打开小程序</strong>
          <span>正式小程序码接入后替换此处</span>
        </div>
        <div class="qr-item">
          <div class="qr-frame"><img src="${dataQrDataUrl}" alt="当前小票数据二维码"></div>
          <strong>2 · 扫描导入数据</strong>
          <span>在小程序里点击“从电脑导入”后扫描</span>
        </div>
      </div>
      <p class="transfer-note">数据码只包含时间、轮次、Token和工具调用等统计，不包含Prompt、回复正文、代码、项目路径或文件名。</p>
    </section>

    <p class="privacy">结构数据同时保存在本机，未来可以批量导入小程序历史记录。</p>
  </main>
  <script>
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
  </script>
</body>
</html>`;
}
