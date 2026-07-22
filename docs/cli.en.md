# CLI guide

<p><a href="./cli.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

## Requirements

- Node.js 20 or later
- Local Codex session records under `~/.codex/sessions/`

No clone or global installation is required.

## Interactive mode and range selector

Run:

```bash
npx codex-work-receipt@latest --lang en
```

The first interactive run asks you to choose:

- `Automatic saving`: quietly refresh today's receipt and `.cwr.json` WeChat import file whenever a Codex turn stops
- `Manual only`: generate only when you run the command or ask Ticket Buddy

After choosing manual-only mode, choose all activity today, the last 3 hours, the last 7 calendar days, this week, or a specific recent session. Session choices include their time range, turns, tool calls, and model for identification. Explicit range flags such as `--today` and `--latest` never trigger mode setup.

## Automatic saving

Open the mode selector again:

```bash
npx codex-work-receipt@latest --setup --lang en
```

Enable, switch to manual-only mode, or inspect status directly:

```bash
npx codex-work-receipt@latest --enable-auto --lang en
npx codex-work-receipt@latest --disable-auto --lang en
npx codex-work-receipt@latest --auto-status --lang en
```

Automatic saving uses a user-level Codex `Stop` hook. When a turn stops, the hook launches one short-lived local generation process. It does not use a timer, idle detection, or a persistent watcher. Nearby triggers are coalesced, and a local lock protects concurrent generation.

Automatic mode refreshes only the today range. It does not open a browser, print routine prompts, or generate a data QR. Each refresh updates:

```text
~/.codex-work-receipt/auto/YYYY-MM-DD/
├── codex-receipt-today-YYYY-MM-DD.html
├── codex-receipt-today-YYYY-MM-DD.json
└── codex-receipt-today-YYYY-MM-DD.cwr.json
```

The `.cwr.json` file is the mobile import path for automatic receipts. Send it to WeChat File Transfer, then choose “Import from chat file” in the mini program. Automatic saving never sends or uploads the file itself.

Enabling automatic saving installs a stable offline runtime under `~/.codex-work-receipt/runtime/` and safely merges `~/.codex/hooks.json`. Existing hook configuration is backed up first. If the current file cannot be parsed, setup stops instead of replacing it. Restart Codex and use `/hooks` to inspect and trust the hook if prompted. Manual-only mode removes only this tool's hook while preserving history, the local runtime, and unrelated hooks. After upgrading the npm package, run `--enable-auto` again to refresh the local runtime; repeated setup does not duplicate the hook.

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

`--hours` accepts an integer from 1 to 168 and filters exact timestamps, including windows that cross midnight. Rolling-hour receipts use the compatible cwr1 summary protocol, stay in private history, and do not participate in AI Work Cooperative accounting. Use today, this week, the last seven days, or a specific session for cwr2 session-day canonical facts.

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
├── codex-receipt-today-2026-07-18.json
└── codex-receipt-today-2026-07-18.cwr.json
```

Default filenames include the calendar range. Latest-session and selected-session receipts include a short identifier so receipts from different dates or sessions do not overwrite one another.

In the generated HTML:

- “Download WeChat import file” downloads the same `.cwr.json` file. Send it to WeChat File Transfer, then choose “Import from chat file” in the mini program.
- “Or import by scanning” appears only when the complete payload safely fits in one data QR code. The desktop no longer generates multipart QR codes.
- “Save full PNG” downloads a high-resolution image containing only the complete receipt and WeChat mini-program code. File controls, data QR codes, theme controls, the page background, and footer notes are excluded.

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
| `--setup` | Interactively choose automatic saving or manual-only mode |
| `--enable-auto` | Install the local runtime and Codex hook, then enable automatic saving |
| `--disable-auto` | Remove this tool's hook and switch to manual-only mode |
| `--auto-status` | Show the mode, runtime, hook, and latest automatic-run status |
| `--no-open` | Do not open the generated page |

Run the built-in help at any time:

```bash
npx codex-work-receipt@latest --help
```

## Local history

Each run creates or updates:

- `codex-work-receipt-output/codex-receipt-*.html`: theme-switchable receipt page
- `codex-work-receipt-output/codex-receipt-*.json`: versioned receipt data
- `codex-work-receipt-output/codex-receipt-*.cwr.json`: privacy-safe file to send through WeChat and select in the mini program
- `~/.codex-work-receipt/receipts/*.json`: local snapshots
- `~/.codex-work-receipt/latest.json`: latest receipt
- `~/.codex-work-receipt/history.jsonl`: deduplicated local history
- `~/.codex-work-receipt/config.json`: automatic or manual-only configuration
- `~/.codex-work-receipt/auto-state.json`: latest automatic-run status
- `~/.codex-work-receipt/auto/YYYY-MM-DD/`: automatically refreshed daily HTML, JSON, and WeChat import file

See the [data schema, file, and QR protocol](data-schema.en.md).

## Current limitations

- Codex is the only supported data source; Cursor and WorkBuddy are planned
- Changed-file and line counts are intentionally omitted until they can be measured consistently
- Calendar ranges filter events by local date, rolling-hour ranges use exact timestamps, and both calculate per-session Token deltas
- Desktop PNG export is rendered locally in the browser and does not upload receipt data
- Automatic saving depends on a local Codex client firing the `Stop` hook; cloud tasks do not directly invoke the local hook
