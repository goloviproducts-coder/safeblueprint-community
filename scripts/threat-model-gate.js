// Threat-model gate (semantic). Classifies each changed file by comparing its content on the
// base branch with the PR head:
//   cosmetic  - markup/nav/copy, CSS without new origins, SRI hashes, SHA256SUMS, tests, docs
//   risk      - new or changed data flow (fetch/XHR/WebSocket/beacon/postMessage), form action or
//               input field, external origin, CSP or security headers, storage, DOM/eval sinks,
//               schema content, workflows/permissions, dependencies, build/deploy tooling.
// Cosmetic-only PRs pass. Risk-relevant PRs pass when THREAT_MODEL.md gains, in the same PR, a
// threat row that names every risk-relevant file (`npm run threat-model:update` writes it). No
// label is needed. Dependabot PRs that only touch package.json/package-lock.json pass on their
// own; the job summary still shows the draft entry. The PR approval is the human sign-off.
// Usage: node scripts/threat-model-gate.js <changed-files.txt>
// Env: BASE_REF (commit to read "before" content from, via git show), PR_AUTHOR,
//      GITHUB_STEP_SUMMARY.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { apis, origins, htmlFacts } = require("./threat-model-generate.js");

const MODEL_FILES = ["THREAT_MODEL.md", "docs/threat-model/safeblueprint.json", "docs/threat-model/inventory.json"];
const GATE_FILES = ["scripts/threat-model-gate.js", "scripts/threat-model-generate.js", "scripts/threat-model-draft.js", ".githooks/pre-push", "test/threat-model-gate.test.js", ".github/workflows/threat-model-gate.yml"];

// Paths that are risk-relevant whatever the change.
const PATH_RULES = [
  { area: "Threat-model gate itself", test: (f) => GATE_FILES.includes(f) },
  { area: "CI/CD workflows and permissions", test: (f) => f.startsWith(".github/workflows/") || f.startsWith(".github/actions/") },
  { area: "Repository controls", test: (f) => f === ".github/CODEOWNERS" || f === ".github/dependabot.yml" },
  { area: "Dependencies (lockfile)", test: (f) => f === "package-lock.json" || f === ".npmrc" },
  { area: "Security headers", test: (f) => f === "site/_headers" || f === "site/_redirects" },
  { area: "Self-host server (nginx)", test: (f) => f === "nginx.conf" },
  { area: "Container image", test: (f) => f === "Dockerfile" || f === "docker-compose.yml" || f === ".dockerignore" },
  { area: "Server function", test: (f) => f.startsWith("functions/") },
  { area: "Core app logic (question loading, scoring, report, export, forms)", test: (f) => ["site/questions/loader.js", "site/questions/engine.js", "site/report.js", "site/forms.js"].includes(f) },
  { area: "Schema (pack format and validation)", test: (f) => f.startsWith("site/schema/") },
  { area: "Service worker / offline cache", test: (f) => f === "site/sw.js" },
  { area: "ZAP scan rules", test: (f) => f.startsWith(".zap/") },
  { area: "Build, release and deploy scripts", test: (f) => f.startsWith("scripts/") }
];

function jsonEqual(a, b) {
  try { return JSON.stringify(sortDeep(JSON.parse(a))) === JSON.stringify(sortDeep(JSON.parse(b))); } catch (e) { return a === b; }
}
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = sortDeep(v[k]); return o; }, {});
  return v;
}
function newOrigins(before, after) { const b = new Set(origins(before)); return origins(after).filter((o) => !b.has(o)); }
function apiIncreases(before, after) {
  const b = apis(before), a = apis(after);
  return Object.keys(a).filter((k) => a[k] > (b[k] || 0)).map((k) => k + " (" + (b[k] || 0) + "→" + a[k] + ")");
}

