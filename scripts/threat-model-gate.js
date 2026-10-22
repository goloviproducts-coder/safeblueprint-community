// Threat-model gate (semantic). Classifies each changed file by comparing its content on the
// base branch with the PR head:
//   cosmetic  - markup/nav/copy, CSS without new origins, SRI hashes, SHA256SUMS, tests, docs
//   risk      - new or changed data flow (fetch/XHR/WebSocket/beacon/postMessage), form action or
//               input field, external origin, CSP or security headers, storage, DOM/eval sinks,
//               schema content, workflows/permissions, dependencies, build/deploy tooling.
// Cosmetic-only PRs pass with no label. Risk-relevant PRs need the 'threat-model-reviewed' label
// applied by a maintainer after the latest push; the job summary includes a draft threat entry.
// Usage: node scripts/threat-model-gate.js <changed-files.txt>
// Env: BASE_REF (commit to read "before" content from, via git show), REVIEWED_LABEL=true,
//      GITHUB_STEP_SUMMARY.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { apis, origins, htmlFacts } = require("./threat-model-generate.js");

const MODEL_FILES = ["THREAT_MODEL.md", "docs/threat-model/safeblueprint.json", "docs/threat-model/inventory.json"];
const GATE_FILES = ["scripts/threat-model-gate.js", "scripts/threat-model-generate.js", "test/threat-model-gate.test.js", ".github/workflows/threat-model-gate.yml"];

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
function draftEntry(id, risky) {
  const areas = Array.from(new Set(risky.flatMap((r) => r.reasons))).join("; ");
  const files = risky.map((r) => "`" + r.file + "`").join(", ");
  return "| " + id + " | (component) | (STRIDE category) | Draft – needs maintainer review: " + areas + " (" + files + ") | (Low/Medium/High) | (mitigation) | (references) | Draft – needs maintainer review |";
}

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
  const reviewed = Boolean(opts.reviewed);
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
  const pass = errors.length === 0 && (!risky.length || reviewed);
  const reason = errors.length ? "Threat model JSON is invalid."
    : !risky.length ? "Cosmetic or no-risk changes only. No review label needed."
    : reviewed ? "Risk-relevant changes reviewed by a maintainer (label threat-model-reviewed)."
    : "Risk-relevant changes need maintainer review. Add the draft entry below to THREAT_MODEL.md (or confirm no new threat), then a maintainer applies the threat-model-reviewed label.";
  const draft = risky.length ? draftEntry(nextThreatId(opts.modelText != null ? opts.modelText : readAfter("THREAT_MODEL.md")), risky) : null;
  // 'triggered' kept for backwards compatibility with earlier callers.
  const triggered = risky.flatMap((r) => r.reasons.map((a) => ({ area: a, file: r.file })));
  return { pass, reason, classification, risky, cosmetic, triggered, modelUpdated, reviewed, errors, draft };
}

function summary(r) {
  const L = ["## Threat model gate", "", (r.pass ? "✅ " : "❌ ") + r.reason, "", "Classification: **" + r.classification + "**", ""];
  if (r.risky.length) {
    L.push("| Risk reason | File |", "|---|---|");
    r.risky.forEach((x) => x.reasons.forEach((a) => L.push("| " + a + " | `" + x.file + "` |")));
    L.push("");
  }
  if (r.cosmetic.length) L.push("Cosmetic / no-risk files: " + r.cosmetic.length, "");
  if (r.draft) L.push("### Draft threat entry (copy into THREAT_MODEL.md and complete)", "", "```", r.draft, "```", "");
  L.push("Threat model files updated: " + (r.modelUpdated ? "yes" : "no") + " · Maintainer label: " + (r.reviewed ? "yes" : "no"));
  r.errors.forEach((e) => L.push("", "Error: " + e));
  return L.join("\n") + "\n";
}

if (require.main === module) {
  const list = process.argv[2];
  if (!list) { console.error("Usage: node scripts/threat-model-gate.js <changed-files.txt>"); process.exit(2); }
  const changed = fs.readFileSync(list, "utf8").split(/\r?\n/).filter(Boolean);
  const r = evaluate(changed, { reviewed: process.env.REVIEWED_LABEL === "true", baseRef: process.env.BASE_REF });
  const text = summary(r);
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  process.exit(r.pass ? 0 : 1);
}
module.exports = { evaluate, summary, classifyFile, nextThreatId, PATH_RULES, MODEL_FILES };
