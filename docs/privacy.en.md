# Local data and privacy

<p><a href="./privacy.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

AI Work Receipt reads Codex sessions, computes metrics, and renders receipts locally.

## What it reads

- `~/.codex/sessions/**/*.jsonl` by default
- Event types, timestamps, model names, and numerical metadata
- Metrics such as turns, tool calls, Tokens, duration, and interruptions

Session logs are parsed locally in bounded chunks, one JSONL row at a time. After each row is parsed, only fields needed for metrics remain in memory; prompts, responses, images, and tool output are discarded from the in-memory statistics representation.

## What receipts exclude

- Prompts and response text
- Source code
- Project paths and file names
- API keys, account credentials, and environment variables

## Where data is saved

Generated HTML, full JSON, and privacy-safe `.cwr.json` WeChat import files are written to `codex-work-receipt-output/` by default. Deduplicated history is stored under `~/.codex-work-receipt/`. Use `--output` and `--data-dir` to change these locations.

The runtime does not upload Codex session data to a project server. The initial or updated package download performed by `npx` is a normal package-manager network request and does not contain local session data.

If the user actively sends a `.cwr.json` file to a WeChat chat, that file passes through WeChat's file-transfer system. The user can then select it in the companion mini program, preview it, and save it to the anonymous account database for history recovery and canonical deduplication. The file excludes prompts, response text, source code, project paths, file names, and original session IDs. Joining AI Cooperative aggregate statistics remains a separate user choice.

## Automatic saving

Automatic saving is an explicit opt-in local feature. Enabling it:

- safely merges one Codex `Stop` hook into `~/.codex/hooks.json`
- stores a stable offline runtime under `~/.codex-work-receipt/runtime/`
- quietly refreshes the daily HTML, full JSON, and `.cwr.json` under `~/.codex-work-receipt/auto/YYYY-MM-DD/`
- stores the selected mode and latest run state in `config.json` and `auto-state.json`

The hook input includes the session identifier and event name supplied by Codex. The trigger script uses them only to confirm a valid `Stop` event; receipt statistics still use the existing local privacy-filtering parser. The hook does not upload sessions, send WeChat files, or continuously monitor other applications. Each trigger starts one short-lived local process that exits after generation.

Switching to manual-only mode removes this tool's hook without deleting receipt history or changing unrelated hooks. An existing `hooks.json` is backed up before changes. If it is not valid JSON, setup stops instead of replacing it. Codex also asks users to review non-managed hooks through its own hook trust flow.

## Import files and QR payloads

The import file and optional single data QR contain versioned, privacy-safe receipt metrics only. They do not contain the original session or an image. Scan import appears only when the complete payload fits in one code; the desktop no longer creates new multipart QR codes. Send files only to chats you trust and show data codes only to people you trust.

Automatic mode does not generate a data QR. It maintains only the `.cwr.json` import file that the user may choose to send through WeChat.

See the [data schema, file, and QR protocol](data-schema.en.md).
