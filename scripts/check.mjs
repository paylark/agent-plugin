// Checks that plugin manifests agree with each other and every skill has valid frontmatter.
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const errors = [];

const claude = read(".claude-plugin/plugin.json");
const market = read(".claude-plugin/marketplace.json");
const cursor = read(".cursor-plugin/plugin.json");
const entry = market.plugins.find((p) => p.name === claude.name);

if (!entry) errors.push(`marketplace.json has no plugin named ${claude.name}`);
if (cursor.name !== claude.name) errors.push(`cursor name ${cursor.name} != ${claude.name}`);
for (const [file, v] of [
  ["marketplace.json metadata", market.metadata?.version],
  [".cursor-plugin/plugin.json", cursor.version],
]) {
  if (v !== claude.version) errors.push(`${file} version ${v} != plugin.json ${claude.version}`);
}
for (const p of [".mcp.json", ".cursor-plugin/mcp.json"]) {
  if (!read(p).mcpServers?.[claude.name]) errors.push(`${p} has no ${claude.name} server`);
}

for (const dir of readdirSync("skills")) {
  const file = `skills/${dir}/SKILL.md`;
  if (!existsSync(file)) { errors.push(`${file} missing`); continue; }
  const m = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { errors.push(`${file}: no frontmatter`); continue; }
  const name = m[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  if (name !== dir) errors.push(`${file}: name "${name}" != folder "${dir}"`);
  if (!/^description:\s*\S/m.test(m[1])) errors.push(`${file}: missing description`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${claude.name} ${claude.version}: manifests and ${readdirSync("skills").length} skills OK`);
