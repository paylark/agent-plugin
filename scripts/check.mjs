// Checks that every client manifest agrees on name, version and MCP server,
// and that every skill has valid frontmatter. Run after changing a manifest.
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const errors = [];
const fail = (msg) => errors.push(msg);

const claude = read(".claude-plugin/plugin.json");
const { name, version } = claude;

// Every manifest, with the name and version it declares.
const market = read(".claude-plugin/marketplace.json");
const entry = market.plugins?.find((p) => p.name === name);
if (!entry) fail(`.claude-plugin/marketplace.json: no plugin named ${name}`);
else if (entry.source !== "./") fail(`.claude-plugin/marketplace.json: source ${entry.source}, expected ./`);

const codexMarket = read(".agents/plugins/marketplace.json");
const codexEntry = codexMarket.plugins?.find((p) => p.name === name);
if (!codexEntry) fail(`.agents/plugins/marketplace.json: no plugin named ${name}`);
else if (codexEntry.source?.path !== "./") fail(`.agents/plugins/marketplace.json: source path ${codexEntry.source?.path}, expected ./`);

const manifests = {
  ".claude-plugin/marketplace.json": { name: market.name, version: market.metadata?.version },
  ".agents/plugins/marketplace.json": { name: codexMarket.name },
  ".cursor-plugin/plugin.json": read(".cursor-plugin/plugin.json"),
  ".codex-plugin/plugin.json": read(".codex-plugin/plugin.json"),
  "gemini-extension.json": read("gemini-extension.json"),
  "plugin.json": read("plugin.json"),
};
for (const [file, m] of Object.entries(manifests)) {
  if (m.name !== name) fail(`${file}: name ${m.name}, expected ${name}`);
  if ("version" in m && m.version !== version) fail(`${file}: version ${m.version}, expected ${version}`);
}

// Paths a manifest points at must exist.
const cursor = manifests[".cursor-plugin/plugin.json"];
const codex = manifests[".codex-plugin/plugin.json"];
for (const [file, p] of [
  [".claude-plugin/plugin.json icon", claude.icon],
  [".cursor-plugin/plugin.json skills", cursor.skills],
  [".cursor-plugin/plugin.json mcpServers", cursor.mcpServers],
  [".codex-plugin/plugin.json skills", codex.skills],
  [".codex-plugin/plugin.json mcpServers", codex.mcpServers],
  [".codex-plugin/plugin.json logo", codex.interface?.logo],
  [".codex-plugin/plugin.json composerIcon", codex.interface?.composerIcon],
]) {
  if (p !== undefined && !existsSync(p)) fail(`${file}: ${p} does not exist`);
}

// Every MCP config must define the server at <base>/mcp. Claude Code takes the
// base from userConfig; the other clients from the PAYLARK_API_BASE env var.
const mcp = {
  ".mcp.json": [read(".mcp.json").mcpServers?.[name], "url", "${user_config.api_base}/mcp"],
  [cursor.mcpServers]: [read(cursor.mcpServers).mcpServers?.[name], "url", "${env:PAYLARK_API_BASE}/mcp"],
  "gemini-extension.json": [manifests["gemini-extension.json"].mcpServers?.[name], "httpUrl", "${PAYLARK_API_BASE}/mcp"],
};
for (const [file, [server, key, want]] of Object.entries(mcp)) {
  if (!server) { fail(`${file}: no ${name} MCP server`); continue; }
  if (server[key] !== want) fail(`${file}: MCP ${key} ${server[key]}, expected ${want}`);
  // The bundled configs sign in with OAuth; an API key belongs only in a user's own config.
  if (server.headers) fail(`${file}: MCP server sets headers; bundled configs must use OAuth sign-in`);
}
if (!claude.userConfig?.api_base) fail(".claude-plugin/plugin.json: userConfig.api_base missing");
if (claude.userConfig?.api_key) fail(".claude-plugin/plugin.json: userConfig.api_key is not used with OAuth sign-in");

// Gemini prompts for every env var its MCP config uses.
const gemini = manifests["gemini-extension.json"];
const geminiVars = new Set((gemini.settings ?? []).map((s) => s.envVar));
for (const v of JSON.stringify(gemini.mcpServers).matchAll(/\$\{(\w+)\}/g)) {
  if (!geminiVars.has(v[1])) fail(`gemini-extension.json: ${v[1]} is used but not in settings`);
}

// Skills: one folder each, SKILL.md with a name matching the folder and a description.
const skills = readdirSync("skills", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const dir of skills) {
  const file = `skills/${dir}/SKILL.md`;
  if (!existsSync(file)) { fail(`${file} missing`); continue; }
  const m = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { fail(`${file}: no frontmatter`); continue; }
  const skillName = m[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  if (skillName !== dir) fail(`${file}: name "${skillName}" != folder "${dir}"`);
  const desc = m[1].match(/^description:\s*(.+)$/m)?.[1].trim() ?? "";
  if (!desc) fail(`${file}: missing description`);
  else if (desc.length > 1024) fail(`${file}: description is ${desc.length} chars, max 1024`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${name} ${version}: ${Object.keys(manifests).length + 1} manifests and ${skills.length} skills OK`);
