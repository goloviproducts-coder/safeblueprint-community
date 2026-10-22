// Writes the threat entry for the current branch: classifies every file changed since the merge
// base with the base branch (same rules as the threat-model gate), and when anything is
// risk-relevant adds one completed row (component, STRIDE, threat, risk, mitigation, references)
// to THREAT_MODEL.md, then regenerates docs/threat-model/inventory.json. Re-running replaces this
// branch's earlier auto-drafted row (and its plain-English line in "Recent changes"), so the row always names every risk-relevant file.
// Usage: npm run threat-model:update            (write)
//        npm run threat-model:update -- --check (exit 1 if the row or inventory is missing/stale)
// Env: THREAT_MODEL_BASE (default origin/main).
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const gate = require("./threat-model-gate.js");
const gen = require("./threat-model-generate.js");

const root = path.join(__dirname, "..");
const MODEL = path.join(root, "THREAT_MODEL.md");
const INV = path.join(root, "docs", "threat-model", "inventory.json");
const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

function changedFiles(base) {
  const committed = git(["diff", "--name-only", base + "...HEAD"]).split("\n");
  const local = git(["diff", "--name-only", "HEAD"]).split("\n");
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
  return Array.from(new Set(committed.concat(local, untracked).filter(Boolean))).filter((f) => fs.existsSync(path.join(root, f)) || committed.includes(f)).sort();
}
// Insert after the last threat row of the "Threats and mitigations" table.
function insertRow(text, row) {
  const lines = text.split("\n");
  let last = -1;
  lines.forEach((l, i) => { if (/^\| T\d+[a-z]? \|/.test(l)) last = i; });
  if (last === -1) throw new Error("No threat table found in THREAT_MODEL.md");
  lines.splice(last + 1, 0, row);
  return lines.join("\n");
}
const PLAIN_HEADING = "## Recent changes in plain English";
// One everyday-language line per new entry, e.g. "- **T22**: Changed the security headers ...".
const PLAIN = [
  [/workflow|Threat-model gate|Repository controls/i, "changes how our automated build and checks run"],
  [/Dependencies|npm scripts/i, "changes the outside code libraries or build commands we use"],
  [/headers|nginx|Content-Security-Policy/i, "changes the browser security settings the site sends"],
  [/Container/i, "changes the self-host container"],
  [/Server function/i, "changes the hosted contact relay"],
  [/Schema|Core app logic|Service worker|Runtime config/i, "changes how the app loads questions, scores answers or builds reports"],
  [/(?:^Build, release)|deploy/i, "changes how releases are built or deployed"],
  [/(?:network|storage|DOM|origin|frames|inline|@import)|(?:^(?:Form|Input|Scripts loaded))/, "changes what the page loads, stores or sends"],
  [/ZAP/i, "changes the security scanner rules"],
];
function plainLine(id, risky) {
  const parts = [];
  risky.flatMap((r) => r.reasons).forEach((a) => { const m = PLAIN.find((p) => p[0].test(a)); const t = m ? m[1] : "makes a security-relevant change"; if (!parts.includes(t)) parts.push(t); });
  const files = risky.map((r) => "`" + r.file + "`").join(", ");
  return "- **" + id + "**: This change " + parts.join("; it also ") + " (" + files + "). The detailed entry below says what could go wrong and how it is handled. _(auto-drafted)_";
}
function insertPlain(text, line) {
  const lines = text.split("\n");
  const h = lines.indexOf(PLAIN_HEADING);
  if (h === -1) return text;
  let i = h + 1;
  while (i < lines.length && !/^## /.test(lines[i])) i++;
  while (i > h + 1 && lines[i - 1].trim() === "") i--;
  lines.splice(i, 0, line);
  return lines.join("\n");
}
function update(opts) {
  opts = opts || {};
  const base = opts.base || process.env.THREAT_MODEL_BASE || "origin/main";
  const mergeBase = git(["merge-base", base, "HEAD"]);
  const branch = opts.label || git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const baseModel = gate.gitShow(root, mergeBase, "THREAT_MODEL.md");
  const current = fs.readFileSync(MODEL, "utf8");
  // Drop this branch's earlier auto-drafted rows; hand-written rows are kept.
  const added = new Set(gate.addedRows(baseModel, current).filter((l) => /\| Auto-drafted[^|]*\|\s*$/.test(l)));
  const addedIds = Array.from(added).map((l) => /^\| (T\d+[a-z]?) \|/.exec(l)[1]);
  let text = current.split("\n").filter((l) => !added.has(l) && !addedIds.some((id) => l.startsWith("- **" + id + "**:") && l.endsWith("_(auto-drafted)_"))).join("\n");
  const r = gate.evaluate(changedFiles(base), { root, baseRef: mergeBase, modelBefore: baseModel, modelText: text });
  if (r.risky.length && r.missing.length) {
    const id = gate.nextThreatId(text);
    text = insertPlain(insertRow(text, gate.draftEntry(id, r.risky, branch)), plainLine(id, r.risky));
  }
  const inv = gen.render();
  const stale = text !== current || fs.readFileSync(INV, "utf8") !== inv;
  if (!opts.check) {
    if (text !== current) fs.writeFileSync(MODEL, text);
    fs.writeFileSync(INV, inv);
  }
  return { result: r, stale, wroteRow: text !== current };
}

if (require.main === module) {
  const check = process.argv.includes("--check");
  const { result, stale } = update({ check });
  if (!result.risky.length) console.log("No risk-relevant changes; no threat entry needed.");
  else console.log("Risk-relevant files: " + result.risky.map((r) => r.file).join(", "));
  if (check && stale) { console.error("THREAT_MODEL.md or inventory.json is out of date. Run `npm run threat-model:update` and commit the result."); process.exit(1); }
  console.log(check ? "Threat model is up to date." : (stale ? "Updated THREAT_MODEL.md / inventory.json. Review the row and commit it." : "Threat model already up to date."));
}
module.exports = { update, insertRow, insertPlain, plainLine };
