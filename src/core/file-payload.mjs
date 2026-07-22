import { canonicalStringify, sha256Hex } from "./canonical.mjs";
import { compactReceipt } from "./transfer-record.mjs";

export const RECEIPT_FILE_FORMAT = "codex-work-receipt";
export const RECEIPT_FILE_VERSION = 1;
export const RECEIPT_FILE_MIME_TYPE = "application/vnd.codex-work-receipt+json";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function payloadSchemaFor(record) {
  return record.schema_version === 2 ? "cwr2" : "cwr1";
}

export function buildReceiptFileEnvelope(record) {
  const payload = compactReceipt(record);
  return {
    format: RECEIPT_FILE_FORMAT,
    file_version: RECEIPT_FILE_VERSION,
    payload_schema: payloadSchemaFor(record),
    payload,
    integrity: {
      algorithm: "sha256",
      digest: sha256Hex(canonicalStringify(payload)),
    },
  };
}

export function serializeReceiptFileEnvelope(envelope) {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function createReceiptFile(record) {
  const envelope = buildReceiptFileEnvelope(record);
  return {
    envelope,
    content: serializeReceiptFileEnvelope(envelope),
    mimeType: RECEIPT_FILE_MIME_TYPE,
  };
}

export function decodeReceiptFile(value) {
  let envelope;
  try {
    envelope = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error("微信导入文件不是有效的 JSON");
  }
  if (!isObject(envelope) || envelope.format !== RECEIPT_FILE_FORMAT) {
    throw new Error("不是有效的 AI 打工小票导入文件");
  }
  if (envelope.file_version !== RECEIPT_FILE_VERSION) {
    throw new Error(`不支持的导入文件版本：${envelope.file_version}`);
  }
  if (envelope.payload_schema !== "cwr1" && envelope.payload_schema !== "cwr2") {
    throw new Error(`不支持的小票数据协议：${envelope.payload_schema}`);
  }
  if (!isObject(envelope.payload) || envelope.payload.v !== Number(envelope.payload_schema.slice(3))) {
    throw new Error("导入文件的数据协议与内容不一致");
  }
  if (
    !isObject(envelope.integrity) ||
    envelope.integrity.algorithm !== "sha256" ||
    !/^[a-f0-9]{64}$/.test(String(envelope.integrity.digest || ""))
  ) {
    throw new Error("导入文件缺少有效的完整性校验");
  }
  const actualDigest = sha256Hex(canonicalStringify(envelope.payload));
  if (actualDigest !== envelope.integrity.digest) {
    throw new Error("微信导入文件完整性校验失败");
  }
  return envelope.payload;
}
