"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../site/questions/engine.js");
const { builtin } = require("../scripts/builtin-questions");
const { STEPS, Q, GROUPS } = builtin();
const read = (f) => fs.readFileSync(path.join(__dirname, "..", "site", "questions", f), "utf8");
const csv = E.loadPack(read("default.csv"), "default.csv");
const json = E.loadPack(read("default.json"), "default.json");

test("APP 1.7 inventory has 12 questions, same text, help, order and options", () => {
  const steps = STEPS.filter((s) => s.id !== "name");
  assert.equal(steps.length, 12);
  const adm = csv.questions.filter((q) => q.pack === "adm");
  assert.deepEqual(adm.map((q) => q.id), steps.map((s) => "ADM-" + s.id));
  steps.forEach((s, i) => {
    assert.equal(adm[i].question, s.title);
    assert.equal(adm[i].help, s.help || "");
    if (s.kind === "text") assert.equal(adm[i].type, "text");
    else assert.deepEqual(adm[i].options.map((o) => o.value), s.options.map((o) => o[0]));
  });
});
test("AI security checklist has the same 14 questions in section order", () => {
  const order = [].concat(...GROUPS.map((g) => g[1]));
  const ai = csv.questions.filter((q) => q.pack === "ai");
  assert.equal(ai.length, Q.length);
  assert.deepEqual(ai.map((q) => q.id), order.map((id) => "AIS-" + id));
  const byId = Object.fromEntries(Q.map((r) => [r[0], r]));
  ai.forEach((q) => {
    const r = byId[q.id.slice(4)];
    assert.equal(q.question, r[1]);
    assert.equal(q.help, r[2] || "");
    assert.deepEqual(q.options.map((o) => o.label), r[3]);
    assert.deepEqual(q.options.map((o) => o.value), r[3].map((_, j) => String(j)));
  });
  GROUPS.forEach(([section, ids]) => ids.forEach((id) => assert.equal(ai.find((q) => q.id === "AIS-" + id).section, section)));
});
test("CSV and JSON default packs are identical", () => {
  const strip = (p) => JSON.stringify(p.questions.map(({ _line, ...q }) => q));
  assert.equal(strip(csv), strip(json));
  assert.equal(csv.version, json.version);
});
test("default.csv is up to date with the built-in questions", () => {
  const before = read("default.csv");
  require("child_process").execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "build-default-pack.js")]);
  assert.equal(read("default.csv"), before, "Run npm run build:default-pack and commit the result");
});
