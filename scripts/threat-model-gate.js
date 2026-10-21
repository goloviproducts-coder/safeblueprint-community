// Threat-model gate: security-sensitive changes must update the threat model,
// or carry the 'threat-model-reviewed' label applied by a maintainer.
// Usage: node scripts/threat-model-gate.js <changed-files.txt>
// Env: REVIEWED_LABEL=true when a maintainer applied the label; GITHUB_STEP_SUMMARY for the job summary.
"use strict";
const fs = require("fs");
const path = require("path");

const MODEL_FILES = ["THREAT_MODEL.md", "docs/threat-model/safeblueprint.json"];
const SENSITIVE_APIS = /\b(fetch\s*\(|XMLHttpRequest|FileReader|localStorage|sessionStorage|indexedDB|navigator\.sendBeacon|import\s*\(|WebSocket|EventSource|postMessage|innerHTML)/;
const AREAS = [
  { area: "Security headers", test: (f) => f === "site/_headers" },
  { area: "Self-host server (nginx)", test: (f) => f === "nginx.conf" },
  { area: "Container image", test: (f) => f === "Dockerfile" || f === "docker-compose.yml" },
  { area: "CI/CD supply chain", test: (f) => f.startsWith(".github/workflows/") || f === ".github/dependabot.yml" || f === ".github/CODEOWNERS" },
  { area: "Schemas", test: (f) => /^site\/schema\//.test(f) || f.startsWith("schema/") },
  { area: "Local file loader", test: (f) => f === "site/questions/loader.js" || f === "site/questions/engine.js" },
  { area: "Report exports", test: (f) => f === "site/report.js" || f === "site/forms.js" },
  { area: "Service worker / offline cache", test: (f) => f === "site/sw.js" },
  { area: "Browser code using network/storage/DOM sinks", test: (f, read) => /^site\/.*\.js$/.test(f) && SENSITIVE_APIS.test(read(f)) }
];

function safePath(root, f) {
  if (f.indexOf("..") !== -1 || path.isAbsolute(f)) return null;
  const abs = path.resolve(root, f);
  const rel = path.relative(root, abs);
  return rel.startsWith("..") || path.isAbsolute(rel) ? null : abs;
}

function evaluate(changed, opts) {
  const root = (opts && opts.root) || process.cwd();
  const reviewed = Boolean(opts && opts.reviewed);
  const reader = (f) => {
    const abs = safePath(root, f);
    if (!abs) return "";
    try { return fs.readFileSync(abs, "utf8"); } catch (e) { return ""; } // missing (deleted) file or directory
  };
  const files = changed.map((f) => f.trim()).filter(Boolean);
  const triggered = [];
  files.forEach((f) => {
    AREAS.forEach((a) => {
      if (MODEL_FILES.includes(f)) return;
      if (a.test(f, reader)) triggered.push({ area: a.area, file: f });
    });
  });
  const modelUpdated = files.some((f) => MODEL_FILES.includes(f));
  const errors = [];
  if (files.includes("docs/threat-model/safeblueprint.json")) {
    try {
      const j = JSON.parse(reader("docs/threat-model/safeblueprint.json"));
      if (!j.summary || !j.detail || !Array.isArray(j.detail.diagrams)) errors.push("Threat Dragon JSON must have summary and detail.diagrams.");
    } catch (e) {
      errors.push("docs/threat-model/safeblueprint.json does not parse: " + e.message);
    }
  }
  const pass = errors.length === 0 && (triggered.length === 0 || modelUpdated || reviewed);
  const reason = errors.length ? "Threat model JSON is invalid."
    : !triggered.length ? "No security-sensitive changes."
    : modelUpdated ? "Security-sensitive changes with a threat model update."
    : reviewed ? "Security-sensitive changes reviewed by a maintainer (label threat-model-reviewed)."
    : "Security-sensitive changes without a threat model update. Update THREAT_MODEL.md or docs/threat-model/safeblueprint.json, or ask a maintainer to review and apply the threat-model-reviewed label.";
  return { pass, reason, triggered, modelUpdated, reviewed, errors };
}

function summary(r) {
  const L = ["## Threat model gate", "", (r.pass ? "✅ " : "❌ ") + r.reason, ""];
  if (r.triggered.length) {
    L.push("| Area | File |", "|---|---|");
    r.triggered.forEach((t) => L.push("| " + t.area + " | `" + t.file + "` |"));
    L.push("");
  }
  L.push("Threat model updated: " + (r.modelUpdated ? "yes" : "no") + " · Maintainer label: " + (r.reviewed ? "yes" : "no"));
  r.errors.forEach((e) => L.push("", "Error: " + e));
  return L.join("\n") + "\n";
}

if (require.main === module) {
  const list = process.argv[2];
  if (!list) { console.error("Usage: node scripts/threat-model-gate.js <changed-files.txt>"); process.exit(2); }
  const changed = fs.readFileSync(list, "utf8").split(/\r?\n/);
  const r = evaluate(changed, { reviewed: process.env.REVIEWED_LABEL === "true" });
  const text = summary(r);
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  process.exit(r.pass ? 0 : 1);
}
module.exports = { evaluate, summary, AREAS, MODEL_FILES };
