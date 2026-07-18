# 本地数据与隐私

<p><strong>中文</strong> · <a href="./privacy.en.md">English</a> · <a href="../README.md">返回 README</a></p>

AI 打工小票在本机读取 Codex 会话，并在本机完成统计和渲染。

## 会读取什么

- 默认读取 `~/.codex/sessions/**/*.jsonl`
- 提取事件类型、时间、模型名称和数字统计
- 计算轮次、工具调用、Token、时长和中断次数等指标

## 不会写入小票什么

- Prompt 和回复正文
- 源代码
- 项目路径和文件名
- API Key、账号凭据或环境变量

## 会保存在哪里

生成的 HTML 和 JSON 默认位于当前目录的 `codex-work-receipt-output/`，去重历史保存在 `~/.codex-work-receipt/`。可以使用 `--output` 和 `--data-dir` 修改位置。

运行期间不会把 Codex 会话数据上传到本项目的服务器。通过 `npx` 首次下载或更新 npm 包属于包管理器的正常网络请求，不包含本地会话内容。

## 二维码

二维码只包含当前小票的版本化脱敏统计，不包含原始会话或图片。二维码等同于一份可扫描的数据文件，请只向信任的人展示。

格式说明见 [数据结构与二维码协议](data-schema.md)。
