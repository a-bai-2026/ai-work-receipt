# 数据结构与二维码协议

<p><strong>中文</strong> · <a href="./data-schema.en.md">English</a> · <a href="../README.md">返回 README</a></p>

当前结构版本为 `1`。每次生成都会在本机保存一份结构记录。

## 主要字段

- `schema_version`：结构版本
- `locale`：桌面小票语言，支持 `zh-CN` 和 `en`
- `id`：根据统计快照生成的匿名 ID
- `generated_at`：生成时间
- `source`：数据来源和统计范围
- `period`：开始、结束和时区
- `stats`：轮次、消息、工具、Token、时长等统计
- `presentation`：默认主题、语言无关的 `work_profile`、本地化工种、点评和 AI 工分
- `privacy`：明确声明不包含的敏感内容

同一个最近会话或同一天的 `id` 保持稳定；重复生成会更新该记录。`source.snapshot_hash` 用于识别统计内容是否发生变化。

## 二维码格式

二维码使用精简字段：

```text
cwr1.<checksum>.<deflateRaw(JSON) 的 Base64URL>
```

小程序应检查前缀和校验值，再解压并解析数据。未来结构升级通过 `v` 字段兼容。

`presentation.compensation` 是娱乐化 AI 工分，不代表真实 API 费用。为兼容当前中文小程序，二维码展示文案继续使用中文，并通过精简字段 `l` 和 `r` 携带桌面语言及工种语义 ID；英文 HTML 和本地 JSON 不受影响。

手机端流程见 [手机扫码导入](mobile-import.md)。
