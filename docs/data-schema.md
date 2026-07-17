# Receipt data schema

当前结构版本为 `1`。每次生成都会在本机保存一份结构记录。

主要字段：

- `schema_version`：结构版本
- `id`：根据统计快照生成的匿名ID
- `generated_at`：生成时间
- `source`：数据来源和统计范围
- `period`：开始、结束和时区
- `stats`：轮次、消息、工具、Token、时长等统计
- `presentation`：默认主题、AI 员工类型、点评和 AI 工分
- `privacy`：明确声明不包含的敏感内容

同一个最近会话、或同一天的 `id` 保持稳定；重复生成会更新该记录，而不是不断制造重复历史。`source.snapshot_hash` 用于识别统计内容是否发生变化。

二维码使用精简字段，并采用以下格式：

```text
cwr1.<checksum>.<deflateRaw(JSON) 的 Base64URL>
```

二维码中的 `presentation.compensation` 为娱乐化 AI 工分，不代表真实 API 费用。小程序应先检查前缀和校验值，再解析数据。未来结构升级通过 `v` 字段兼容。
