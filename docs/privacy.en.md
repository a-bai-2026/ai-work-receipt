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

Generated HTML and JSON files are written to `codex-work-receipt-output/` by default. Deduplicated history is stored under `~/.codex-work-receipt/`. Use `--output` and `--data-dir` to change these locations.

The runtime does not upload Codex session data to a project server. The initial or updated package download performed by `npx` is a normal package-manager network request and does not contain local session data.

If the user actively scans a data QR code, the companion mini program saves the privacy-safe receipt to the user's anonymous account database for history recovery and canonical deduplication. This happens inside the companion product and does not upload prompts, response text, source code, project paths, file names, or original session IDs. Joining AI Cooperative aggregate statistics remains a separate user choice.

## QR payload

The QR code contains versioned, privacy-safe receipt metrics only. It does not contain the original session or an image. Treat the QR code as a scannable data file and share it only with people you trust.

See the [data schema and QR protocol](data-schema.en.md).
