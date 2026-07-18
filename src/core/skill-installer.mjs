import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CODEX_SKILL_NAME = "ai-work-receipt";

export function getCodexSkillInstallPath(homeDir = os.homedir()) {
  return path.join(homeDir, ".agents", "skills", CODEX_SKILL_NAME);
}

export function installCodexSkill({ projectDir, homeDir = os.homedir() } = {}) {
  if (!projectDir) throw new Error("安装 Skill 时缺少项目目录");

  const sourceDir = path.join(projectDir, "skills", CODEX_SKILL_NAME);
  const sourceEntry = path.join(sourceDir, "SKILL.md");
  if (!fs.existsSync(sourceEntry)) {
    throw new Error(`发布包中缺少 Skill：${sourceEntry}`);
  }

  const targetDir = getCodexSkillInstallPath(homeDir);
  const targetParent = path.dirname(targetDir);
  const stagingDir = path.join(
    targetParent,
    `.${CODEX_SKILL_NAME}.install-${process.pid}-${Date.now()}`,
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
