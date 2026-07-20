import { createInterface } from "node:readline/promises";

function formatSessionDate(value, timezone, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function sessionLine(session, index, timezone, locale) {
  const start = formatSessionDate(session.startAt, timezone, locale);
  const end = formatSessionDate(session.endAt, timezone, locale);
  const model = session.model || (locale === "en" ? "model unknown" : "模型未记录");
  if (locale === "en") {
    return `${index + 1}. ${start}–${end} · ${session.completedTurns} turns · ${session.toolCalls} tool calls · ${model}`;
  }
  return `${index + 1}. ${start}–${end} · ${session.completedTurns} 轮 · ${session.toolCalls} 次工具调用 · ${model}`;
}

async function askForNumber(readline, prompt, minimum, maximum, fallback = null) {
  while (true) {
    const answer = (await readline.question(prompt)).trim();
    if (!answer && fallback !== null) return fallback;
    const value = Number(answer);
    if (Number.isInteger(value) && value >= minimum && value <= maximum) return value;
  }
}

export async function promptForRange({ locale, timezone, loadRecentSessions }) {
  const isEnglish = locale === "en";
  const readline = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(isEnglish ? "\nChoose a receipt range:\n" : "\n请选择小票统计范围：\n");
    console.log(isEnglish ? "1. All activity today (recommended)" : "1. 今天全部活动（推荐）");
    console.log(isEnglish
      ? "2. Last 3 hours (private rolling summary; not counted by the cooperative)"
      : "2. 最近 3 小时（私人滚动摘要，不计入供销社）");
    console.log(isEnglish ? "3. Last 7 calendar days" : "3. 最近 7 个自然日");
    console.log(isEnglish ? "4. This week (Monday to now)" : "4. 本周（周一至今）");
    console.log(isEnglish ? "5. Choose a specific session" : "5. 选择一个具体会话");

    const choice = await askForNumber(
      readline,
      isEnglish ? "\nEnter 1–5 (default 1): " : "\n请输入 1–5（默认 1）：",
      1,
      5,
      1,
    );

    if (choice === 1) return { mode: "today", sessionId: null };
    if (choice === 2) return { mode: "last-hours", sessionId: null, hours: 3 };
    if (choice === 3) return { mode: "last-7-days", sessionId: null };
    if (choice === 4) return { mode: "this-week", sessionId: null };

    const sessions = await loadRecentSessions();
    if (!sessions.length) throw new Error(isEnglish ? "No Codex sessions found" : "没有找到可选择的 Codex 会话");

    console.log(isEnglish ? "\nRecent sessions:\n" : "\n最近的会话：\n");
    sessions.forEach((session, index) => console.log(sessionLine(session, index, timezone, locale)));
    const sessionChoice = await askForNumber(
      readline,
      isEnglish ? `\nEnter 1–${sessions.length}: ` : `\n请输入 1–${sessions.length}：`,
      1,
      sessions.length,
    );
    return { mode: "session", sessionId: sessions[sessionChoice - 1].sessionId };
  } finally {
    readline.close();
  }
}
