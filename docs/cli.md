# CLI 使用

<p><strong>中文</strong> · <a href="./cli.en.md">English</a> · <a href="../README.md">返回 README</a></p>

## 环境要求

- Node.js 20 或更高版本
- 本机已经使用过 Codex，并存在 `~/.codex/sessions/` 会话记录

无需克隆仓库或全局安装。

## 交互选择保存方式与统计范围

直接运行：

```bash
npx codex-work-receipt@latest
```

首次交互式运行会先让你选择：

- `自动保存`：Codex 每完成一轮工作，就静默刷新今天的小票和 `.cwr.json` 微信导入文件
- `仅手动`：只有执行命令或告诉票仔时才生成

选择仅手动后，命令行会继续让你选择今天全部活动、最近 3 小时、最近 7 个自然日、本周，或最近的某个具体会话。选择具体会话时会展示起止时间、轮次、工具调用和模型，帮助辨认。显式使用 `--today`、`--latest` 等范围参数时不会触发模式问答。

## 自动保存

重新打开模式选择：

```bash
npx codex-work-receipt@latest --setup
```

直接启用、切换为仅手动或查看状态：

```bash
npx codex-work-receipt@latest --enable-auto
npx codex-work-receipt@latest --disable-auto
npx codex-work-receipt@latest --auto-status
```

自动保存通过用户级 Codex `Stop` Hook 触发。Hook 收到一轮工作停止事件后只启动一个短生命周期的本地生成进程；没有定时器、空闲判断或常驻监听服务。短时间内的重复触发会被合并，并发生成使用本地锁保护。

自动模式只刷新“今日”范围，并且不打开浏览器、不打印日常提示、不生成数据二维码。每次刷新都会更新同一天的以下文件：

```text
~/.codex-work-receipt/auto/YYYY-MM-DD/
├── codex-receipt-today-YYYY-MM-DD.html
├── codex-receipt-today-YYYY-MM-DD.json
└── codex-receipt-today-YYYY-MM-DD.cwr.json
```

`.cwr.json` 是自动模式的手机导入入口：把它发送到微信文件传输助手，再在小程序中选择“从聊天文件导入”。自动保存不会自动发送文件或上传数据。

启用时会把不依赖网络的稳定运行器安装到 `~/.codex-work-receipt/runtime/`，并安全合并 `~/.codex/hooks.json`。如果已有 Hooks，原文件会先备份；无法解析现有配置时安装会停止，不会覆盖它。重启 Codex 后，如果出现 Hook 审查提示，请使用 `/hooks` 检查并信任。切换为仅手动只移除本工具自己的 Hook，保留历史、运行器和其他 Hooks。npm 包升级后重新执行 `--enable-auto` 即可更新本地运行器；重复执行不会重复添加 Hook。

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

`--hours` 支持 1～168 的整数，并按精确时间戳筛选，可以跨越午夜。滚动小时小票使用兼容的 cwr1 摘要协议，不会写入 cwr2 的“会话 × 自然日”规范事实，只保存到私人历史，不参与 AI 供销社统计。需要进入供销社时，请生成“今日 / 本周 / 近 7 日 / 指定会话”小票。

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
├── codex-receipt-today-2026-07-18.json
└── codex-receipt-today-2026-07-18.cwr.json
```

默认文件名会携带统计日期范围；最近会话和指定会话则携带短编号，避免不同日期或会话的小票互相覆盖。

打开生成的 HTML 后：

- 点击“下载微信导入文件”会下载同一份 `.cwr.json`。把它发送到微信文件传输助手，再在小程序中点击“从聊天文件导入”。
- 只有完整数据能安全放进一个二维码时，页面才显示“也可以扫码导入”；桌面端不会再生成多分片二维码。
- 点击“保存完整长图”会下载高清 PNG。图片只包含完整主小票和微信小程序码，不包含导入文件按钮、数据二维码、主题按钮、网页背景或底部说明。

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
| `--setup` | 交互选择自动保存或仅手动模式 |
| `--enable-auto` | 安装运行器和 Codex Hook，启用自动保存 |
| `--disable-auto` | 移除本工具 Hook，切换为仅手动模式 |
| `--auto-status` | 查看模式、运行器、Hook 和最近自动生成状态 |
| `--no-open` | 生成后不自动打开浏览器 |

也可以随时运行：

```bash
npx codex-work-receipt@latest --help
```

## 本地历史

每次运行会生成或更新：

- `codex-work-receipt-output/codex-receipt-*.html`：可切换主题的小票网页
- `codex-work-receipt-output/codex-receipt-*.json`：当前小票的版本化结构数据
- `codex-work-receipt-output/codex-receipt-*.cwr.json`：发送到微信聊天后由小程序选择的脱敏导入文件
- `~/.codex-work-receipt/receipts/*.json`：本机历史快照
- `~/.codex-work-receipt/latest.json`：最近生成的小票
- `~/.codex-work-receipt/history.jsonl`：去重后的本地历史
- `~/.codex-work-receipt/config.json`：自动保存或仅手动配置
- `~/.codex-work-receipt/auto-state.json`：最近一次自动运行状态
- `~/.codex-work-receipt/auto/YYYY-MM-DD/`：自动刷新的今日 HTML、JSON 和微信导入文件

结构说明见 [数据结构、文件与二维码协议](data-schema.md)。

## 当前限制

- 当前只支持 Codex；Cursor、WorkBuddy 等数据源仍在规划中
- 暂不统计修改文件数和代码行数，避免不同工具调用方式产生误导
- 自然日范围按本地日期筛选，滚动小时范围按精确时间戳筛选，并分别计算每个会话的 Token 区间增量
- 桌面网页导出 PNG 使用浏览器本地渲染，不上传小票数据
- 自动保存依赖本机 Codex 客户端触发 `Stop` Hook；云端任务不会直接调用本机 Hook
