import crypto from "node:crypto";
import zlib from "node:zlib";

export function compactReceipt(record) {
  return {
    v: record.schema_version,
    i: record.id,
    g: record.generated_at,
    d: [record.period.start_at, record.period.end_at, record.period.timezone],
    s: [
      record.stats.session_count,
      record.stats.completed_turns,
      record.stats.user_messages,
      record.stats.tool_calls,
      record.stats.interruptions,
      record.stats.work_duration_ms,
      record.stats.average_first_token_ms,
    ],
    t: [
      record.stats.tokens.input_tokens,
      record.stats.tokens.cached_input_tokens,
      record.stats.tokens.output_tokens,
      record.stats.tokens.reasoning_output_tokens,
      record.stats.tokens.total_tokens,
    ],
    m: record.stats.models,
    p: [
      record.presentation.default_theme,
      record.presentation.work_title,
      record.presentation.review,
      record.presentation.compensation
        ? [
            record.presentation.compensation.label,
            record.presentation.compensation.amount,
            record.presentation.compensation.unit,
            record.presentation.compensation.note,
            record.presentation.compensation.formula_version,
          ]
        : null,
    ],
  };
}

export function encodeReceiptPayload(record) {
  const compressed = zlib.deflateRawSync(Buffer.from(JSON.stringify(compactReceipt(record)), "utf8"));
  const checksum = crypto.createHash("sha256").update(compressed).digest("hex").slice(0, 8);
  return `cwr1.${checksum}.${compressed.toString("base64url")}`;
}

export function decodeReceiptPayload(payload) {
  const [prefix, checksum, encoded] = String(payload).split(".");
  if (prefix !== "cwr1" || !checksum || !encoded) throw new Error("无效的打工小票二维码");
  const compressed = Buffer.from(encoded, "base64url");
  const actual = crypto.createHash("sha256").update(compressed).digest("hex").slice(0, 8);
  if (actual !== checksum) throw new Error("二维码数据校验失败");
  return JSON.parse(zlib.inflateRawSync(compressed).toString("utf8"));
}
