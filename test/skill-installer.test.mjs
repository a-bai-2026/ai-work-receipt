import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseArgs } from "../src/core/args.mjs";
import {
  CODEX_SKILL_NAME,
  getCodexSkillInstallPath,
  installCodexSkill,
} from "../src/core/skill-installer.mjs";

test("安装参数会切换到 Skill 安装模式", () => {
  const options = parseArgs(["--install-skill"]);
  assert.equal(options.installSkill, true);
  assert.equal(options.mode, "latest");
});

test("Codex Skill 会安装到用户目录并安全覆盖旧版本", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-skill-"));
  const projectDir = path.join(tempDir, "project");
  const homeDir = path.join(tempDir, "home");
  const sourceDir = path.join(projectDir, "skills", CODEX_SKILL_NAME);
  const targetDir = getCodexSkillInstallPath(homeDir);

  fs.mkdirSync(path.join(sourceDir, "agents"), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "SKILL.md"), "---\nname: ai-work-receipt\ndescription: test\n---\n", "utf8");
  fs.writeFileSync(path.join(sourceDir, "agents", "openai.yaml"), "interface: {}\n", "utf8");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "stale.txt"), "old", "utf8");

  const installed = installCodexSkill({ projectDir, homeDir });

  assert.equal(installed.targetDir, targetDir);
  assert.equal(fs.readFileSync(path.join(targetDir, "SKILL.md"), "utf8").includes("ai-work-receipt"), true);
  assert.equal(fs.existsSync(path.join(targetDir, "agents", "openai.yaml")), true);
  assert.equal(fs.existsSync(path.join(targetDir, "stale.txt")), false);
});
