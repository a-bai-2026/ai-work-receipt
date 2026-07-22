# 数据结构、文件与二维码协议

<p><strong>中文</strong> · <a href="./data-schema.en.md">English</a> · <a href="../README.md">返回 README</a></p>

当前完整记录结构版本为 `2`；滚动小时摘要为了兼容继续使用版本 `1`。每次生成都会在本机保存完整结构记录和一份脱敏微信导入文件。

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

## 微信导入文件

每次生成都会在 HTML 旁边写入一个 `*.cwr.json`：

```json
{
  "format": "codex-work-receipt",
  "file_version": 1,
  "payload_schema": "cwr2",
  "payload": {},
  "integrity": {
    "algorithm": "sha256",
    "digest": "..."
  }
}
```

`payload` 与二维码解压后的精简结构完全相同。`integrity.digest` 是对规范化 payload JSON 计算的完整 SHA-256，用于发现损坏，但不是来源签名。小程序必须把文件视为不可信输入，限制文件大小，校验版本、字段、数值范围、factId 唯一性、manifest 和 content hash，并在用户确认后原子入库。

规范化规则是：递归按 JavaScript 默认字符串排序（UTF-16 code unit 顺序）排列每个对象的键，保持数组元素顺序，使用 JSON 原始类型，不添加空白或换行，再对生成的 UTF-8 字节计算 SHA-256。兼容实现可用 `docs/fixtures/cwr-file-v1.json` 的 digest 做交叉验证。

兼容测试夹具见 `docs/fixtures/cwr-file-v1.json`。

## 二维码格式

二维码使用精简字段：

```text
cwr1.<checksum>.<deflateRaw(JSON) 的 Base64URL>
cwr2.<checksum>.<deflateRaw(JSON) 的 Base64URL>
cwr2p.<transferId>.<partIndex>.<partCount>.<totalChecksum>.<partChecksum>.<chunk>
```

`cwr1` 和 `cwr2` 是完整单码。桌面端只有在完整载荷不超过安全 QR version 时才生成一个数据二维码；否则只提供 `.cwr.json` 文件，不再生成新的分片二维码。

`cwr2p` 是旧版桌面端生成的可乱序 cwr2 分片，最多 12 片。新版小程序仍应收集相同 transferId 的历史分片、校验分片和总 checksum、拼回 cwr2 并解压，以兼容已经生成的小票。

小程序应检查前缀和校验值，再解压并解析数据。未来结构升级通过 `v` 字段兼容。

精简字段 `o` 显式携带 `latest`、`session`、`last-hours`、`today`、`last-7-days` 或 `this-week`；`d[3]` 和 `d[4]` 携带日期边界。今日、近 7 日和本周继续使用 cwr2 canonical facts。`last-hours` 是滚动时间窗，为避免与“会话 × 自然日”事实发生身份冲突，使用兼容的 cwr1 摘要载荷，只进入私人历史、不参与 AI 供销社统计。旧二维码仍可由新版小程序导入。

同一 Codex 会话出现多份 append-only 日志修订时，生成器只采用更完整的修订；cwr2 manifest 中的 factId 必须唯一，检测到身份冲突时不会输出可扫码二维码。

`presentation.compensation` 是娱乐化 AI 工分，不代表真实 API 费用。为兼容当前中文小程序，二维码展示文案继续使用中文，并通过精简字段 `l` 和 `r` 携带桌面语言及工种语义 ID；英文 HTML 和本地 JSON 不受影响。

手机端流程见 [手机文件与单码导入](mobile-import.md)。
