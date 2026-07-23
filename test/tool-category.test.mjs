import assert from "node:assert/strict";
import test from "node:test";

import { classifyToolName } from "../src/lib/tool-category.mjs";

test("工具名只映射为稳定的隐私安全类别", () => {
  assert.equal(classifyToolName("apply_patch"), "file-edit");
  assert.equal(classifyToolName("functions.write_file"), "file-edit");
  assert.equal(classifyToolName("functions.exec"), "terminal");
  assert.equal(classifyToolName("functions.write_stdin"), "terminal");
  assert.equal(classifyToolName("mcp__browser__navigate"), "browser");
  assert.equal(classifyToolName("mcp__openaiDeveloperDocs__search_openai_docs"), "research");
  assert.equal(classifyToolName("collaboration.spawn_agent"), "agents");
  assert.equal(classifyToolName("mcp__private_service__custom_action"), "integrations");
  assert.equal(classifyToolName("customer-specific-tool"), "other");
});
