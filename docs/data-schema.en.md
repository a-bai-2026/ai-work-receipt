# Data schema and QR protocol

<p><a href="./data-schema.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

The current schema version is `1`. Each generation saves a structured receipt record locally.

## Main fields

- `schema_version`: schema version
- `locale`: desktop receipt language, `zh-CN` or `en`
- `id`: anonymous ID derived from the metrics snapshot
- `generated_at`: generation time
- `source`: data source, selected `scope`, and collector version
- `period`: actual activity times, timezone, and `range_start_date` / `range_end_date` calendar boundaries
- `stats`: turns, messages, tools, Tokens, duration, and related metrics
- `presentation`: default theme, language-neutral `work_profile`, localized role, review, and AI work points
- `privacy`: explicit declaration of excluded sensitive content

The `id` remains stable for the same session, day, or calendar-boundary pair. Regeneration updates the record rather than creating duplicate history. `source.snapshot_hash` detects metric changes.

## QR format

The QR payload uses compact fields:

```text
cwr1.<checksum>.<Base64URL of deflateRaw(JSON)>
cwr2.<checksum>.<Base64URL of deflateRaw(JSON)>
cwr2p.<transferId>.<partIndex>.<partCount>.<totalChecksum>.<partChecksum>.<chunk>
```

`cwr1` and `cwr2` are complete single-code payloads. `cwr2p` splits the cwr2 string into up to 12 reorderable parts. The mini program collects a transfer by transferId, validates the total checksum, reconstructs cwr2, and only then decompresses it. Multipart HTML rotates one data code at a time; the protocol does not require scan order.

The mini program validates the prefix and checksum before decompressing and parsing the payload. Future schema versions use the compact `v` field for compatibility.

Compact field `o` explicitly carries `latest`, `session`, `last-hours`, `today`, `last-7-days`, or `this-week`. `d[3]` and `d[4]` carry date boundaries. Today, last-seven-days, and this-week receipts continue to use cwr2 canonical facts. `last-hours` is a rolling window, so it uses the compatible cwr1 summary payload to avoid colliding with session-day fact identities; it stays in private history and does not participate in AI Work Cooperative accounting. The updated mini program can still import older QR codes.

When the same Codex session has multiple append-only log revisions, the generator keeps the more complete revision. Fact IDs in a cwr2 manifest must be unique; an identity collision stops QR generation instead of emitting an invalid payload.

`presentation.compensation` contains playful AI work points, not real API cost. For compatibility with the current Chinese mini program, QR display copy remains Chinese while compact fields `l` and `r` carry the desktop locale and language-neutral role ID. English HTML and local JSON remain fully localized.

See [mobile QR import](mobile-import.en.md).