// Returns a list of risk reasons for one file (empty = cosmetic).
function classifyFile(file, before, after) {
  const reasons = [];
  if (MODEL_FILES.includes(file)) return reasons;
  PATH_RULES.forEach((r) => { if (r.test(file)) reasons.push(r.area); });
  if (reasons.length) return reasons;
  before = before || ""; after = after || "";
  if (file === "package.json") {
    const pick = (t) => { try { const j = JSON.parse(t || "{}"); return JSON.stringify(sortDeep({ d: j.dependencies, dd: j.devDependencies, o: j.overrides, s: j.scripts, e: j.engines })); } catch (e) { return t; } };
    if (pick(before) !== pick(after)) reasons.push("Dependencies or npm scripts changed");
    return reasons;
  }
  if (/^(site\/)?schema\/.*\.json$/.test(file)) {
    if (!jsonEqual(before, after)) reasons.push("Schema content changed");
    return reasons;
  }
  if (file === "site/config.json") {
    if (!jsonEqual(before, after)) reasons.push("Runtime config changed");
    return reasons;
  }
  if (/^site\/.*\.(js|mjs)$/.test(file)) {
    const inc = apiIncreases(before, after);
    if (inc.length) reasons.push("New network/storage/DOM sink use: " + inc.join(", "));
  } else if (/^site\/.*\.html?$/.test(file)) {
    const b = htmlFacts(before), a = htmlFacts(after);
    if (b.csp !== a.csp) reasons.push("Content-Security-Policy meta changed");
    if (JSON.stringify(b.forms) !== JSON.stringify(a.forms)) reasons.push("Form action or method changed");
    if (JSON.stringify(b.fields) !== JSON.stringify(a.fields)) reasons.push("Input fields changed");
    if (JSON.stringify(b.scripts) !== JSON.stringify(a.scripts) || a.inlineScripts > b.inlineScripts) reasons.push("Scripts loaded by the page changed");
    if (JSON.stringify(b.iframes) !== JSON.stringify(a.iframes)) reasons.push("Embedded frames changed");
    if (a.inlineHandlers > b.inlineHandlers) reasons.push("New inline event handlers");
  } else if (/^site\/.*\.css$/.test(file)) {
    if ((after.match(/@import/g) || []).length > (before.match(/@import/g) || []).length) reasons.push("New CSS @import");
  }
  if (/^site\//.test(file)) {
    const n = newOrigins(before, after);
    if (n.length) reasons.push("New external origin: " + n.join(", "));
  }
  return reasons;
}

