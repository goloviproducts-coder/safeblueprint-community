"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../site/questions/engine.js");
const acme = E.loadPack(fs.readFileSync(path.join(__dirname, "..", "examples", "acme-pack.csv"), "utf8"), "acme-pack.csv");
const answers = { A01: "chat", A02: ["pi", "pay"], A04: "no", A05: "manual", A06: "120", A07: "yes" };

test("report model lists findings with control IDs and pack identity", () => {
  const m = E.reportModel(acme, answers, { sha256: "ab".repeat(32) });
  assert.equal(m.pack.name, "ACME Retail AI controls");
  assert.equal(m.pack.version, "2026.1");
  assert.equal(m.pack.sha256.length, 64);
  assert.equal(m.verdict, "Not ready");
  const ids = m.controls.map((c) => c.control);
  ["ACME-DATA-03", "OWASP-LLM01", "ATLAS-AML.T0051", "ACME-POL-11", "ACME-DATA-07"].forEach((c) => assert.ok(ids.includes(c), c));
  assert.equal(m.findings[0].severity, "high");
  assert.match(m.findings[0].id, /^ACT-\d\d$/);
  assert.ok(!m.answers.some((a) => a.id === "A03"), "A03 hidden by show_if");
});
test("markdown export has the three parts and control IDs", () => {
  const md = E.toMarkdown(E.reportModel(acme, answers, { sha256: "cd".repeat(32) }));
  ["## A. For leaders", "## B. For the delivery team", "## C. For security architects: pattern match", "ACME-DATA-03", "OWASP-LLM01", "SHA-256 " + "cd".repeat(32), "not legal advice"].forEach((s) => assert.ok(md.includes(s), s));
  assert.ok(!/\$\s?\d/.test(md), "no money amounts");
});
test("markdown escapes pipes in user text", () => {
  const p = E.loadPack("id,pack,section,question,type,risk_if,finding_text\nQ1,p,S,Q,yesno,no,a|b\n", "x.csv");
  assert.ok(E.toMarkdown(E.reportModel(p, { Q1: "no" })).includes("a\\|b"));
});
test("markdown escapes backslashes before pipes", () => {
  const p = E.loadPack("id,pack,section,question,type,risk_if,finding_text\nQ1,p,S,Q,yesno,no,a\\|b\n", "x.csv");
  assert.ok(E.toMarkdown(E.reportModel(p, { Q1: "no" })).includes("a\\\\\\|b"));
});
