"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { evaluate, summary, classifyFile, nextThreatId } = require("../scripts/threat-model-gate.js");
const gen = require("../scripts/threat-model-generate.js");

const ev = (changes, opts) => evaluate(changes, Object.assign({ root: path.join(__dirname, ".."), modelText: "| T21 | x |" }, opts));
const NAV_BEFORE = '<header><button class="nav-toggle" type="button">Menu</button><nav class="menu"><a href="/" aria-current="page">Home</a><a href="https://github.com/goloviproducts-coder/safeblueprint-community" rel="noopener">GitHub</a></nav></header><link rel="stylesheet" href="/app.css" integrity="sha384-AAA" crossorigin="anonymous"><script src="/ui.js" integrity="sha384-BBB" crossorigin="anonymous"></script>';
const NAV_AFTER = '<header><button class="nav-toggle" type="button" aria-label="Open menu"><span aria-hidden="true">☰</span></button><nav class="menu"><div class="nav-group"><button class="nav-group-btn" aria-expanded="false">Tools</button><ul><li><a href="/" aria-current="page">Automated decisions check</a></li></ul></div><div class="nav-group"><button class="nav-group-btn">About</button><ul><li><a href="https://github.com/goloviproducts-coder/safeblueprint-community" rel="noopener">GitHub<svg aria-hidden="true"></svg></a></li></ul></div></nav></header><link rel="stylesheet" href="/app.css" integrity="sha384-CCC" crossorigin="anonymous"><script src="/ui.js" integrity="sha384-DDD" crossorigin="anonymous"></script>';
const UI_BEFORE = 'var btn=document.querySelector(".nav-toggle");btn.addEventListener("click",function(){btn.textContent="Close";});';
const UI_AFTER = 'var btn=document.querySelector(".nav-toggle");var mq=window.matchMedia("(max-width:900px)");btn.addEventListener("click",function(){btn.setAttribute("aria-label","Close menu");btn.firstElementChild.textContent="\\u00d7";});document.addEventListener("keydown",function(e){if(e.key==="Escape")btn.focus();});';

test("PR #25 style nav change (markup, CSS, ui.js, SRI, SHA256SUMS) is cosmetic and passes with no label", () => {
  const r = ev([
    { file: "site/index.html", before: NAV_BEFORE, after: NAV_AFTER },
    { file: "site/app.css", before: ".menu{display:flex}", after: ".menu{display:flex}.nav-list{display:none}" },
    { file: "site/ui.js", before: UI_BEFORE, after: UI_AFTER },
    { file: "SHA256SUMS.txt", before: "aa  ./site/ui.js\n", after: "bb  ./site/ui.js\n" }
  ]);
  assert.equal(r.classification, "cosmetic");
  assert.equal(r.pass, true);
  assert.equal(r.draft, null);
});
test("docs, tests and copy are cosmetic", () => {
  const r = ev([{ file: "README.md", before: "a", after: "b" }, { file: "test/x.test.js", before: "", after: "fetch('/x')" }, { file: "docs/VERIFY.md", before: "", after: "https://example.org" }]);
  assert.equal(r.pass, true);
});
test("new fetch, XHR, WebSocket, beacon or storage in site JS is risk", () => {
  ["fetch('/api')", "new XMLHttpRequest()", "new WebSocket('wss://x')", "navigator.sendBeacon('/b')", "localStorage.setItem('k',1)", "indexedDB.open('d')", "document.cookie='a=1'", "el.innerHTML=s", "eval(s)"].forEach((code) => {
    assert.ok(classifyFile("site/home.js", "var a=1;", "var a=1;" + code).length, code);
  });
});
test("moving or removing an existing sink is not risk", () => {
  assert.equal(classifyFile("site/home.js", "fetch('/api/contact')", "// tidy\nfetch('/api/contact')").length, 0);
  assert.equal(classifyFile("site/home.js", "fetch('/a');fetch('/b')", "fetch('/a')").length, 0);
});
test("new external origin in site code or markup is risk; existing origin is not", () => {
  assert.match(classifyFile("site/about/index.html", '<a href="https://github.com/x">', '<a href="https://evil.example/x">')[0], /evil\.example/);
  assert.equal(classifyFile("site/about/index.html", '<a href="https://github.com/x">', '<a href="https://github.com/y">').length, 0);
});
test("form action, new input fields, CSP meta, new script and inline handlers are risk", () => {
  assert.ok(classifyFile("site/c.html", '<form action="/api/contact" method="post">', '<form action="https://x.example/f" method="post">').length);
  assert.ok(classifyFile("site/c.html", '<input type="text" name="org">', '<input type="text" name="org"><input type="email" name="email">').length);
  assert.ok(classifyFile("site/c.html", '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">', '<meta http-equiv="Content-Security-Policy" content="default-src *">').length);
  assert.ok(classifyFile("site/c.html", '<script src="/ui.js"></script>', '<script src="/ui.js"></script><script src="/extra.js"></script>').length);
  assert.ok(classifyFile("site/c.html", "<p>x</p>", '<p onclick="go()">x</p>').length);
});
test("schema JSON outside site/: content change is risk, reformatting is not", () => {
  const a = '{"type":"object","properties":{"name":{"type":"string"}}}';
  assert.equal(classifyFile("schema/report/v1.json", a, JSON.stringify(JSON.parse(a), null, 2)).length, 0);
  assert.match(classifyFile("schema/report/v1.json", a, '{"type":"object","properties":{"name":{"type":"string"},"email":{"type":"string"}}}')[0], /Schema content/);
});
test("workflows, headers, nginx, Docker, functions, service worker, lockfile and scripts are always risk", () => {
  ["site/_headers", "nginx.conf", "Dockerfile", ".github/workflows/tests.yml", "functions/api/contact.js", "site/sw.js", "package-lock.json", "scripts/build-release.sh", ".github/CODEOWNERS", ".zap/rules.tsv", "scripts/threat-model-gate.js", ".github/workflows/threat-model-gate.yml", "test/threat-model-gate.test.js"].forEach((f) => {
    const r = ev([{ file: f, before: "a", after: "b" }]);
    assert.equal(r.pass, false, f);
  });
});
test("package.json: dependency or script change is risk, description is not", () => {
  const p = (o) => JSON.stringify(Object.assign({ name: "x", devDependencies: { a: "1" } }, o));
  assert.equal(classifyFile("package.json", p({}), p({ description: "new" })).length, 0);
  assert.ok(classifyFile("package.json", p({}), p({ devDependencies: { a: "2" } })).length);
});
test("risk change fails without label, passes with it, and drafts the next threat id", () => {
  const r = ev([{ file: "site/home.js", before: "", after: "fetch('https://x.example')" }]);
  assert.equal(r.pass, false);
  assert.match(r.draft, /^\| T22 \|.*Draft – needs maintainer review/);
  assert.match(summary(r), /Draft threat entry/);
  assert.equal(ev([{ file: "site/home.js", before: "", after: "fetch('/a')" }], { reviewed: true }).pass, true);
  assert.equal(nextThreatId("| T01 |\n| T20a |\n| T21 |"), "T22");
});
test("a threat-model update alone does not excuse a risk change (label still required)", () => {
  const r = ev([{ file: "site/_headers", before: "a", after: "b" }, { file: "THREAT_MODEL.md", before: "", after: "x" }]);
  assert.equal(r.pass, false);
});
test("invalid Threat Dragon JSON fails even with the label", () => {
  const root = fs.mkdtempSync(path.join(require("os").tmpdir(), "tmgate-"));
  fs.mkdirSync(path.join(root, "docs/threat-model"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/threat-model/safeblueprint.json"), "{nope");
  const r = evaluate([{ file: "docs/threat-model/safeblueprint.json", before: "" }], { root, reviewed: true });
  assert.equal(r.pass, false);
});
test("paths with .. are ignored", () => {
  assert.equal(ev(["site/../../etc/passwd.js"]).pass, true);
});
test("the shipped Threat Dragon model parses and has threats", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "threat-model", "safeblueprint.json"), "utf8"));
  assert.ok(j.version.startsWith("2."));
  const threats = j.detail.diagrams.flatMap((d) => d.cells).flatMap((c) => (c.data && c.data.threats) || []);
  assert.ok(threats.length >= 10);
  threats.forEach((t) => assert.ok(t.mitigation && t.status, t.title));
});
test("generated inventory is committed and up to date", () => {
  const cur = fs.readFileSync(path.join(__dirname, "..", "docs", "threat-model", "inventory.json"), "utf8");
  assert.equal(cur, gen.render(), "run npm run threat-model");
});
test("inventory captures flows, endpoints, headers and workflow permissions", () => {
  const inv = gen.build();
  assert.ok(inv.dataFlows.some((f) => f.file === "site/forms.js" && f.api === "fetch"));
  assert.ok(inv.headers["site/_headers"]["/*"]["Content-Security-Policy"]);
  assert.ok(Object.values(inv.workflows).every((w) => w.usesPullRequestTarget === false));
  assert.deepEqual(gen.workflowFacts("on:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  a:\n    permissions:\n      issues: write\n").jobs.a.permissions, { issues: "write" });
});

