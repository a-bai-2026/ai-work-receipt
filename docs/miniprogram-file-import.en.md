# Mini-program file import implementation

<p><a href="./miniprogram-file-import.md">中文</a> · <strong>English</strong> · <a href="./mobile-import.en.md">Back to mobile import</a></p>

The companion mini-program source is not part of this repository. This page defines the mobile integration boundary for `cwr-file-v1`; use `docs/fixtures/cwr-file-v1.json` as the compatibility fixture.

## Choose and read

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

Cancellation should not display an error. Extensions are selection filters, not security checks. Official API references: [`wx.chooseMessageFile`](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.chooseMessageFile.html) and [`FileSystemManager.readFile`](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.readFile.html).

## Validation order

1. Parse UTF-8 JSON and require a plain top-level object.
2. Require `format === "codex-work-receipt"`.
3. Require `file_version === 1`; ask users to update the mini program for newer versions.
4. Accept only `cwr1` or `cwr2`, matching `payload.v`.
5. Calculate SHA-256 over canonical payload JSON and compare it with `integrity.digest`.
6. Strictly validate compact fields, array lengths, dates, timezone, and non-negative numeric bounds.
7. For cwr2, validate `fact_count === facts.length`, unique fact IDs, the manifest hash, and every content hash.
8. Never merge untrusted objects directly into application state or object prototypes.

SHA-256 detects corruption; it is not an official signature. Public accounting must continue to treat client data as untrusted.

Canonicalization must match the desktop implementation: recursively sort object keys using JavaScript's default string order (UTF-16 code units), preserve array order, encode compact JSON as UTF-8, then calculate SHA-256. First verify that the implementation reproduces the digest in `docs/fixtures/cwr-file-v1.json`.

## Preview and persistence

Files and QR codes must decode to the same compact payload and share one business pipeline:

```text
validate → preview → confirm → deduplicate → persist
```

The confirmation view should show at least:

- scope and date range from `payload.o` and `payload.d`
- session count from `payload.s[0]`
- cwr2 canonical fact count from `payload.a[4]`, or a rolling-summary label for cwr1
- new, updated, and existing counts when they can be calculated safely

Do not write before confirmation. Persist atomically; if any fact fails, reject the complete import without partial records.

## QR compatibility

The new desktop generates only complete single `cwr1` or `cwr2` data codes. Keep the `cwr2p` collector and reconstruction path so older multipart receipts remain importable.

Test File Transfer flows on iOS, Android, WeChat for Windows, and WeChat for macOS, including cancellation, oversized files, invalid JSON, bad digests, future versions, repeated imports, overlapping ranges, and append-only updates.
