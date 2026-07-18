# Codex AI 打工小票

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>把本机 Codex 的工作记录，开成一张可以带走的 AI 打工小票。</strong><br>
  一行命令 · 完全本地 · 三种主题 · 扫码传到手机
</p>

<p align="center">
  <img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-17231F">
  <img alt="Privacy first" src="https://img.shields.io/badge/privacy-no%20prompts%20or%20code-42CDA7">
</p>

<p align="center">
  <img src="docs/images/readme-hero.jpg" alt="Codex AI 打工小票三种主题效果" width="920">
</p>

<p align="center">
  只读取本机 Codex 会话中的时间和数字统计。<br>
  不会把 Prompt、回复正文、代码、项目路径或文件名写入小票。
</p>

## 赞助商

<p align="center">
  <a href="https://modelflare.dev/">
    <img src="docs/images/sponsors/modelflare-logo.png" alt="ModelFlare Logo" width="72">
  </a>
</p>

<p align="center">
  <a href="https://modelflare.dev/"><strong>ModelFlare</strong></a><br>
  <a href="https://modelflare.dev/">modelflare.dev</a><br>
  <sub>让个人开发者也能以很低的成本稳定接入前沿 AI 模型 API，价格友好、计费透明、用量清晰可见。</sub>
</p>

## 三种小票主题

<table>
  <tr>
    <td align="center"><strong>经典白票</strong></td>
    <td align="center"><strong>复古粉票</strong></td>
    <td align="center"><strong>夜班绿票</strong></td>
  </tr>
  <tr>
    <td><img src="docs/images/receipts/receipt-classic.jpg" alt="AI 打工小票经典白票" width="320"></td>
    <td><img src="docs/images/receipts/receipt-diner.jpg" alt="AI 打工小票复古粉票" width="320"></td>
    <td><img src="docs/images/receipts/receipt-payroll.jpg" alt="AI 打工小票夜班绿票" width="320"></td>
  </tr>
</table>

三种主题只改变视觉表达，不改变统计口径。生成网页后也可以即时切换主题。

## 30 秒快速开始

需要 Node.js 20 或更高版本，并且本机已经使用过 Codex。

不需要克隆仓库，统计最近一次会话并自动打开小票：

```bash
npx codex-work-receipt@latest --latest
```

汇总本地时区今天发生的全部 Codex 活动：

```bash
npx codex-work-receipt@latest --today
```

生成结果默认保存在：

```text
./codex-work-receipt-output/
├── codex-receipt-latest.html
└── codex-receipt-latest.json
```

## 从电脑到手机

```text
Codex 本地会话
  ↓
运行一行命令
  ↓
生成 AI 打工小票网页和数据二维码
  ↓
在配套小程序中扫码导入
  ↓
换模板、保存图片、分享
```

配套小程序已经支持扫码导入、本地历史、主题切换和保存图片。微信扫码即可进入配套小程序，再扫描旁边的数据二维码导入当前小票。

数据二维码只携带版本化的脱敏统计，不携带图片和原始会话。桌面端与小程序端分别根据同一份结构数据渲染小票。

## 直接跟 Codex 说

只需安装一次 AI 打工小票 Skill：

```bash
npx codex-work-receipt@latest --install-skill
```

以后可以直接对 Codex 说：

> 给刚刚这次工作开一张 AI 打工小票。

> 生成我今天的 AI 打工小票，使用复古粉票。

Codex 会自动判断 `--latest` 或 `--today`、选择主题、执行命令并打开生成的网页。也可以通过 `$ai-work-receipt` 显式调用。

Skill 安装在用户目录 `~/.agents/skills/ai-work-receipt/`，不会写入当前代码仓库；如果当前会话没有识别到，请重启 Codex。

## 它能做什么

- 统计最近一次 Codex 会话，或汇总今天的全部活动
- 生成经典白票、复古粉票、夜班绿票三种主题
- 统计会话、轮次、用户消息、工具调用和中断次数
- 展示 Token、缓存输入、AI 工作时长和模型
- 根据工作量生成娱乐化的 AI 工分、今日工种和点评
- 生成可供配套小程序扫描的 `cwr1` 数据二维码
- 在本机保存结构 JSON 和去重后的历史记录
- 安装可通过自然语言触发的 Codex Skill
- 全程不上传 Prompt、回复、代码或项目路径

