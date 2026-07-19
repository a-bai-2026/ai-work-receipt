# CLI 使用

<p><strong>中文</strong> · <a href="./cli.en.md">English</a> · <a href="../README.md">返回 README</a></p>

## 环境要求

- Node.js 20 或更高版本
- 本机已经使用过 Codex，并存在 `~/.codex/sessions/` 会话记录

无需克隆仓库或全局安装。

## 交互选择统计范围

直接运行：

```bash
npx codex-work-receipt@latest
```

命令行会让你选择：今天全部活动、最近 3 小时、最近 7 个自然日、本周，或最近的某个具体会话。选择具体会话时会展示起止时间、轮次、工具调用和模型，帮助辨认。

## 非交互统计范围

统计最近一次活跃会话，并自动打开小票：

```bash
npx codex-work-receipt@latest --latest
```

汇总本地时区今天发生的全部 Codex 活动：

```bash
npx codex-work-receipt@latest --today
```

最近 3 小时：

```bash
npx codex-work-receipt@latest --hours 3
```

`--hours` 支持 1～168 的整数，并按精确时间戳筛选，可以跨越午夜。滚动小时小票使用兼容的 cwr1 摘要协议，不会写入 cwr2 的“会话 × 自然日”规范事实。

最近 7 个自然日（含今天）：

```bash
npx codex-work-receipt@latest --range last-7-days
```

本周周一至今：

```bash
npx codex-work-receipt@latest --range this-week
```

## 语言与主题

生成英文小票：

```bash
npx codex-work-receipt@latest --latest --lang en
```

选择默认主题：

```bash
npx codex-work-receipt@latest --latest --theme diner
```

可用主题：

- `classic`：经典白票
- `diner`：复古粉票
- `payroll`：夜班绿票

网页生成后仍然可以即时切换主题，统计口径不会改变。

## 输出文件

默认输出：

```text
./codex-work-receipt-output/
├── codex-receipt-today-2026-07-18.html
└── codex-receipt-today-2026-07-18.json
```

默认文件名会携带统计日期范围；最近会话和指定会话则携带短编号，避免不同日期或会话的小票互相覆盖。

打开生成的 HTML 后，点击“保存完整长图”即可下载高清 PNG。图片包含主小票、小程序码和数据二维码导入联，并自动使用当前选择的主题；主题按钮、网页背景和底部说明不会进入图片。只有一个数据二维码时，小程序码与数据码继续并排展示。cwr2 数据超过单码安全容量时，网页先单独展示小程序码，随后自动逐张轮播分片数据码；用户无需在电脑上切换上一张或下一张，但仍需在小程序中收齐全部分片。完整长图为保留离线数据，会继续包含全部带序号的分片二维码。

指定时区和输出路径：

```bash
npx codex-work-receipt@latest --today \
  --timezone Asia/Shanghai \
  --output ./my-receipt.html
```

只生成文件，不自动打开浏览器：

```bash
npx codex-work-receipt@latest --latest --no-open
```

## 全部参数

| 参数 | 说明 |
| --- | --- |
| `--range <name>` | `latest`、`last-hours`、`today`、`last-7-days` 或 `this-week` |
| `--hours <number>` | 统计最近 1～168 小时；等价于 `last-hours` 范围 |
| `--latest` | 统计最近活跃的 Codex 会话，默认模式 |
| `--today` | 汇总指定时区今天发生的 Codex 活动 |
| `--session <id>` | 统计指定的 Codex 会话 |
| `--timezone <name>` | 指定 IANA 时区，例如 `Asia/Shanghai` |
| `--lang <name>` | `zh-CN`（默认）或 `en` |
| `--theme <name>` | `classic`、`diner` 或 `payroll` |
| `--output <file>` | 指定 HTML 输出路径 |
| `--data-dir <directory>` | 指定本地结构历史目录 |
| `--install-skill` | 安装 AI 打工小票 Codex Skill |
| `--install-pet` | 只安装“票仔”Codex 桌宠 |
| `--uninstall-pet` | 卸载“票仔”，不删除 Skill 或历史小票 |
| `--install-companion` | 同时安装 Skill 和“票仔”Codex 桌宠 |
| `--no-open` | 生成后不自动打开浏览器 |

也可以随时运行：

```bash
npx codex-work-receipt@latest --help
```

## 本地历史

每次运行会生成或更新：

- `codex-work-receipt-output/codex-receipt-*.html`：可切换主题的小票网页
- `codex-work-receipt-output/codex-receipt-*.json`：当前小票的版本化结构数据
- `~/.codex-work-receipt/receipts/*.json`：本机历史快照
- `~/.codex-work-receipt/latest.json`：最近生成的小票
- `~/.codex-work-receipt/history.jsonl`：去重后的本地历史

结构说明见 [数据结构与二维码协议](data-schema.md)。

## 当前限制

- 当前只支持 Codex；Cursor、WorkBuddy 等数据源仍在规划中
- 暂不统计修改文件数和代码行数，避免不同工具调用方式产生误导
- 自然日范围按本地日期筛选，滚动小时范围按精确时间戳筛选，并分别计算每个会话的 Token 区间增量
- 桌面网页导出 PNG 使用浏览器本地渲染，不上传小票数据
