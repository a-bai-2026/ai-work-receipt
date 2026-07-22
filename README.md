# Codex AI 打工小票

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>把本机 Codex 的工作记录，开成一张可以带走的 AI 打工小票。</strong><br>
  一行命令 · 完全本地 · Codex 桌宠 · 三种主题 · 微信聊天文件导入
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

cwr2 协议按“会话 × 自然日”生成稳定的脱敏事实。今日、近 7 日和本周小票即使范围重叠，接收端也能识别相同工作。每张小票还会生成一个 `.cwr.json` 微信导入文件；只有完整数据能放进一个二维码时，网页才额外提供扫码导入。

## 认识票仔

<p align="center">
  <a href="docs/codex-pet.md"><img src="docs/images/codex-pet-showcase.png" alt="票仔 AI 小票工的待机、打工、等待确认、完成和失败状态" width="920"></a>
</p>

<p align="center">
  <sub>票仔会跟随 Codex 的空闲、执行、等待确认、完成和失败状态切换表情。点击图片查看安装与状态说明。</sub>
</p>

## Quickstart

需要 Node.js 20 或更高版本，并且本机已经使用过 Codex。无需克隆仓库。首次交互式运行会先让你选择“自动保存”或“仅手动”；选择手动后，再选择“今天 / 最近 3 小时 / 近 7 日 / 本周 / 指定会话”：

```bash
npx codex-work-receipt@latest
```

汇总今天的全部 Codex 活动：

```bash
npx codex-work-receipt@latest --today
```

查看最近 3 小时的工作：

```bash
npx codex-work-receipt@latest --hours 3
```

“最近 N 小时”是滚动摘要，只用于查看和保存私人历史，不参与 AI 供销社的去重统计。需要进入供销社时，请生成“今日 / 本周 / 近 7 日 / 指定会话”小票。

网页、结构数据和微信导入文件默认保存在 `./codex-work-receipt-output/`。生成的网页支持一键下载 `.cwr.json`，也可以保存只包含完整小票和微信小程序码的高清长图。数据二维码不会进入图片。详见 [CLI 使用文档](docs/cli.md)。

## 自动保存或仅手动

自动保存使用 Codex 的 `Stop` Hook：每当 Codex 完成一轮工作，就在本机静默刷新当天同一张 HTML、完整 JSON 和 `.cwr.json` 微信导入文件。它不会打开浏览器、不会上传文件，也不会常驻监听进程。自动路径以微信文件导入为主，不生成数据二维码。

重新选择模式：

```bash
npx codex-work-receipt@latest --setup
```

也可以直接启用、关闭或检查自动保存：

```bash
npx codex-work-receipt@latest --enable-auto
npx codex-work-receipt@latest --disable-auto
npx codex-work-receipt@latest --auto-status
```

自动小票统一保存在 `~/.codex-work-receipt/auto/YYYY-MM-DD/`。切换为仅手动只会移除 AI 打工小票自己的 Hook，不会删除历史小票或其他 Codex Hook。安装 Hook 后请重启 Codex；如果 Codex 提示审查新 Hook，请使用 `/hooks` 确认并信任。Codex Hook 机制见 [官方文档](https://learn.chatgpt.com/docs/hooks)。

## 直接跟 Codex 说

一次安装 AI 打工小票 Skill 和“票仔”Codex 桌宠：

```bash
npx codex-work-receipt@latest --install-companion
```

重启 Codex 后，在 `Settings > Pets` 中点击 Refresh，选择“票仔 · AI 小票工”，再输入 `/pet` 唤醒。以后可以说：

> 票仔，开今天的票。

> 票仔，开最近三个小时的票。

如果只想安装 Skill：

```bash
npx codex-work-receipt@latest --install-skill
```

以后可以直接对 Codex 说：

> 给刚刚这次工作开一张 AI 打工小票。

Codex 会选择统计范围和主题、执行命令并打开小票。详见 [Codex Skill 使用文档](docs/codex-skill.md)。

## 从电脑到手机

桌面网页会生成一个脱敏 `.cwr.json` 文件。把它发送到微信文件传输助手后，可在配套小程序中通过“从聊天文件导入”选择；数据足够小时也可以使用唯一的数据二维码快速导入。详见 [手机导入](docs/mobile-import.md)。

## 文档

- [CLI 使用与全部参数](docs/cli.md)
- [Codex Skill](docs/codex-skill.md)
- [Codex 桌宠“票仔”](docs/codex-pet.md)
- [手机文件与单码导入](docs/mobile-import.md)
- [数据结构、文件与二维码协议](docs/data-schema.md)
- [本地数据与隐私说明](docs/privacy.md)
- [参与贡献](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新日志](CHANGELOG.md)

## 赞助商

<p align="center">
  <a href="https://modelflare.dev/sign-up?partner=OB9YXNSEEGOL"><img src="docs/images/sponsors/modelflare-logo.png" alt="ModelFlare Logo" width="56"></a><br>
  <a href="https://modelflare.dev/sign-up?partner=OB9YXNSEEGOL"><strong>ModelFlare</strong></a> · <a href="https://modelflare.dev/sign-up?partner=OB9YXNSEEGOL">modelflare.dev</a><br>
  <sub>为个人开发者提供价格友好、稳定便捷的前沿 AI 模型 API 接入，帮助你更快完成原型验证，把想法变成真正可用的产品。</sub>
</p>

## License

电脑端源码采用 [GNU GPL v3](LICENSE)（`GPL-3.0-only`）。本项目是非 OpenAI 官方社区工具。

---

<p align="center">
  <strong>如果这张小票让你觉得有点意思，欢迎点一个 Star。</strong>
</p>
