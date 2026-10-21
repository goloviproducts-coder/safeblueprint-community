"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { evaluate, summary } = require("../scripts/threat-model-gate.js");

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tmgate-"));
  Object.entries(files).forEach(([f, body]) => {
    fs.mkdirSync(path.join(root, path.dirname(f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), body);
  });
  return root;
}
const goodModel = JSON.stringify({ summary: { title: "x" }, detail: { diagrams: [] } });

test("docs-only change passes without triggers", () => {
  const r = evaluate(["README.md", "docs/CUSTOMISING.md"], { root: repo({}) });
  assert.equal(r.pass, true);
  assert.equal(r.triggered.length, 0);
});
test("each sensitive path triggers and fails without a model update", () => {
  ["site/_headers", "nginx.conf", "Dockerfile", ".github/workflows/tests.yml", "site/schema/questions/v1.json", "site/questions/loader.js", "site/report.js", "site/sw.js"].forEach((f) => {
    const r = evaluate([f], { root: repo({}) });
    assert.equal(r.pass, false, f);
    assert.ok(r.triggered.length >= 1, f);
  });
});
test("site JS triggers only when it uses network, storage or DOM sinks", () => {
  const root = repo({ "site/a.js": "var x = fetch('/config.json');", "site/b.js": "var y = 1 + 2;", "site/c.js": "localStorage.setItem('k','v')" });
  assert.equal(evaluate(["site/a.js"], { root }).pass, false);
  assert.equal(evaluate(["site/b.js"], { root }).pass, true);
  assert.equal(evaluate(["site/c.js"], { root }).triggered[0].area, "Browser code using network/storage/DOM sinks");
});
test("updating THREAT_MODEL.md or the Threat Dragon JSON passes", () => {
  const root = repo({ "docs/threat-model/safeblueprint.json": goodModel });
  assert.equal(evaluate(["nginx.conf", "THREAT_MODEL.md"], { root }).pass, true);
  assert.equal(evaluate(["nginx.conf", "docs/threat-model/safeblueprint.json"], { root }).pass, true);
});
test("maintainer label passes", () => {
  const r = evaluate(["site/_headers"], { root: repo({}), reviewed: true });
  assert.equal(r.pass, true);
  assert.match(r.reason, /maintainer/);
});
test("invalid Threat Dragon JSON fails even with the label", () => {
  const root = repo({ "docs/threat-model/safeblueprint.json": "{nope" });
  const r = evaluate(["docs/threat-model/safeblueprint.json"], { root, reviewed: true });
  assert.equal(r.pass, false);
  assert.match(r.errors[0], /does not parse/);
  const r2 = evaluate(["docs/threat-model/safeblueprint.json"], { root: repo({ "docs/threat-model/safeblueprint.json": "{}" }) });
  assert.equal(r2.pass, false);
});
test("paths with .. are never read", () => {
  const r = evaluate(["site/../../etc/passwd.js"], { root: repo({}) });
  assert.equal(r.pass, true);
});
test("summary lists triggered areas", () => {
  const s = summary(evaluate(["Dockerfile", "site/sw.js"], { root: repo({}) }));
  assert.match(s, /Container image/);
  assert.match(s, /Service worker/);
  assert.match(s, /❌/);
});
test("the shipped Threat Dragon model parses and has threats", () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "threat-model", "safeblueprint.json"), "utf8"));
  assert.ok(j.version.startsWith("2."));
  const threats = j.detail.diagrams.flatMap((d) => d.cells).flatMap((c) => (c.data && c.data.threats) || []);
  assert.ok(threats.length >= 10);
  threats.forEach((t) => assert.ok(t.mitigation && t.status, t.title));
});
test("changes to the gate, its tests, ZAP rules, CODEOWNERS and lockfiles are sensitive", () => {
  ["scripts/threat-model-gate.js", "test/threat-model-gate.test.js", ".github/workflows/threat-model-gate.yml", ".zap/rules.tsv", ".github/CODEOWNERS", "package-lock.json"].forEach((f) => {
    assert.equal(evaluate([f], { root: repo({}) }).pass, false, f);
  });
});
