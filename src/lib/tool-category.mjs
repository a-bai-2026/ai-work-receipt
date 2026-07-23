const TOOL_CATEGORIES = new Set([
  "terminal",
  "file-edit",
  "browser",
  "research",
  "media",
  "agents",
  "planning",
  "integrations",
  "other",
]);

export function normalizeToolCategory(value) {
  return TOOL_CATEGORIES.has(value) ? value : "other";
}

export function classifyToolName(value) {
  const name = String(value || "").trim().toLowerCase();
  if (!name) return "other";
  if (/(^|[_.-])(apply[_-]?patch|edit(?:[_-]?file)?|write(?:[_-]?file)?)$/.test(name)) return "file-edit";
  if (/browser|playwright|computer|chrome|navigate|screenshot/.test(name)) return "browser";
  if (/web[_-]?search|search[_-]?docs|fetch[_-]?doc|openai.*docs/.test(name)) return "research";
  if (/image|audio|video|canvas|view[_-]?image/.test(name)) return "media";
  if (/spawn[_-]?agent|send[_-]?message|followup[_-]?task|wait[_-]?agent|collaboration/.test(name)) return "agents";
  if (/update[_-]?plan|request[_-]?user[_-]?input|create[_-]?goal|update[_-]?goal/.test(name)) return "planning";
  if (/exec|shell|bash|terminal|write[_-]?stdin|command/.test(name)) return "terminal";
  if (/^mcp__|connector|plugin|slack|github|notion|linear|figma/.test(name)) return "integrations";
  return "other";
}

export function toolCategoryForRow(row) {
  if (row?.type !== "response_item") return null;
  const payloadType = row.payload?.type;
  if (payloadType !== "custom_tool_call" && payloadType !== "function_call") return null;
  return normalizeToolCategory(row.payload?.tool_category);
}
