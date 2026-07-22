import crypto from "node:crypto";
import zlib from "node:zlib";
import QRCode from "qrcode";

import { compactReceipt } from "./transfer-record.mjs";

export { compactReceipt } from "./transfer-record.mjs";

const MAX_QR_VERSION = 25;
const MAX_MULTIPART_PARTS = 12;

function checksum(value, length = 8) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, length);
}

function encodeCompact(prefix, compact) {
  const compressed = zlib.deflateRawSync(Buffer.from(JSON.stringify(compact), "utf8"));
  return `${prefix}.${checksum(compressed)}.${compressed.toString("base64url")}`;
}

export function encodeReceiptPayload(record) {
  return encodeCompact(record.schema_version === 2 ? "cwr2" : "cwr1", compactReceipt(record));
}

function qrVersion(payload) {
  return QRCode.create(payload, { errorCorrectionLevel: "M" }).version;
}

function fitsVersion(payload, maxVersion) {
  try {
    return qrVersion(payload) <= maxVersion;
  } catch {
    return false;
  }
}

export function encodeSingleReceiptQr(record, options = {}) {
  const maxVersion = options.maxVersion || MAX_QR_VERSION;
  const payload = encodeReceiptPayload(record);
  if (!fitsVersion(payload, maxVersion)) return null;
  return { payload, version: qrVersion(payload) };
}

function decodeSinglePayload(payload) {
  const [prefix, expectedChecksum, encoded] = String(payload).split(".");
  if ((prefix !== "cwr1" && prefix !== "cwr2") || !expectedChecksum || !encoded) {
    throw new Error("无效的打工小票二维码");
  }
  const compressed = Buffer.from(encoded, "base64url");
  if (checksum(compressed) !== expectedChecksum) throw new Error("二维码数据校验失败");
  return JSON.parse(zlib.inflateRawSync(compressed).toString("utf8"));
}

export function decodeReceiptPayload(payload) {
  return decodeSinglePayload(payload);
}

export function decodeMultipartReceiptPayloads(payloads) {
  const parts = payloads.map((payload) => {
    const fields = String(payload).split(".");
    const [prefix, transferId, indexText, countText, totalChecksum, partChecksum] = fields;
    const chunk = fields.slice(6).join(".");
    const index = Number(indexText);
    const count = Number(countText);
    if (
      prefix !== "cwr2p" || !transferId || !totalChecksum || !chunk ||
      !Number.isInteger(index) || !Number.isInteger(count) || index < 1 || index > count || count > MAX_MULTIPART_PARTS ||
      checksum(chunk) !== partChecksum
    ) throw new Error("无效的分片二维码");
    return { transferId, index, count, totalChecksum, chunk };
  });
  if (!parts.length) throw new Error("缺少分片二维码");
  const first = parts[0];
  if (parts.some((part) => (
    part.transferId !== first.transferId || part.count !== first.count || part.totalChecksum !== first.totalChecksum
  ))) throw new Error("分片二维码不属于同一张小票");
  const unique = new Map(parts.map((part) => [part.index, part]));
  if (unique.size !== first.count) throw new Error("分片二维码尚未集齐");
  const singlePayload = [...unique.values()].sort((left, right) => left.index - right.index).map((part) => part.chunk).join("");
  if (checksum(singlePayload) !== first.totalChecksum) throw new Error("分片二维码总校验失败");
  return decodeSinglePayload(singlePayload);
}

export function inspectReceiptPayloadPart(payload) {
  const fields = String(payload).split(".");
  const [prefix, transferId, indexText, countText, totalChecksum, partChecksum] = fields;
  const chunk = fields.slice(6).join(".");
  if (prefix !== "cwr2p") return null;
  const index = Number(indexText);
  const count = Number(countText);
  if (!transferId || !chunk || checksum(chunk) !== partChecksum || !Number.isInteger(index) || !Number.isInteger(count)) {
    throw new Error("无效的分片二维码");
  }
  return { transferId, index, count, totalChecksum };
}
