# Data schema, file, and QR protocol

<p><a href="./data-schema.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

The full receipt schema is currently version `2`; rolling-hour summaries remain on compatible version `1`. Each run saves both the full local record and a privacy-safe WeChat import file.

## Main fields

- `schema_version`: schema version
- `locale`: desktop receipt language, `zh-CN` or `en`
- `id`: anonymous ID derived from the metrics snapshot
- `generated_at`: generation time
- `source`: data source, selected `scope`, and collector version
- `period`: actual activity times, timezone, and `range_start_date` / `range_end_date` calendar boundaries
- `stats`: turns, messages, tools, Tokens, duration, and detailed local efficiency insights
- `presentation`: default theme, language-neutral `work_profile`, localized role, review, and AI work points
- `privacy`: explicit declaration of excluded sensitive content

The `id` remains stable for the same session, day, or calendar-boundary pair. Regeneration updates the record rather than creating duplicate history. `source.snapshot_hash` detects metric changes.

### Detailed local efficiency insights

`stats.insights` in the full JSON contains:

- `cache_hit_rate`: `cached_input_tokens / input_tokens`, or `0` when input is zero
- `per_turn`: total Tokens, output Tokens, tool calls, and average completion duration per completed turn
- `latency_ms.first_token`: sample count plus P50 and P90 first-token latency
- `latency_ms.turn`: sample count plus P50 and P90 completed-turn duration
- `activity_by_hour`: 24 hourly buckets in the receipt timezone; each completed or interrupted turn adds one
- `model_usage`: completed-turn counts attributed to each model
- `tool_usage`: privacy-safe category counts for terminal, file editing, browser, research, media, multi-agent, planning, integrations, and other tools

Percentiles use linear interpolation between adjacent samples and are rounded to milliseconds. Tool classification retains only stable categories, not raw tool names, arguments, commands, or output.

## WeChat import file

Each run writes a `*.cwr.json` file beside the HTML:

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

`payload` is exactly the compact structure obtained after decoding a QR payload. `integrity.digest` is a full SHA-256 over canonical payload JSON. It detects corruption but is not a source signature. The mini program must treat every file as untrusted input, enforce a size limit, validate versions, fields, numeric bounds, unique fact IDs, manifests, and content hashes, then persist atomically only after confirmation.

To preserve compatibility with existing mini programs, `stats.insights` currently stays in the local full JSON and HTML and is not added to the compact `cwr1` / `cwr2` payload. The compact payload continues to carry the existing accounting metrics.

Canonicalization recursively sorts every object's keys using JavaScript's default string order (UTF-16 code units), preserves array order, uses JSON primitive types, and emits no whitespace or trailing newline. Calculate SHA-256 over the resulting UTF-8 bytes. Use the digest in `docs/fixtures/cwr-file-v1.json` to cross-check another implementation.

A cross-repository compatibility fixture is available at `docs/fixtures/cwr-file-v1.json`.

## QR format

The QR payload uses compact fields:

```text
cwr1.<checksum>.<Base64URL of deflateRaw(JSON)>
cwr2.<checksum>.<Base64URL of deflateRaw(JSON)>
cwr2p.<transferId>.<partIndex>.<partCount>.<totalChecksum>.<partChecksum>.<chunk>
```

`cwr1` and `cwr2` are complete single-code payloads. The desktop generates one data QR only when the complete payload stays within the safe QR version; otherwise it provides only the `.cwr.json` file and does not generate new multipart codes.

`cwr2p` is the legacy reorderable cwr2 multipart format, limited to 12 parts. Updated mini programs should still collect historical parts by transferId, validate part and total checksums, reconstruct cwr2, and decompress it so existing receipts remain importable.

The mini program validates the prefix and checksum before decompressing and parsing the payload. Future schema versions use the compact `v` field for compatibility.

Compact field `o` explicitly carries `latest`, `session`, `last-hours`, `today`, `last-7-days`, or `this-week`. `d[3]` and `d[4]` carry date boundaries. Today, last-seven-days, and this-week receipts continue to use cwr2 canonical facts. `last-hours` is a rolling window, so it uses the compatible cwr1 summary payload to avoid colliding with session-day fact identities; it stays in private history and does not participate in AI Work Cooperative accounting. The updated mini program can still import older QR codes.

When the same Codex session has multiple append-only log revisions, the generator keeps the more complete revision. Fact IDs in a cwr2 manifest must be unique; an identity collision stops QR generation instead of emitting an invalid payload.

`presentation.compensation` contains playful AI work points, not real API cost. For compatibility with the current Chinese mini program, QR display copy remains Chinese while compact fields `l` and `r` carry the desktop locale and language-neutral role ID. English HTML and local JSON remain fully localized.

See [mobile file and single-QR import](mobile-import.en.md).
