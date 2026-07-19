# 数据结构与二维码协议

<p><strong>中文</strong> · <a href="./data-schema.en.md">English</a> · <a href="../README.md">返回 README</a></p>

当前结构版本为 `1`。每次生成都会在本机保存一份结构记录。

## 主要字段

- `schema_version`：结构版本
- `locale`：桌面小票语言，支持 `zh-CN` 和 `en`
- `id`：根据统计快照生成的匿名 ID
- `generated_at`：生成时间
- `source`：数据来源、`scope` 统计范围和采集器版本
- `period`：实际活动起止时间、时区，以及 `range_start_date` / `range_end_date` 自然日边界
- `stats`：轮次、消息、工具、Token、时长等统计
- `presentation`：默认主题、语言无关的 `work_profile`、本地化工种、点评和 AI 工分
- `privacy`：明确声明不包含的敏感内容

同一个会话、同一天或同一组自然日边界的 `id` 保持稳定；重复生成会更新该记录。`source.snapshot_hash` 用于识别统计内容是否发生变化。

## 二维码格式

二维码使用精简字段：

```text
cwr1.<checksum>.<deflateRaw(JSON) 的 Base64URL>
cwr2.<checksum>.<deflateRaw(JSON) 的 Base64URL>
cwr2p.<transferId>.<partIndex>.<partCount>.<totalChecksum>.<partChecksum>.<chunk>
```

`cwr1` 和 `cwr2` 是完整单码。`cwr2p` 是 cwr2 单码字符串的可乱序分片，最多 12 片；小程序先按 transferId 收集全部分片，再校验总 checksum、拼回 cwr2 并解压。HTML 在多分片时每次只轮播一个数据码，协议本身不依赖扫描顺序。

小程序应检查前缀和校验值，再解压并解析数据。未来结构升级通过 `v` 字段兼容。

精简字段 `o` 显式携带 `latest`、`session`、`last-hours`、`today`、`last-7-days` 或 `this-week`；`d[3]` 和 `d[4]` 携带日期边界。今日、近 7 日和本周继续使用 cwr2 canonical facts。`last-hours` 是滚动时间窗，为避免与“会话 × 自然日”事实发生身份冲突，使用兼容的 cwr1 摘要载荷。旧二维码仍可由新版小程序导入。

`presentation.compensation` 是娱乐化 AI 工分，不代表真实 API 费用。为兼容当前中文小程序，二维码展示文案继续使用中文，并通过精简字段 `l` 和 `r` 携带桌面语言及工种语义 ID；英文 HTML 和本地 JSON 不受影响。

手机端流程见 [手机扫码导入](mobile-import.md)。
