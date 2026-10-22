"use strict";
// Validates every community pack in packs/ with the same loader the browser uses.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../site/questions/engine.js");

const root = path.join(__dirname, "..", "packs");
const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const MONEY = /[$€£]\s?\d|\bpenalt(y|ies)\b|\bfines?\b/i;

test("the library has at least the four starter packs", () => {
  for (const d of ["health", "education", "public-sector", "internal-controls-template"]) assert.ok(dirs.includes(d), d);
});

for (const d of dirs) {
  test("pack " + d + " is valid and follows the library rules", () => {
    assert.match(d, /^[a-z0-9]+(-[a-z0-9]+)*$/, "folder name");
    const csv = fs.readFileSync(path.join(root, d, "pack.csv"), "utf8");
    const pack = E.loadPack(csv, "pack.csv");
    assert.ok(pack.questions.length >= 3, "at least 3 questions");
    assert.match(csv, /^# name: .+/m, "has a name line");
    assert.match(csv, /^# version: .+/m, "has a version line");
    assert.doesNotMatch(csv, EMAIL, "no email addresses");
    assert.doesNotMatch(csv, MONEY, "no penalty amounts");
    assert.doesNotMatch(csv, /https?:\/\//i, "no links to other sites");
    const meta = JSON.parse(fs.readFileSync(path.join(root, d, "meta.json"), "utf8"));
    assert.equal(meta.id, d);
    assert.ok(Array.isArray(meta.contributors) && meta.contributors.length > 0, "contributor credit");
    meta.contributors.forEach((c) => assert.doesNotMatch(c, EMAIL, "credit without email"));
    assert.ok(["draft", "reviewed"].includes(meta.status));
    assert.equal(meta.licence, "Apache-2.0");
    pack.questions.forEach((q) => {
      if (q.risk_if && q.risk_if.length) {
        assert.ok(q.finding, q.id + " finding_text");
        assert.ok(q.action, q.id + " action_text");
      }
    });
  });
}

test("library README says not legal advice and has no email addresses", () => {
  const md = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(md, /not legal advice/i);
  assert.doesNotMatch(md, EMAIL);
});
