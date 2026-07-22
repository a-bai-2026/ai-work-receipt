import fs from "node:fs";
import path from "node:path";

import { buildCanonicalFacts } from "./fact-buckets.mjs";
import { createReceiptFile } from "./file-payload.mjs";
import { collectMetrics } from "./metrics.mjs";
import { outputSlugForRange, resolveRange } from "./range.mjs";
import {
  buildReceiptRecord,
  persistReceiptRecord,
  transferFilePathForOutput,
} from "./receipt-record.mjs";
import { loadCodexSessions } from "../parsers/codex.mjs";
import { renderHtml } from "../renderers/html.mjs";
import { writeFileAtomicSync } from "../lib/files.mjs";

function mimeTypeForImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".svg") return "image/svg+xml";
  throw new Error(`不支持的小程序码图片格式：${extension || "未知"}`);
}

function imageAsDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return `data:${mimeTypeForImage(filePath)};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

export async function generateReceipt(
  options,
  {
    projectDir,
    now = new Date(),
    createDataQr = null,
    codexHome = null,
  } = {},
) {
  if (!projectDir) throw new Error("生成小票时缺少项目目录");

  const range = resolveRange(options.mode, options.timezone, now, options.sessionId, options.hours);
  const sessions = loadCodexSessions(range, { codexHome });
  const metrics = collectMetrics(sessions, range);
  const observedAt = now.toISOString();
  const canonical = range.scope === "last-hours"
    ? {}
    : buildCanonicalFacts(sessions, range, { observedAt });
  const record = buildReceiptRecord(metrics, options.theme, options.locale, canonical);

  const defaultOutputDir = path.join(process.cwd(), "codex-work-receipt-output");
  const requestedOutput = options.output || path.join(
    defaultOutputDir,
    `codex-receipt-${outputSlugForRange(range, record.id)}.html`,
  );
  const outputFile = path.resolve(/\.html?$/i.test(requestedOutput) ? requestedOutput : `${requestedOutput}.html`);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const transferFile = createReceiptFile(record);
  const transferPath = transferFilePathForOutput(outputFile);
  let dataQrDataUrl = null;
  let dataQrVersion = null;
  if (typeof createDataQr === "function") {
    try {
      const dataQr = await createDataQr(record);
      dataQrDataUrl = dataQr?.dataUrl || null;
      dataQrVersion = dataQr?.version || null;
    } catch {
      dataQrDataUrl = null;
      dataQrVersion = null;
    }
  }

  const miniProgramCodeDataUrl = imageAsDataUrl(path.join(projectDir, "assets", "miniprogram-code.png"));
  writeFileAtomicSync(
    outputFile,
    renderHtml({
      record,
      dataQrDataUrl,
      miniProgramCodeDataUrl,
      transferFile: {
        ...transferFile,
        filename: path.basename(transferPath),
      },
    }),
  );
  const persisted = persistReceiptRecord(record, outputFile, options.dataDir, transferFile);

  return {
    range,
    record,
    outputFile,
    persisted,
    dataQrDataUrl,
    dataQrVersion,
    miniProgramCodeDataUrl,
  };
}
