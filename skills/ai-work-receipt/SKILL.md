---
name: ai-work-receipt
description: Generate and open a privacy-first local AI work receipt from Codex session metadata. Use when the user asks Codex or 票仔 to create, regenerate, open, or locate an “AI 打工小票”, “工票”, or “AI work receipt” for the latest session, the last few hours, today, the last seven days, or this week, in Chinese or English. Do not use for real invoices, salary calculations, API billing, or non-Codex activity.
---

# AI 打工小票

Use the published `codex-work-receipt` CLI as the only statistics and rendering engine. Execute the command for the user instead of merely describing it. Do not reimplement or inspect Codex session parsing yourself.

## Interpret the request

- Use `--latest` for “刚刚”“这次”“最近一次”“上一段工作” or an unspecified request for one receipt.
- Use `--hours <N>` for “最近 N 小时”“过去 N 小时” or “近 N 小时”. Accept integers from 1 to 168.
- Use `--hours 3` for an unspecified “最近几个小时”“过去几个小时” request.
- Use `--hours 12` for “最近半天”.
- Treat `--hours` receipts as rolling summaries for private history only. They do not participate in AI Work Cooperative accounting; if the user asks for an accountable cooperative receipt, use today, this week, the last seven days, or a specific session instead.
- Use `--today` for “今天”“今日”“今天全部工作” or a daily summary.
- Use `--range last-7-days` for “最近七天”“近 7 日” or a rolling seven-calendar-day summary.
- Use `--range this-week` for “本周”“这周” or a Monday-to-now summary.
- Use `--theme classic` for “经典白票” or no specified theme.
- Use `--theme diner` for “复古粉票”“粉色小票” or “diner”.
- Use `--theme payroll` for “夜班绿票”“绿色小票” or “payroll”.
- Add `--no-open` only when the user asks not to open the browser.
- Add `--timezone <IANA name>` only when the user explicitly requests another timezone.
- Use `--lang en` when the user requests English or asks for the receipt in English. Use `--lang zh-CN` otherwise.
- If the user asks to choose interactively, run the CLI without a range flag so it can show the local selector.
- If the user asks for an unsupported custom date range, explain the available ranges and do not invent flags.
- Treat requests addressed to “票仔” the same as direct AI work receipt requests, for example “票仔，开今天的票”.

## Execute

1. Check `node --version`. Require Node.js 20 or newer. If it is missing or older, report the requirement and stop.
2. Run from the user's current working directory:

```bash
npx --yes codex-work-receipt@latest --latest --lang zh-CN --theme classic
```

Replace only the mode and optional flags according to the request.

3. Let the CLI open the generated HTML unless the user requested `--no-open`.
4. On success, report both the HTML path and the `.cwr.json` WeChat import file path. Tell the user to send the import file to WeChat File Transfer, open the official mini program, and choose “Import from chat file”. If the CLI reports that a single data QR is available, mention scanning as an optional shortcut; never instruct the user to scan multipart codes.
5. When `--hours` was used, explicitly state that the receipt is a private rolling summary and will not enter AI Work Cooperative statistics.

## Privacy and failures

- Do not read, quote, summarize, or expose prompt text, response text, code, project paths, or file names from Codex sessions.
- Do not upload session data or add custom mini-program codes. The CLI reads numerical metadata locally and uses the fixed official mini-program code. Sending the privacy-safe `.cwr.json` file through WeChat is an explicit user action, not an automatic CLI upload.
- If `npx` needs network permission to fetch the package, request the narrow permission needed to run it.
- If no Codex session is found, report that the user must complete at least one Codex task locally before generating a receipt.
- If generation fails, return the CLI error concisely and do not claim that a receipt was created.
