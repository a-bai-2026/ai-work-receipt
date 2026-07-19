import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CODEX_PET_NAME = "ai-work-receipt";

export function getCodexPetHome({ homeDir = os.homedir(), codexHome = null } = {}) {
  return path.resolve(codexHome || process.env.CODEX_HOME || path.join(homeDir, ".codex"));
}

export function getCodexPetInstallPath(options = {}) {
  return path.join(getCodexPetHome(options), "pets", CODEX_PET_NAME);
}

export function installCodexPet({ projectDir, homeDir = os.homedir(), codexHome = null } = {}) {
  if (!projectDir) throw new Error("安装 Pet 时缺少项目目录");

  const sourceDir = path.join(projectDir, "assets", "codex-pet", CODEX_PET_NAME);
  const sourceManifest = path.join(sourceDir, "pet.json");
  const sourceSpritesheet = path.join(sourceDir, "spritesheet.webp");
  if (!fs.existsSync(sourceManifest) || !fs.existsSync(sourceSpritesheet)) {
    throw new Error(`发布包中缺少 Codex Pet：${sourceDir}`);
  }

  const targetDir = getCodexPetInstallPath({ homeDir, codexHome });
  const targetParent = path.dirname(targetDir);
  const stagingDir = path.join(
    targetParent,
    `.${CODEX_PET_NAME}.install-${process.pid}-${Date.now()}`,
  );

  fs.mkdirSync(targetParent, { recursive: true });
  try {
    fs.cpSync(sourceDir, stagingDir, { recursive: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.renameSync(stagingDir, targetDir);
  } catch (error) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }

  return { sourceDir, targetDir };
}

export function uninstallCodexPet({ homeDir = os.homedir(), codexHome = null } = {}) {
  const targetDir = getCodexPetInstallPath({ homeDir, codexHome });
  const existed = fs.existsSync(targetDir);
  fs.rmSync(targetDir, { recursive: true, force: true });
  return { targetDir, existed };
}