function nextThreatId(modelText) {
  const ids = (modelText.match(/^\| T(\d+)/gm) || []).map((s) => parseInt(s.slice(3), 10));
  const n = ids.length ? Math.max.apply(null, ids) + 1 : 1;
  return "T" + String(n).padStart(2, "0");
}
// Component, STRIDE, risk and mitigation inferred per risk area (first match wins per area).
const AREA_FACTS = [
  { m: /workflow|Threat-model gate|Repository controls/i, c: "CI/CD workflows", s: "Tampering / Elevation of privilege", r: "High", t: "OWASP-CICD-SEC-1, OWASP-CICD-SEC-4", x: "Workflow or repository-control change weakens permissions, runs untrusted code or exposes secrets", g: "Actions pinned to SHAs, least-privilege job permissions, no pull_request_target, harden-runner; zizmor, CodeQL and the threat-model gate (run from the base branch) check every PR; maintainer approval required to merge." },
  { m: /Dependencies|npm scripts/i, c: "Dependencies", s: "Tampering", r: "Medium", t: "OWASP-CICD-SEC-3", x: "A changed dependency or npm script brings in malicious or vulnerable code", g: "Lockfile pinned and installed with npm ci; dependency-review, OSV-Scanner and Trivy run on every PR; dev-only tools never ship in the site; maintainer approval required to merge." },
  { m: /headers|nginx|Content-Security-Policy/i, c: "Security headers / CSP", s: "Tampering / Information disclosure", r: "Medium", t: "OWASP-ASVS-14.4", x: "A header or CSP change loosens browser protections", g: "Headers kept identical across site, nginx and container; site-quality, ZAP, Nuclei and Nikto check served headers; CSP violations fail the browser tests." },
  { m: /Container/i, c: "Self-host container", s: "Tampering / Elevation of privilege", r: "Medium", t: "CIS-Docker", x: "The container image runs with more privilege or ships unexpected files", g: "Pinned base image, non-root, Trivy image scan and Nikto on every PR." },
  { m: /Server function/i, c: "Server function", s: "Information disclosure / Denial of service", r: "High", t: "OWASP-ASVS-5", x: "The server function leaks data or can be abused", g: "Input validated and size-limited, no personal data stored, Semgrep and CodeQL scans, maintainer approval required to merge." },
  { m: /Schema|Core app logic|Service worker|Runtime config/i, c: "Browser app (pack loading, scoring, report, offline cache)", s: "Tampering / Information disclosure", r: "Medium", t: "OWASP-ASVS-5, OWASP-ASVS-14", x: "Hostile packs or changed app logic run script, corrupt a report or send data off the device", g: "Strict CSP with no inline script, schema validation, output encoding; fuzzing and browser security tests prove zero cross-origin requests and no script execution from packs." },
  { m: /(?:^Build, release)|deploy/i, c: "Build, release and deploy tooling", s: "Tampering", r: "Medium", t: "SLSA-L2, OWASP-CICD-SEC-9", x: "Build or release tooling changes what is shipped", g: "Reproducible-build check on every PR; releases built twice and compared; signed tags; staging before production." },
  { m: /(?:network|storage|DOM|origin|frames|inline|@import)|(?:^(?:Form|Input|Scripts loaded))/, c: "Browser data flows", s: "Information disclosure / Tampering", r: "Medium", t: "OWASP-ASVS-14.4, OWASP-ASVS-5", x: "A new data flow, origin, form, field or DOM sink sends data off the device or opens an injection path", g: "CSP connect-src/form-action allow-list, SRI on scripts, zero-egress privacy proof and browser security tests run on every PR." },
  { m: /ZAP/i, c: "Security scanning", s: "Repudiation", r: "Low", t: "OWASP-WSTG", x: "Scan rule changes hide real findings", g: "ZAP rule changes are reviewed in the PR; Nuclei and Nikto scan independently." },
];
const RANK = { Low: 1, Medium: 2, High: 3 };
function factsFor(reasons) {
  const hits = [];
  reasons.forEach((a) => { const f = AREA_FACTS.find((x) => x.m.test(a)) || AREA_FACTS[AREA_FACTS.length - 1]; if (!hits.includes(f)) hits.push(f); });
  return hits;
}
const cell = (v) => String(v).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
function draftEntry(id, risky, label) {
  const reasons = Array.from(new Set(risky.flatMap((r) => r.reasons)));
  const hits = factsFor(reasons);
  const uniq = (k) => Array.from(new Set(hits.map((h) => h[k]))).join("; ");
  const risk = hits.reduce((a, h) => (RANK[h.r] > RANK[a] ? h.r : a), "Low");
  const files = risky.map((r) => "`" + r.file + "`").join(", ");
  return "| " + [id, uniq("c"), uniq("s"), uniq("x") + " (" + cell(reasons.join("; ")) + "; files: " + files + ")", risk, uniq("g"), uniq("t"),
    "Auto-drafted" + (label ? " for " + cell(label) : "") + "; reviewed with the PR"].join(" | ") + " |";
}
// Threat rows present in `after` whose id is not in `before`.
function addedRows(before, after) {
  const ids = new Set((before.match(/^\| (T\d+[a-z]?) \|/gm) || []).map((s) => s.slice(2, -2).trim()));
  return after.split(/\r?\n/).filter((l) => { const m = /^\| (T\d+[a-z]?) \|/.exec(l); return m && !ids.has(m[1]); });
}
// True when the rows added in this PR together name every risk-relevant file.
function entryCovers(rows, risky) {
  const text = rows.join("\n");
  return risky.filter((r) => text.indexOf("`" + r.file + "`") === -1).map((r) => r.file);
}
const DEPENDABOT = "dependabot[bot]";
const DEP_FILES = ["package.json", "package-lock.json"];

function safePath(root, f) {
  if (f.indexOf("..") !== -1 || path.isAbsolute(f)) return null;
  const abs = path.resolve(root, f);
  const r = path.relative(root, abs);
  return r.startsWith("..") || path.isAbsolute(r) ? null : abs;
}
function gitShow(root, ref, f) {
  if (!ref || !/^[0-9a-fA-F]{7,64}$/.test(ref) || !safePath(root, f)) return "";
  try { return execFileSync("git", ["show", ref + ":" + f], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 }); } catch (e) { return ""; }
}