test("Threat Dragon JSON without summary/diagrams fails", () => {
  const root = fs.mkdtempSync(path.join(require("os").tmpdir(), "tmgate-"));
  fs.mkdirSync(path.join(root, "docs/threat-model"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/threat-model/safeblueprint.json"), "{}");
  const r = evaluate([{ file: "docs/threat-model/safeblueprint.json", before: "" }], { root });
  assert.equal(r.pass, false);
  assert.match(r.errors[0], /summary and detail\.diagrams/);
});
test("summary lists every triggered area", () => {
  const s = summary(ev([{ file: "Dockerfile", before: "a", after: "b" }, { file: "site/sw.js", before: "a", after: "b" }]));
  assert.match(s, /Container image/);
  assert.match(s, /Service worker/);
  assert.match(s, /❌/);
});
test("core logic files and everything under site/schema/ are always risk, even for cosmetic edits", () => {
  ["site/questions/loader.js", "site/questions/engine.js", "site/report.js", "site/forms.js", "site/schema/index.html", "site/schema/report/v1.json", "site/schema/sub/x.css"].forEach((f) => {
    assert.ok(classifyFile(f, "// a", "// b").length, f);
  });
  assert.equal(classifyFile("site/questions/other.js", "// a", "// b").length, 0);
});
test("URL detection: protocol-relative, single quotes, template literals, url()", () => {
  [
    ["site/a.html", "<p></p>", "<img src='//evil.example/x.png'>"],
    ["site/a.html", "<p></p>", "<a href='https://evil.example/x'>"],
    ["site/a.js", "var a=1;", "var u=`https://evil.example/${p}`;"],
    ["site/a.js", "var a=1;", "var u='//evil.example/p';"],
    ["site/a.js", "var a=1;", "var u=`wss://evil.example:8443/s`;"],
    ["site/a.css", ".a{}", ".a{background:url(//evil.example/i.png)}"]
  ].forEach(([f, b, a]) => assert.match(classifyFile(f, b, a).join(" "), /evil\.example/, a));
  assert.deepEqual(gen.origins("x='//cdn.example.com/a' y=`https://Cdn.Example.com/b`"), ["https://cdn.example.com"]);
  assert.equal(gen.origins("// just a comment\nvar a = 1; // another").length, 0);
});
