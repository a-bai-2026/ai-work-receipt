# Codex Work Receipt

<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>Turn local Codex activity into a work receipt you can keep and share.</strong><br>
  One command · Local-first · Chinese & English · Three themes · Mobile QR import
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

## Quickstart

Requires Node.js 20+ and local Codex session records. No clone required; choose today, the last 7 days, this week, or a specific session:

```bash
npx codex-work-receipt@latest --lang en
```

Summarize all Codex activity from today:

```bash
npx codex-work-receipt@latest --today --lang en
```

HTML and structured data are written to `./codex-work-receipt-output/` by default. The generated page can save a high-resolution PNG containing the full receipt and QR import stub. Non-interactive options such as `--latest` and `--today` remain available; see the [CLI guide](docs/cli.en.md).

## Ask Codex directly

Install the AI Work Receipt skill once:

```bash
npx codex-work-receipt@latest --install-skill --lang en
```

Then ask Codex:

> Create an AI work receipt for my latest Codex session.

Codex will choose the range and theme, run the CLI, and open the receipt. See the [Codex Skill guide](docs/codex-skill.en.md).

## Desktop to mobile

The desktop page generates a privacy-safe data QR code. The companion WeChat mini program supports QR import, local history, themes, and image export. See [mobile import](docs/mobile-import.en.md).

## Docs

- [CLI usage and options](docs/cli.en.md)
- [Codex Skill](docs/codex-skill.en.md)
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