// changed: array of file paths, or of {file, before, after}.
function evaluate(changed, opts) {
  opts = opts || {};
  const root = opts.root || process.cwd();
  const author = opts.author || "";
  const readAfter = (f) => { const abs = safePath(root, f); if (!abs) return ""; try { return fs.readFileSync(abs, "utf8"); } catch (e) { return ""; } };
  const readBefore = opts.readBefore || ((f) => gitShow(root, opts.baseRef, f));
  const items = changed.map((c) => (typeof c === "string" ? { file: c.trim() } : c)).filter((c) => c.file && safePath(root, c.file));
  const risky = [], cosmetic = [];
  items.forEach((c) => {
    const before = "before" in c ? c.before : readBefore(c.file);
    const after = "after" in c ? c.after : readAfter(c.file);
    const reasons = classifyFile(c.file, before, after);
    (reasons.length ? risky : cosmetic).push({ file: c.file, reasons });
  });
  const files = items.map((c) => c.file);
  const modelUpdated = files.some((f) => MODEL_FILES.includes(f));
  const errors = [];
  if (files.includes("docs/threat-model/safeblueprint.json")) {
    try {
      const j = JSON.parse(readAfter("docs/threat-model/safeblueprint.json"));
      if (!j.summary || !j.detail || !Array.isArray(j.detail.diagrams)) errors.push("Threat Dragon JSON must have summary and detail.diagrams.");
    } catch (e) { errors.push("docs/threat-model/safeblueprint.json does not parse: " + e.message); }
  }
  const classification = risky.length ? "risk" : "cosmetic";
  const modelBefore = opts.modelBefore != null ? opts.modelBefore : readBefore("THREAT_MODEL.md");
  const modelAfter = opts.modelText != null ? opts.modelText : readAfter("THREAT_MODEL.md");
  const rows = addedRows(modelBefore, modelAfter);
  const missing = risky.length ? entryCovers(rows, risky) : [];
  const dependabotOnly = author === DEPENDABOT && risky.length > 0 && risky.every((r) => DEP_FILES.includes(r.file));
  const entryOk = !risky.length || missing.length === 0 || dependabotOnly;
  const pass = errors.length === 0 && entryOk;
  const reason = errors.length ? "Threat model JSON is invalid."
    : !risky.length ? "Cosmetic or no-risk changes only. No threat entry needed."
    : missing.length === 0 ? "Risk-relevant changes have a threat entry added in this PR (" + rows.map((l) => l.split("|")[1].trim()).join(", ") + ")."
    : dependabotOnly ? "Dependabot dependency-manifest update. Covered by the dependency threat row and dependency scans; draft entry below for reference."
    : "Risk-relevant changes need a threat entry in THREAT_MODEL.md that names every file below. Run `npm run threat-model:update`, review the row it writes, commit and push.";
  const draft = risky.length ? draftEntry(nextThreatId(modelAfter), risky) : null;
  // 'triggered' kept for backwards compatibility with earlier callers.
  const triggered = risky.flatMap((r) => r.reasons.map((a) => ({ area: a, file: r.file })));
  return { pass, reason, classification, risky, cosmetic, triggered, modelUpdated, entryRows: rows, missing, dependabotOnly, errors, draft };
}

function summary(r) {
  const L = ["## Threat model gate", "", (r.pass ? "✅ " : "❌ ") + r.reason, "", "Classification: **" + r.classification + "**", ""];
  if (r.risky.length) {
    L.push("| Risk reason | File |", "|---|---|");
    r.risky.forEach((x) => x.reasons.forEach((a) => L.push("| " + a + " | `" + x.file + "` |")));
    L.push("");
  }
  if (r.cosmetic.length) L.push("Cosmetic / no-risk files: " + r.cosmetic.length, "");
  if (r.missing && r.missing.length && !r.dependabotOnly) L.push("Files not yet named in a new threat row: " + r.missing.map((f) => "`" + f + "`").join(", "), "");
  if (r.draft) L.push("### Draft threat entry (`npm run threat-model:update` writes this to THREAT_MODEL.md)", "", "```", r.draft, "```", "");
  L.push("Threat model files updated: " + (r.modelUpdated ? "yes" : "no") + " · New threat rows: " + ((r.entryRows || []).length));
  r.errors.forEach((e) => L.push("", "Error: " + e));
  return L.join("\n") + "\n";
}

if (require.main === module) {
  const list = process.argv[2];
  if (!list) { console.error("Usage: node scripts/threat-model-gate.js <changed-files.txt>"); process.exit(2); }
  const changed = fs.readFileSync(list, "utf8").split(/\r?\n/).filter(Boolean);
  const r = evaluate(changed, { author: process.env.PR_AUTHOR, baseRef: process.env.BASE_REF });
  const text = summary(r);
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  process.exit(r.pass ? 0 : 1);
}
module.exports = { evaluate, summary, classifyFile, nextThreatId, draftEntry, addedRows, gitShow, PATH_RULES, MODEL_FILES };
