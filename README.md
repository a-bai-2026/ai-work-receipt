# Codex AI 打工小票

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>把本机 Codex 的工作记录，开成一张可以带走的 AI 打工小票。</strong><br>
  一行命令 · 完全本地 · 中英双语 · 三种主题 · 扫码传到手机
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/codex-work-receipt"><img alt="npm" src="https://img.shields.io/npm/v/codex-work-receipt?color=42CDA7"></a>
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-17231F">
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-42CDA7">
</p>

<p align="center">
  <img src="docs/images/readme-hero.jpg" alt="Codex AI 打工小票三种主题效果" width="920">
</p>

它会统计 Codex 会话中的轮次、工具调用、Token、时长和模型，生成带有 AI 工分、今日工种和点评的小票。不会把 Prompt、回复正文、代码、项目路径或文件名写入小票。

## Quickstart

需要 Node.js 20 或更高版本，并且本机已经使用过 Codex。无需克隆仓库：

```bash
npx codex-work-receipt@latest --latest
```

汇总今天的全部 Codex 活动：

```bash
npx codex-work-receipt@latest --today
```

网页和结构数据默认保存在 `./codex-work-receipt-output/`。主题、英文小票、时区和输出路径等参数见 [CLI 使用文档](docs/cli.md)。

## 直接跟 Codex 说

安装一次 AI 打工小票 Skill：

```bash
npx codex-work-receipt@latest --install-skill
```

以后可以直接对 Codex 说：

> 给刚刚这次工作开一张 AI 打工小票。

Codex 会选择统计范围和主题、执行命令并打开小票。详见 [Codex Skill 使用文档](docs/codex-skill.md)。

## 从电脑到手机

桌面网页会生成脱敏的数据二维码。配套微信小程序支持扫码导入、本地历史、主题切换和保存图片。详见 [手机扫码导入](docs/mobile-import.md)。

## 文档

- [CLI 使用与全部参数](docs/cli.md)
- [Codex Skill](docs/codex-skill.md)
- [手机扫码导入](docs/mobile-import.md)
- [数据结构与二维码协议](docs/data-schema.md)
- [本地数据与隐私说明](docs/privacy.md)
- [参与贡献](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新日志](CHANGELOG.md)

## 赞助商

<p align="center">
  <a href="https://modelflare.dev/"><img src="docs/images/sponsors/modelflare-logo.png" alt="ModelFlare Logo" width="56"></a><br>
  <a href="https://modelflare.dev/"><strong>ModelFlare</strong></a> · <a href="https://modelflare.dev/">modelflare.dev</a><br>
  <sub>以很低的成本稳定接入前沿 AI 模型 API，价格友好、计费透明、用量清晰可见。</sub>
</p>

## License

电脑端源码采用 [GNU GPL v3](LICENSE)（`GPL-3.0-only`）。本仓库不包含配套小程序和后台服务源码；本项目是非 OpenAI 官方社区工具。

---

<p align="center">
  <strong>如果这张小票让你觉得有点意思，欢迎点一个 Star。</strong>
</p>
