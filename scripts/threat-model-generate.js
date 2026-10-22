// Regenerates docs/threat-model/inventory.json from the code: pages, forms and input fields,
// data flows (network/storage APIs per script), external endpoints, security headers and
// GitHub Actions triggers and permissions. Output is deterministic (sorted, no timestamps).
// Usage: npm run threat-model          (write the file)
//        npm run threat-model -- --check   (exit 1 with a diff hint when the file is stale)
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const OUT = "docs/threat-model/inventory.json";
const SITE_HEADERS = path.join(__dirname, "..", "site", "_headers");
const NGINX = path.join(__dirname, "..", "nginx.conf");
const PKG = path.join(__dirname, "..", "package.json");
const OUT_ABS = path.join(__dirname, "..", "docs", "threat-model", "inventory.json");

const API_PATTERNS = {
  "fetch": /\bfetch\s*\(/g,
  "XMLHttpRequest": /\bXMLHttpRequest\b/g,
  "WebSocket": /\bWebSocket\b/g,
  "EventSource": /\bEventSource\b/g,
  "sendBeacon": /\bsendBeacon\b/g,
  "postMessage": /\bpostMessage\s*\(/g,
  "localStorage": /\blocalStorage\b/g,
  "sessionStorage": /\bsessionStorage\b/g,
  "indexedDB": /\bindexedDB\b/g,
  "document.cookie": /\bdocument\.cookie\b/g,
  "caches": /\bcaches\.(open|match|keys|delete)\b/g,
  "serviceWorker.register": /\bserviceWorker\.register\s*\(/g,
  "FileReader": /\bFileReader\b/g,
  "createObjectURL": /\bcreateObjectURL\b/g,
  "innerHTML/outerHTML": /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/g,
  "document.write": /\bdocument\.write(ln)?\s*\(/g,
  "eval/Function": /\beval\s*\(|\bnew\s+Function\s*\(/g,
  "dynamic import": /\bimport\s*\(/g,
  "Worker": /\bnew\s+(Shared)?Worker\s*\(/g,
  "window.open": /\bwindow\.open\s*\(/g,
  "env secret": /\benv\.[A-Z_]{3,}\b/g
};
// Absolute (http, https, ws, wss) and protocol-relative (//host) URLs, whether they sit in
// double quotes, single quotes, template literals, url() or bare text.
const URL_RE = /(?:\b(?:https?|wss?):)?\/\/(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?/g;

function rel(p) { return path.relative(root, p).split(path.sep).join("/"); }
// Every path must resolve inside the repository.
function inside(p) {
  p = path.resolve(root, p);
  const r = path.relative(root, p);
  if (r.startsWith("..") || path.isAbsolute(r)) throw new Error("Refusing path outside the repository: " + p);
  return p;
}
function readText(p) { try { return fs.readFileSync(inside(p), "utf8"); } catch (e) { return ""; } }
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(inside(dir), { withFileTypes: true }); } catch (e) { return []; }
  return entries.flatMap((d) => {
    if (d.name.indexOf("..") !== -1 || d.name.indexOf("/") !== -1) throw new Error("Unsafe file name: " + d.name);
    const p = inside(path.resolve(dir, d.name));
    return d.isDirectory() ? walk(p) : [p];
  }).sort();
}
function uniq(a) { return Array.from(new Set(a)).sort(); }
function origins(text) {
  return uniq((text.match(URL_RE) || []).map((u) => { u = u.toLowerCase(); return u.startsWith("//") ? "https:" + u : u; }));
}
function apis(text) {
  const o = {};
  Object.keys(API_PATTERNS).forEach((k) => { const n = (text.match(API_PATTERNS[k]) || []).length; if (n) o[k] = n; });
  return o;
}
const ATTR_RE = {
  content: /\bcontent\s*=\s*"([^"]*)"/i, src: /\bsrc\s*=\s*"([^"]*)"/i, action: /\baction\s*=\s*"([^"]*)"/i,
  method: /\bmethod\s*=\s*"([^"]*)"/i, type: /\btype\s*=\s*"([^"]*)"/i, name: /\bname\s*=\s*"([^"]*)"/i, id: /\bid\s*=\s*"([^"]*)"/i
};
function attr(tag, name) { const m = tag.match(ATTR_RE[name]); return m ? m[1] : null; }
function htmlFacts(html) {
  const tags = (re) => html.match(re) || [];
  return {
    csp: (tags(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/gi).map((t) => attr(t, "content")))[0] || null,
    scripts: uniq(tags(/<script\b[^>]*\bsrc="[^"]*"[^>]*>/gi).map((t) => attr(t, "src"))),
    inlineScripts: tags(/<script\b(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/gi).length,
    forms: tags(/<form\b[^>]*>/gi).map((t) => ({ action: attr(t, "action"), method: (attr(t, "method") || "get").toLowerCase() })),
    fields: uniq(tags(/<(input|textarea|select)\b[^>]*>/gi).map((t) => {
      const kind = t.match(/^<(\w+)/)[1].toLowerCase();
      return kind + ":" + (attr(t, "type") || "") + ":" + (attr(t, "name") || attr(t, "id") || "");
    })),
    iframes: uniq(tags(/<iframe\b[^>]*>/gi).map((t) => attr(t, "src") || "")),
    inlineHandlers: tags(/\son[a-z]+\s*=\s*"/gi).length,
    externalOrigins: origins(html)
  };
}
function parseHeaders(text) {
  const out = {}; let cur = null;
  text.split(/\r?\n/).forEach((l) => {
    if (!l.trim() || l.trim().startsWith("#")) return;
    if (!/^\s/.test(l)) { cur = l.trim(); out[cur] = {}; return; }
    const m = l.trim().match(/^([^:]+):\s*(.*)$/); if (cur && m) out[cur][m[1]] = m[2];
  });
  return out;
}
function nginxHeaders(text) {
  const o = {};
  (text.match(/^\s*add_header\s+[^\n]+/gm) || []).forEach((l) => {
    const m = l.match(/add_header\s+([\w-]+)\s+"([^"]*)"/); if (m && !/^\s*#/.test(l)) o[m[1]] = m[2];
  });
  return o;
}
// Minimal YAML reader for workflow triggers and permissions (no dependencies).
function workflowFacts(text) {
  const lines = text.split(/\r?\n/);
  const facts = { triggers: [], permissions: null, jobs: {} };
  let section = null, job = null, inPerm = null, permIndent = 0;
  lines.forEach((raw) => {
    if (!raw.trim() || raw.trim().startsWith("#")) return;
    const ind = raw.match(/^ */)[0].length; const l = raw.trim();
    if (inPerm && ind <= permIndent) inPerm = null;
    if (ind === 0) {
      job = null;
      const m = l.match(/^(on|permissions|jobs|"on"):\s*(.*)$/);
      section = m ? m[1].replace(/"/g, "") : null;
      if (section === "on" && m[2]) facts.triggers = uniq(m[2].replace(/[\[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean));
      if (section === "permissions") { if (m[2]) facts.permissions = m[2]; else { facts.permissions = {}; inPerm = facts.permissions; permIndent = 0; } }
      return;
    }
    if (section === "on" && ind === 2) { facts.triggers = uniq(facts.triggers.concat(l.replace(/:.*$/, ""))); return; }
    if (section === "jobs" && ind === 2 && /^[\w-]+:\s*$/.test(l)) { job = l.slice(0, -1); facts.jobs[job] = { permissions: "inherit" }; return; }
    if (inPerm) { const m = l.match(/^([\w-]+):\s*(\S+)/); if (m) inPerm[m[1]] = m[2]; return; }
    if (section === "jobs" && job && ind === 4) {
      const m = l.match(/^permissions:\s*(.*)$/);
      if (m) { if (m[1]) facts.jobs[job].permissions = m[1]; else { facts.jobs[job].permissions = {}; inPerm = facts.jobs[job].permissions; permIndent = 4; } }
      if (/^environment:/.test(l)) facts.jobs[job].environment = l.replace(/^environment:\s*/, "") || "(block)";
    }
  });
  facts.usesPullRequestTarget = /\bpull_request_target\b/.test(text);
  facts.secrets = uniq((text.match(/secrets\.[A-Z0-9_]+/g) || []));
  return facts;
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {});
  return v;
}
function build() {
  const site = path.join(root, "site");
  const files = walk(site);
  const pages = {}, scripts = {}, endpoints = {};
  const addEndpoints = (f, list) => list.forEach((o) => { (endpoints[o] = endpoints[o] || []).push(f); });
  files.forEach((p) => {
    const f = rel(p); const text = /\.(html|js|css|json|webmanifest|txt|xml)$/.test(f) ? readText(p) : "";
    if (f.endsWith(".html")) { const h = htmlFacts(text); pages[f] = h; addEndpoints(f, h.externalOrigins); }
    else if (f.endsWith(".js")) { scripts[f] = { apis: apis(text), externalOrigins: origins(text) }; addEndpoints(f, scripts[f].externalOrigins); }
    else if (f.endsWith(".css")) { const o = origins(text); if (o.length || /@import/.test(text)) scripts[f] = { apis: {}, externalOrigins: o, imports: (text.match(/@import/g) || []).length }; addEndpoints(f, o); }
  });
  const functions = {};
  walk(path.join(root, "functions")).forEach((p) => {
    const f = rel(p); const t = readText(p);
    functions[f] = { apis: apis(t), externalOrigins: origins(t) }; addEndpoints(f, functions[f].externalOrigins);
  });
  const storage = {}, flows = [];
  Object.entries(Object.assign({}, scripts, functions)).forEach(([f, s]) => {
    ["localStorage", "sessionStorage", "indexedDB", "document.cookie", "caches"].forEach((k) => { if (s.apis[k]) (storage[k] = storage[k] || []).push(f); });
    ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "postMessage"].forEach((k) => { if (s.apis[k]) flows.push({ file: f, api: k, count: s.apis[k] }); });
  });
  Object.entries(pages).forEach(([f, p]) => p.forms.forEach((fm) => flows.push({ file: f, api: "form", action: fm.action, method: fm.method })));
  const workflows = {};
  walk(path.join(root, ".github", "workflows")).filter((p) => /\.ya?ml$/.test(p)).forEach((p) => { workflows[rel(p)] = workflowFacts(readText(p)); });
  const pkg = JSON.parse(readText(PKG) || "{}");
  return sortKeys({
    generatedBy: "scripts/threat-model-generate.js (npm run threat-model). Do not edit by hand.",
    pages, scripts, functions,
    dataFlows: flows.sort((a, b) => (a.file + a.api).localeCompare(b.file + b.api)),
    externalEndpoints: Object.fromEntries(Object.entries(endpoints).map(([k, v]) => [k, uniq(v)])),
    storage: Object.fromEntries(Object.entries(storage).map(([k, v]) => [k, uniq(v)])),
    headers: { "site/_headers": parseHeaders(readText(SITE_HEADERS)), "nginx.conf": nginxHeaders(readText(NGINX)) },
    workflows,
    dependencies: { dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {}, overrides: pkg.overrides || {} }
  });
}
function render() { return JSON.stringify(build(), null, 2) + "\n"; }

if (require.main === module) {
  const next = render(); const out = OUT_ABS;
  const cur = readText(out);
  if (process.argv.includes("--check")) {
    if (cur !== next) { console.error(OUT + " is out of date. Run `npm run threat-model` and commit the result."); process.exit(1); }
    console.log(OUT + " is up to date."); process.exit(0);
  }
  // Atomic write: create a fresh temp file exclusively, then rename it over the output.
  const tmp = inside(out + "." + process.pid + ".tmp");
  fs.writeFileSync(tmp, next, { flag: "wx" });
  fs.renameSync(tmp, out); console.log((cur === next ? "Unchanged: " : "Wrote ") + OUT);
}
module.exports = { build, render, apis, origins, htmlFacts, workflowFacts, API_PATTERNS };
