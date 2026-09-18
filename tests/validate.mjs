#!/usr/bin/env node
// tests/validate.mjs — local validator for the mermail-bounty-radar companion skill.
// Mirrors the official repo's CI checks: structure, frontmatter, size, placeholders, secrets.
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = join(root, "skills", "mermail-bounty-radar");
let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL:", msg); };
const ok = (msg) => console.log("ok:", msg);

// 1. Required layout
for (const p of ["SKILL.md", "agents/openai.yaml", "references/tools.md", "references/security.md"]) {
  existsSync(join(skillDir, p)) ? ok(p) : fail("missing " + p);
}

// 2. Frontmatter name == folder name
const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
const fm = skill.match(/^---\n([\s\S]*?)\n---/);
const name = fm && fm[1].match(/^name:\s*(\S+)/m)?.[1];
name === "mermail-bounty-radar" ? ok("frontmatter name matches folder") : fail("frontmatter name mismatch: " + name);

// description present and non-trivial
const desc = fm && fm[1].match(/^description:\s*(.+)/m)?.[1];
desc && desc.length > 40 ? ok("description present") : fail("description missing or too short");

// 3. SKILL.md <= 500 lines
const lines = skill.split("\n").length;
lines <= 500 ? ok(`SKILL.md ${lines} lines (<=500)`) : fail(`SKILL.md too long: ${lines}`);

// 4. No placeholders
const all = readdirSync(skillDir, { recursive: true }).filter(f => f.endsWith(".md") || f.endsWith(".yaml"));
for (const f of all) {
  const c = readFileSync(join(skillDir, f), "utf8");
  if (/TODO|REPLACE_ME|XXX/.test(c)) fail("placeholder in " + f);
}
ok("no placeholders");

// 5. openai.yaml wiring
const oy = readFileSync(join(skillDir, "agents/openai.yaml"), "utf8");
oy.includes("Use $mermail-bounty-radar") ? ok("openai.yaml skill reference") : fail("openai.yaml missing Use $mermail-bounty-radar");
oy.includes("https://console.mermail.app/mcp") ? ok("openai.yaml MCP dependency") : fail("openai.yaml missing Mermail MCP");

// 6. Scenarios valid
const scenarios = JSON.parse(readFileSync(join(root, "tests/scenarios.json"), "utf8"));
const good = scenarios.every(s => s.prompt && s.skill === "mermail-bounty-radar" &&
  Array.isArray(s.tools) && ["none","write-preview","external-effect","destructive"].includes(s.approval) && s.expected);
good ? ok(`${scenarios.length} scenarios valid`) : fail("scenarios.json invalid entries");

// 7. No secrets in tracked files (allow env-var *names*, not values)
const secretRe = /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/i;
const checkFiles = [...all.map(f => join(skillDir, f)),
  join(root, "scripts/extract-opportunity.mjs"), join(root, "scripts/score-opportunity.mjs")];
for (const f of checkFiles) {
  if (secretRe.test(readFileSync(f, "utf8"))) fail("possible secret in " + f);
}
ok("no secrets");

// 8. Scripts are executable node programs
for (const s of ["scripts/extract-opportunity.mjs", "scripts/score-opportunity.mjs"]) {
  try { readFileSync(join(root, s), "utf8").includes("#!/usr/bin/env node") ? ok(s) : fail(s + " missing shebang"); }
  catch { fail("missing " + s); }
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
