# Data schema and QR protocol

<p><a href="./data-schema.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

The current schema version is `1`. Each generation saves a structured receipt record locally.

## Main fields

- `schema_version`: schema version
- `locale`: desktop receipt language, `zh-CN` or `en`
- `id`: anonymous ID derived from the metrics snapshot
- `generated_at`: generation time
- `source`: data source and selected range
- `period`: start, end, and timezone
- `stats`: turns, messages, tools, Tokens, duration, and related metrics
- `presentation`: default theme, language-neutral `work_profile`, localized role, review, and AI work points
- `privacy`: explicit declaration of excluded sensitive content

The `id` remains stable for the same latest session or the same day. Regeneration updates the record rather than creating duplicate history. `source.snapshot_hash` detects metric changes.

## QR format

The QR payload uses compact fields:

```text
cwr1.<checksum>.<Base64URL of deflateRaw(JSON)>
```

The mini program validates the prefix and checksum before decompressing and parsing the payload. Future schema versions use the compact `v` field for compatibility.

`presentation.compensation` contains playful AI work points, not real API cost. For compatibility with the current Chinese mini program, QR display copy remains Chinese while compact fields `l` and `r` carry the desktop locale and language-neutral role ID. English HTML and local JSON remain fully localized.

See [mobile QR import](mobile-import.en.md).
