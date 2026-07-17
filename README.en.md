# Codex Work Receipt

<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>Turn local Codex activity into a work receipt you can keep and share.</strong><br>
  One command · Local-first · Three themes · Mobile QR import
</p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-17231F">
  <img alt="Privacy first" src="https://img.shields.io/badge/privacy-no%20prompts%20or%20code-42CDA7">
</p>

<p align="center">
  <img src="docs/images/readme-hero.jpg" alt="Three Codex Work Receipt themes" width="920">
</p>

The tool reads timestamps and numerical metadata from local Codex sessions. Generated receipts do not contain prompts, responses, source code, project paths, or file names.

## Sponsor

<p align="center">
  <a href="https://modelflare.dev/">
    <img src="docs/images/sponsors/modelflare.jpg" alt="Modelflare" width="760">
  </a>
</p>

<p align="center">
  Thanks to <a href="https://modelflare.dev/"><strong>Modelflare</strong></a> for supporting this project.<br>
  <sub>Stable API access to leading AI models, with broad model coverage, clear pricing, and usage visibility.</sub>
</p>

## Receipt themes

<table>
  <tr>
    <td align="center"><strong>Classic</strong></td>
    <td align="center"><strong>Vintage Diner</strong></td>
    <td align="center"><strong>Night Payroll</strong></td>
  </tr>
  <tr>
    <td><img src="docs/images/receipts/receipt-classic.jpg" alt="Classic work receipt" width="320"></td>
    <td><img src="docs/images/receipts/receipt-diner.jpg" alt="Vintage diner work receipt" width="320"></td>
    <td><img src="docs/images/receipts/receipt-payroll.jpg" alt="Night payroll work receipt" width="320"></td>
  </tr>
</table>

## Quick start

Requires Node.js 20+ and local Codex session records.

```bash
npx codex-work-receipt@latest --latest
```

Summarize all Codex activity from today in your local timezone:

```bash
npx codex-work-receipt@latest --today
```

Outputs are written to `./codex-work-receipt-output/` by default.

## Desktop-to-mobile flow

```text
Local Codex sessions
  → run one command
  → generate an HTML receipt and data QR code
  → scan from the companion mini program
  → change themes, save, and share
```

The companion mini program supports QR import, local history, themes, and image export. It is a separate mobile product: **this repository does not include its source code, AppID, backend, or service credentials**.

## Features

- Latest-session and today summaries
- Three visual receipt themes
- Turns, user messages, tool calls, interruptions, Tokens, duration, and models
- Playful AI work points, job titles, and reviews
- Versioned `cwr1` QR payload for mobile import
- Local JSON snapshots and deduplicated history
- No prompt, response, code, path, or file-name export

## Common options

```bash
npx codex-work-receipt@latest --latest --theme diner
npx codex-work-receipt@latest --latest --no-open
npx codex-work-receipt@latest --today --timezone Asia/Shanghai --output ./my-receipt.html
```

Use a custom mini-program code image:

```bash
npx codex-work-receipt@latest --latest \
  --miniprogram-code /absolute/path/to/miniprogram-code.png
```

Run `npx codex-work-receipt@latest --help` for the full option list.

## Privacy

- Reads `~/.codex/sessions/**/*.jsonl` by default
- Extracts event types, timestamps, model names, and numerical statistics only
- Does not store prompts, responses, source code, project paths, or file names
- Does not send session data over the network while running
- Saves HTML and structured history locally

See [docs/privacy.md](docs/privacy.md) and [docs/data-schema.md](docs/data-schema.md).

## Open-source boundary

This repository contains the desktop CLI, receipt renderer, QR data protocol, tests, and documentation. It does not contain the companion mini-program source code or server implementation.

## Local development

```bash
git clone https://github.com/a-bai-2026/ai-work-receipt.git
cd codex-work-receipt
npm install
npm test
npm run receipt -- --latest
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before contributing. Never submit real Codex sessions.

## Roadmap

- More receipt themes
- Cursor and WorkBuddy data sources
- Cross-tool activity reports
- Weekly and monthly AI work archives
- More parser fixtures and end-to-end compatibility tests

## License and disclaimer

- The desktop source code in this repository is licensed under [GNU GPL v3](LICENSE) (`GPL-3.0-only`)
- Modified or redistributed versions must continue to comply with GPLv3 and provide the corresponding source code
- GPLv3 applies only to the desktop project in this repository; it does not cover the companion mini program, backend services, or other independent products
- This is an unofficial community project and is not affiliated with or endorsed by OpenAI
- Codex and other product names belong to their respective owners
- Modelflare sponsorship is independent from receipt statistics, local data processing, and model configuration

---

<p align="center">
  <strong>If the receipt made you smile, consider leaving a Star.</strong>
</p>