## 常用命令

选择默认主题：

```bash
npx codex-work-receipt@latest --latest --theme diner
```

仅生成文件，不自动打开浏览器：

```bash
npx codex-work-receipt@latest --latest --no-open
```

指定时区和输出路径：

```bash
npx codex-work-receipt@latest --today \
  --timezone Asia/Shanghai \
  --output ./my-receipt.html
```

可用参数：

| 参数 | 说明 |
| --- | --- |
| `--latest` | 统计最近活跃的 Codex 会话，默认模式 |
| `--today` | 汇总指定时区今天发生的 Codex 活动 |
| `--timezone <name>` | 指定 IANA 时区，例如 `Asia/Shanghai` |
| `--theme <name>` | `classic`、`diner` 或 `payroll` |
| `--output <file>` | 指定 HTML 输出路径 |
| `--data-dir <directory>` | 指定本地结构历史目录 |
| `--install-skill` | 将 AI 打工小票 Skill 安装到当前用户的 Codex |
| `--no-open` | 生成后不自动打开浏览器 |

## 本地保存的数据

每次运行会生成或更新：

- `codex-work-receipt-output/codex-receipt-*.html`：可切换主题的小票网页
- `codex-work-receipt-output/codex-receipt-*.json`：当前小票的版本化结构数据
- `~/.codex-work-receipt/receipts/*.json`：本机历史快照
- `~/.codex-work-receipt/latest.json`：最近生成的一张小票
- `~/.codex-work-receipt/history.jsonl`：去重后的本地历史，方便未来批量迁移

数据结构和二维码协议见 [docs/data-schema.md](docs/data-schema.md)。

## 隐私设计

- 默认只读取 `~/.codex/sessions/**/*.jsonl`
- 只提取事件类型、时间、模型名称和数字统计
- 不保存 Prompt、回复正文、代码、项目路径或文件名
- 运行期间不向网络发送会话数据
- HTML、结构 JSON 和历史记录全部保存在本机
- 二维码等同于一份可扫描的数据文件，请只向信任的人展示

更完整的隐私说明见 [docs/privacy.md](docs/privacy.md)。

## 当前限制

- 暂不统计修改文件数和代码行数，避免在不同工具调用方式下产生误导
- `--today` 默认扫描最近 72 小时有变动的会话文件，再按事件日期筛选
- 当前只支持 Codex；Cursor、WorkBuddy 等数据源仍在规划中
- 网页端不直接导出图片，移动端渲染和保存由配套小程序完成

## 本地开发

```bash
git clone https://github.com/a-bai-2026/ai-work-receipt.git
cd codex-work-receipt
npm install
npm test
npm run receipt -- --latest
```

贡献前请阅读：

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

测试数据必须是人工构造或彻底脱敏的 fixture，禁止提交真实 Codex 会话。

## Roadmap

- 增加更多可传播的小票主题
- 支持 Cursor、WorkBuddy 等 AI 工作工具
- 完善跨工具的统一数据结构
- 支持周报、月报和长期 AI 工作档案
- 改进 Codex 不同版本的日志兼容性和端到端测试

## 许可与声明

- 本仓库中的电脑端源码采用 [GNU GPL v3](LICENSE)（`GPL-3.0-only`）许可
- 修改或分发本项目时，必须继续遵守 GPLv3 并提供相应源码
- GPLv3 仅适用于本仓库中的电脑端项目，不覆盖配套小程序、后台服务或其他独立产品
- 本项目是非 OpenAI 官方社区工具，与 OpenAI 无隶属或背书关系
- Codex、Cursor、WorkBuddy 及相关名称和商标归各自权利人所有

---

<p align="center">
  <strong>如果这张小票让你觉得有点意思，欢迎点一个 Star。</strong><br>
  让每一次 AI 打工，都留下一张可以带走的记录。
</p>
