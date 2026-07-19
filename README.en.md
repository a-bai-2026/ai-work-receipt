# Codex Work Receipt

<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>Turn local Codex activity into a work receipt you can keep and share.</strong><br>
  One command · Local-first · Codex pet · Three themes · Mobile QR import
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/codex-work-receipt"><img alt="npm" src="https://img.shields.io/npm/v/codex-work-receipt?color=42CDA7"></a>
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-17231F">
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-42CDA7">
</p>

<p align="center">
  <img src="docs/images/readme-hero.jpg" alt="Three Codex Work Receipt themes" width="920">
</p>

Codex Work Receipt summarizes turns, tool calls, Tokens, duration, and models, then turns them into playful AI work points, a job title, and a review. Receipts never include prompts, responses, source code, project paths, or file names.

Version `0.6.0` uses the cwr2 protocol to create stable privacy-safe facts for each session and calendar day. Overlapping today, last-seven-days, and this-week receipts can be deduplicated by the receiver, and oversized payloads are automatically split into reorderable multipart QR codes that rotate one at a time in the HTML so the camera never sees multiple data codes at once.

## Meet Ticket Buddy

<p align="center">
  <a href="docs/codex-pet.en.md"><img src="docs/images/codex-pet-showcase.png" alt="Ticket Buddy in idle, working, needs-input, ready, and failed states" width="920"></a>
</p>

<p align="center">
  <sub>Ticket Buddy changes expression as Codex becomes idle, runs a task, needs input, finishes, or gets blocked. Select the image for setup and state details.</sub>
</p>

## Quickstart

Requires Node.js 20+ and local Codex session records. No clone required; choose today, the last 3 hours, the last 7 days, this week, or a specific session:

```bash
npx codex-work-receipt@latest --lang en
```

Summarize all Codex activity from today:

```bash
npx codex-work-receipt@latest --today --lang en
```

Summarize the last 3 hours:

```bash
npx codex-work-receipt@latest --hours 3 --lang en
```

HTML and structured data are written to `./codex-work-receipt-output/` by default. The generated page can save a high-resolution PNG containing only the full receipt and WeChat mini-program code; data QR codes are excluded. Non-interactive options such as `--latest` and `--today` remain available; see the [CLI guide](docs/cli.en.md).

## Ask Codex directly

Install the AI Work Receipt skill and Ticket Buddy Codex pet together:

```bash
npx codex-work-receipt@latest --install-companion --lang en
```

Restart Codex, open `Settings > Pets`, select Refresh, choose “票仔 · AI 小票工” (Ticket Buddy), and use `/pet` to wake it. Then ask:

> Ticket Buddy, create today's receipt.

> Ticket Buddy, create a receipt for the last three hours.

To install only the skill:

```bash
npx codex-work-receipt@latest --install-skill --lang en
```

Then ask Codex:

> Create an AI work receipt for my latest Codex session.

Codex will choose the range and theme, run the CLI, and open the receipt. See the [Codex Skill guide](docs/codex-skill.en.md).

## Desktop to mobile

The desktop page generates one or more privacy-safe data QR codes. The companion WeChat mini program supports multipart scanning, private history, themes, and image export. See [mobile import](docs/mobile-import.en.md).

## Docs

- [CLI usage and options](docs/cli.en.md)
- [Codex Skill](docs/codex-skill.en.md)
- [Ticket Buddy Codex pet](docs/codex-pet.en.md)
- [Mobile QR import](docs/mobile-import.en.md)
- [Data schema and QR protocol](docs/data-schema.en.md)
- [Local data and privacy](docs/privacy.en.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## Sponsor

<p align="center">
  <a href="https://modelflare.dev/"><img src="docs/images/sponsors/modelflare-logo.png" alt="ModelFlare Logo" width="56"></a><br>
  <a href="https://modelflare.dev/"><strong>ModelFlare</strong></a> · <a href="https://modelflare.dev/">modelflare.dev</a><br>
  <sub>Helping independent developers access leading AI model APIs reliably and at a very low cost, so they can quickly build their own products with advanced model capabilities.</sub>
</p>

## License

The desktop source is licensed under [GNU GPL v3](LICENSE) (`GPL-3.0-only`). This is an unofficial community project and is not affiliated with OpenAI.

---

<p align="center">
  <strong>If the receipt made you smile, consider leaving a Star.</strong>
</p>
