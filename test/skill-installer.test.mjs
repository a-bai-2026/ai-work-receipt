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
import {
  CODEX_PET_NAME,
  getCodexPetInstallPath,
  installCodexPet,
  uninstallCodexPet,
} from "../src/core/pet-installer.mjs";

test("安装参数会切换到 Skill 安装模式", () => {
  const options = parseArgs(["--install-skill", "--lang", "en"]);
  assert.equal(options.installSkill, true);
  assert.equal(options.mode, "latest");
  assert.equal(options.locale, "en");
  assert.throws(() => parseArgs(["--lang", "fr"]), /不支持的语言/);
});

test("Companion 与 Pet 参数会切换到对应安装模式", () => {
  assert.equal(parseArgs(["--install-companion"]).installCompanion, true);
  assert.equal(parseArgs(["--install-pet"]).installPet, true);
  assert.equal(parseArgs(["--uninstall-pet"]).uninstallPet, true);
});

test("自动保存管理参数可以独立解析且不会混入统计范围", () => {
  assert.equal(parseArgs(["--setup"]).setup, true);
  assert.equal(parseArgs(["--enable-auto"]).enableAuto, true);
  assert.equal(parseArgs(["--disable-auto"]).disableAuto, true);
  assert.equal(parseArgs(["--auto-status"]).autoStatus, true);
  assert.throws(() => parseArgs(["--enable-auto", "--today"]), /不能与统计范围参数同时使用/);
  assert.throws(() => parseArgs(["--enable-auto", "--disable-auto"]), /不能同时使用/);
  assert.throws(() => parseArgs(["--enable-auto", "--timezone", "Mars/Olympus"]), /不支持的时区/);
  assert.throws(() => parseArgs(["--enable-auto", "--install-companion"]), /不能与 Skill 或桌宠管理参数同时使用/);
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

test("Codex Pet 会安装到 CODEX_HOME 并只卸载自己的目录", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-work-receipt-pet-"));
  const projectDir = path.join(tempDir, "project");
  const codexHome = path.join(tempDir, "codex-home");
  const sourceDir = path.join(projectDir, "assets", "codex-pet", CODEX_PET_NAME);
  const targetDir = getCodexPetInstallPath({ codexHome });
  const otherPet = path.join(codexHome, "pets", "other-pet");

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, "pet.json"), '{"id":"ai-work-receipt"}\n', "utf8");
  fs.writeFileSync(path.join(sourceDir, "spritesheet.webp"), "webp", "utf8");
  fs.mkdirSync(otherPet, { recursive: true });
  fs.writeFileSync(path.join(otherPet, "pet.json"), "{}\n", "utf8");

  const installed = installCodexPet({ projectDir, codexHome });
  assert.equal(installed.targetDir, targetDir);
  assert.equal(fs.existsSync(path.join(targetDir, "pet.json")), true);

  const removed = uninstallCodexPet({ codexHome });
  assert.equal(removed.existed, true);
  assert.equal(fs.existsSync(targetDir), false);
  assert.equal(fs.existsSync(otherPet), true);
});
