# CLI guide

<p><a href="./cli.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

## Requirements

- Node.js 20 or later
- Local Codex session records under `~/.codex/sessions/`

No clone or global installation is required.

## Interactive range selector

Run:

```bash
npx codex-work-receipt@latest --lang en
```

Choose all activity today, the last 3 hours, the last 7 calendar days, this week, or a specific recent session. Session choices include their time range, turns, tool calls, and model for identification.

## Non-interactive ranges

Summarize the latest active session and open the receipt:

```bash
npx codex-work-receipt@latest --latest --lang en
```

Summarize all Codex activity from today in your local timezone:

```bash
npx codex-work-receipt@latest --today --lang en
```

Summarize the last 3 hours:

```bash
npx codex-work-receipt@latest --hours 3 --lang en
```

`--hours` accepts an integer from 1 to 168 and filters exact timestamps, including windows that cross midnight. Rolling-hour receipts use the compatible cwr1 summary protocol and do not create cwr2 session-day canonical facts.

Last 7 calendar days, including today:

```bash
npx codex-work-receipt@latest --range last-7-days --lang en
```

Monday through now:

```bash
npx codex-work-receipt@latest --range this-week --lang en
```

## Language and themes

Generate a Chinese receipt:

```bash
npx codex-work-receipt@latest --latest --lang zh-CN
```

Choose the initial theme:

```bash
npx codex-work-receipt@latest --latest --lang en --theme diner
```

Available themes:

- `classic`: classic white receipt
- `diner`: vintage pink diner receipt
- `payroll`: dark-green night payroll receipt

Themes can still be switched in the generated page without changing the metrics.

## Output

Default output:

```text
./codex-work-receipt-output/
├── codex-receipt-today-2026-07-18.html
└── codex-receipt-today-2026-07-18.json
```

Default filenames include the calendar range. Latest-session and selected-session receipts include a short identifier so receipts from different dates or sessions do not overwrite one another.

Open the generated HTML and click “Save full PNG” to download a high-resolution image. It includes the main receipt, mini-program code, and data QR import stub in the currently selected theme. Theme controls, the page background, and the footer note are excluded. With one data QR, the mini-program code and data code remain side by side. When cwr2 exceeds the safe capacity of one QR code, the page shows the mini-program code first and then rotates multipart data codes one at a time without desktop clicks. The full PNG still includes every numbered part so the offline payload remains complete.

Set a timezone and output path:

```bash
npx codex-work-receipt@latest --today --lang en \
  --timezone Asia/Shanghai \
  --output ./my-receipt.html
```

Generate files without opening a browser:

```bash
npx codex-work-receipt@latest --latest --lang en --no-open
```

## Options

| Option | Description |
| --- | --- |
| `--range <name>` | `latest`, `last-hours`, `today`, `last-7-days`, or `this-week` |
| `--hours <number>` | Summarize the last 1-168 hours |
| `--latest` | Summarize the latest active Codex session; default mode |
| `--today` | Summarize activity from today in the selected timezone |
| `--session <id>` | Summarize one specific Codex session |
| `--timezone <name>` | Set an IANA timezone such as `Asia/Shanghai` |
| `--lang <name>` | `zh-CN` (default) or `en` |
| `--theme <name>` | `classic`, `diner`, or `payroll` |
| `--output <file>` | Set the HTML output path |
| `--data-dir <directory>` | Set the local structured-history directory |
| `--install-skill` | Install the Codex AI Work Receipt skill |
| `--install-pet` | Install only the Ticket Buddy Codex pet |
| `--uninstall-pet` | Remove Ticket Buddy without deleting the skill or receipts |
| `--install-companion` | Install both the skill and Ticket Buddy Codex pet |
| `--no-open` | Do not open the generated page |

Run the built-in help at any time:

```bash
npx codex-work-receipt@latest --help
```

## Local history

Each run creates or updates:

- `codex-work-receipt-output/codex-receipt-*.html`: theme-switchable receipt page
- `codex-work-receipt-output/codex-receipt-*.json`: versioned receipt data
- `~/.codex-work-receipt/receipts/*.json`: local snapshots
- `~/.codex-work-receipt/latest.json`: latest receipt
- `~/.codex-work-receipt/history.jsonl`: deduplicated local history

See the [data schema and QR protocol](data-schema.en.md).

## Current limitations

- Codex is the only supported data source; Cursor and WorkBuddy are planned
- Changed-file and line counts are intentionally omitted until they can be measured consistently
- Calendar ranges filter events by local date, rolling-hour ranges use exact timestamps, and both calculate per-session Token deltas
- Desktop PNG export is rendered locally in the browser and does not upload receipt data
