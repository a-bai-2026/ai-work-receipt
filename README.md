# Codex AI 打工小票

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>把本机 Codex 的工作记录，开成一张可以带走的 AI 打工小票。</strong><br>
  一行命令 · 完全本地 · Codex 桌宠 · 三种主题 · 扫码传到手机
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

`0.6.0` 使用 cwr2 协议，按“会话 × 自然日”生成稳定的脱敏事实。今日、近 7 日和本周小票即使范围重叠，接收端也能识别相同工作；数据过大时会自动生成多张可重组的分片二维码，并在 HTML 中逐张自动轮播，避免镜头同时识别多个数据码。

## 认识票仔

<p align="center">
  <a href="docs/codex-pet.md"><img src="docs/images/codex-pet-showcase.png" alt="票仔 AI 小票工的待机、打工、等待确认、完成和失败状态" width="920"></a>
</p>

<p align="center">
  <sub>票仔会跟随 Codex 的空闲、执行、等待确认、完成和失败状态切换表情。点击图片查看安装与状态说明。</sub>
</p>

## Quickstart

需要 Node.js 20 或更高版本，并且本机已经使用过 Codex。无需克隆仓库，运行后选择“今天 / 最近 3 小时 / 近 7 日 / 本周 / 指定会话”：

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

网页和结构数据默认保存在 `./codex-work-receipt-output/`。生成的网页支持一键保存只包含完整小票和微信小程序码的高清长图，数据二维码不会进入图片。也可以继续使用 `--latest`、`--today` 等非交互参数，详见 [CLI 使用文档](docs/cli.md)。

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

桌面网页会生成一张或多张脱敏数据二维码。配套微信小程序支持分片扫码、私人历史、主题切换和保存图片。详见 [手机扫码导入](docs/mobile-import.md)。

## 文档

- [CLI 使用与全部参数](docs/cli.md)
- [Codex Skill](docs/codex-skill.md)
- [Codex 桌宠“票仔”](docs/codex-pet.md)
- [手机扫码导入](docs/mobile-import.md)
- [数据结构与二维码协议](docs/data-schema.md)
- [本地数据与隐私说明](docs/privacy.md)
- [参与贡献](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新日志](CHANGELOG.md)

## 赞助商

<p align="center">
  <a href="https://modelflare.dev/"><img src="docs/images/sponsors/modelflare-logo.png" alt="ModelFlare Logo" width="56"></a><br>
  <a href="https://modelflare.dev/"><strong>ModelFlare</strong></a> · <a href="https://modelflare.dev/">modelflare.dev</a><br>
  <sub>让个人开发者也可以以很低的成本、稳定地接入前沿 AI 模型的 API，借助模型能力快速构建自己的产品。</sub>
</p>

## License

电脑端源码采用 [GNU GPL v3](LICENSE)（`GPL-3.0-only`）。本项目是非 OpenAI 官方社区工具。

---

<p align="center">
  <strong>如果这张小票让你觉得有点意思，欢迎点一个 Star。</strong>
</p>
