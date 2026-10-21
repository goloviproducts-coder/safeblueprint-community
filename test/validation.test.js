"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../site/questions/engine.js");
const H = "id,pack,section,question,type,options,weight,risk_if,severity,maps_to_control,pattern,show_if,audience,required\n";
function errs(csv) {
  try { E.loadPack(csv, "t.csv"); } catch (e) { return e.errors; }
  return [];
}

test("missing required column names the column", () => {
  const e = errs("id,pack,question,type\nQ1,p,Q,yesno\n");
  assert.equal(e[0].column, "section");
  assert.match(E.formatError(e[0]), /Row 1, column "section"/);
});
test("unknown column is reported", () => {
  assert.equal(errs("id,pack,section,question,type,colour\nQ1,p,S,Q,yesno,red\n")[0].column, "colour");
});
test("bad type, weight, severity and audience give row and column", () => {
  const e = errs(H + "Q1,p,S,Q,maybe,,11,,urgent,,,,boss,\n");
  const cols = e.map((x) => x.column).sort();
  assert.deepEqual(cols, ["audience", "severity", "type", "weight"]);
  e.forEach((x) => assert.equal(x.line, 2));
});
test("risk_if must be an option value", () => {
  const e = errs(H + "Q1,p,S,Q,choice,a=A|b=B,1,c,high,,,,,\n");
  assert.equal(e[0].column, "risk_if");
  assert.match(e[0].message, /a, b/);
});
test("duplicate ids, bad control IDs, bad pattern and unknown show_if target", () => {
  const e = errs(H + "Q1,p,S,Q,yesno,,1,no,high,OWASP LLM01,PAT3,,,\nQ1,p,S,Q,yesno,,1,,,,,Q9=yes,,\n");
  const cols = e.map((x) => x.column);
  ["maps_to_control", "pattern", "id", "show_if"].forEach((c) => assert.ok(cols.includes(c), c));
});
test("a row with an unquoted comma is caught", () => {
  const e = errs("id,pack,section,question,type\nQ1,p,S,Is it big, or small?,yesno\n");
  assert.ok(e.some((x) => /more cells than the header/.test(x.message)));
});
test("custom control prefixes are allowed", () => {
  assert.deepEqual(errs(H + "Q1,p,S,Q,yesno,,1,no,high,ACME-POL-07|APP1.7|ATLAS-AML.T0051|NIST-GOVERN-1.1,PAT-01,,delivery,true\n"), []);
});
test("JSON pack with array fields loads and bad JSON is reported", () => {
  const p = E.loadPack(JSON.stringify({ name: "J", questions: [{ id: "Q1", pack: "p", section: "S", question: "Q", type: "choice", options: [{ value: "a", label: "A" }, "b=B"], risk_if: ["b"], maps_to_control: ["X-1"] }] }), "j.json");
  assert.equal(p.questions[0].options.length, 2);
  assert.throws(() => E.loadPack("{oops", "j.json"), (e) => /not valid JSON/.test(e.errors[0].message));
});
test("engine rules match the published JSON schema", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "site", "schema", "questions", "v1.json"), "utf8"));
  const props = schema.properties.questions.items.properties;
  assert.deepEqual(Object.keys(props).sort(), E.COLUMNS.slice().sort());
  assert.deepEqual(props.type.enum, E.TYPES);
  assert.deepEqual(props.severity.enum.filter(Boolean), E.SEVERITIES);
  assert.deepEqual(props.audience.enum.filter(Boolean), E.AUDIENCES);
  assert.deepEqual(schema.properties.questions.items.required.sort(), ["id", "pack", "question", "section", "type"]);
});
test("shipped template and example packs are valid", () => {
  ["site/questions/template.csv", "examples/acme-pack.csv", "site/questions/default.csv", "site/questions/default.json"].forEach((f) => {
    assert.doesNotThrow(() => E.loadPack(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), f), f);
  });
});
