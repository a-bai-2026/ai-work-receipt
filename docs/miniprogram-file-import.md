# 小程序文件导入实现

<p><strong>中文</strong> · <a href="./miniprogram-file-import.en.md">English</a> · <a href="./mobile-import.md">返回手机导入</a></p>

配套小程序源码不在本仓库中。本页定义 `cwr-file-v1` 的移动端接入边界；兼容夹具位于 `docs/fixtures/cwr-file-v1.json`。

## 选择与读取

```js
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

wx.chooseMessageFile({
  count: 1,
  type: "file",
  extension: ["json", "cwr"],
  success({ tempFiles }) {
    const file = tempFiles[0];
    if (!file || file.size > MAX_IMPORT_BYTES) return showFileTooLarge();
    wx.getFileSystemManager().readFile({
      filePath: file.path,
      encoding: "utf8",
      success: ({ data }) => previewReceiptFile(data),
      fail: showReadError,
    });
  },
});
```

用户取消选择不应显示错误。扩展名只用于过滤，不能代替内容校验。官方接口参考：[`wx.chooseMessageFile`](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.chooseMessageFile.html) 和 [`FileSystemManager.readFile`](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readFile.html)。

## 校验顺序

1. UTF-8 JSON 能够解析，顶层是普通对象。
2. `format === "codex-work-receipt"`。
3. `file_version === 1`；更高版本提示升级小程序。
4. `payload_schema` 为 `cwr1` 或 `cwr2`，并与 `payload.v` 一致。
5. 对规范化 payload JSON 计算 SHA-256，与 `integrity.digest` 比较。
6. 严格校验 compact payload 的字段类型、数组长度、日期、时区和非负数值范围。
7. cwr2 校验 `fact_count === facts.length`、factId 唯一性、manifest hash 和每个 content hash。
8. 禁止把不可信对象直接合并到应用状态或对象原型。

SHA-256 只校验文件是否被损坏，不代表官方签名。公开统计必须继续把客户端数据视为不可信数据。

规范化必须与桌面端一致：递归按 JavaScript 默认字符串排序（UTF-16 code unit 顺序）排列对象键，保持数组顺序，用无空白 JSON 编码为 UTF-8 后计算 SHA-256。请先用 `docs/fixtures/cwr-file-v1.json` 验证实现得到相同 digest。

## 预览与入库

文件和二维码解码后都应得到同一种 compact payload，并进入同一个业务管线：

```text
validate → preview → confirm → deduplicate → persist
```

确认页至少展示：

- `payload.o` 与 `payload.d` 对应的统计范围
- `payload.s[0]` 会话数
- cwr2 的 `payload.a[4]` canonical fact 数量；cwr1 标记为滚动摘要
- 可以预计算时展示新增、更新、已存在数量

用户确认前不得写入数据库。入库必须原子化；任一 fact 失败时整次导入失败，不留下部分记录。

## 二维码兼容

新版桌面端只生成完整的单个 `cwr1` 或 `cwr2` 数据码。小程序仍需保留 `cwr2p` 收集和重组能力，以导入旧版本已经生成的分片二维码。

建议覆盖 iOS、Android、Windows 微信和 macOS 微信的文件传输助手流程，并测试取消、超大文件、损坏 JSON、错误 digest、未来版本、重复导入、重叠范围和 append-only 更新。
