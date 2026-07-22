import fs from "node:fs";
import path from "node:path";

function stagingPathFor(filePath) {
  return path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.write-${process.pid}-${Date.now()}`,
  );
}

function replaceFile(stagingPath, filePath) {
  try {
    fs.renameSync(stagingPath, filePath);
  } catch (error) {
    if (process.platform !== "win32" || !fs.existsSync(filePath)) throw error;
    fs.rmSync(filePath, { force: true });
    fs.renameSync(stagingPath, filePath);
  }
}

export function writeFileAtomicSync(filePath, content, encoding = "utf8") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const stagingPath = stagingPathFor(filePath);
  try {
    fs.writeFileSync(stagingPath, content, encoding);
    replaceFile(stagingPath, filePath);
  } catch (error) {
    fs.rmSync(stagingPath, { force: true });
    throw error;
  }
}

export function writeJsonAtomicSync(filePath, value) {
  writeFileAtomicSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeWithAtomicFileSync(filePath, write) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const stagingPath = stagingPathFor(filePath);
  let descriptor = null;
  try {
    descriptor = fs.openSync(stagingPath, "w");
    write(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    replaceFile(stagingPath, filePath);
  } catch (error) {
    if (descriptor !== null) fs.closeSync(descriptor);
    fs.rmSync(stagingPath, { force: true });
    throw error;
  }
}
