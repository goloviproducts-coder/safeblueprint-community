"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../site/questions/engine.js");
const cells = (t) => E.parseCsv(t).map((r) => r.cells);

test("plain rows and CRLF", () => {
  assert.deepEqual(cells("a,b\r\nc,d\r\n"), [["a", "b"], ["c", "d"]]);
});
test("quoted cells with commas, quotes and newlines", () => {
  assert.deepEqual(cells('a,"b, c","say ""hi""","line1\nline2"\n'), [["a", "b, c", 'say "hi"', "line1\nline2"]]);
});
test("pipes stay inside a cell", () => {
  assert.deepEqual(cells("id,options\nQ1,yes=Yes|no=No\n"), [["id", "options"], ["Q1", "yes=Yes|no=No"]]);
});
test("UTF-8 BOM is stripped", () => {
  assert.deepEqual(cells("\uFEFFid,pack\nQ1,p\n")[0], ["id", "pack"]);
});
test("blank lines are skipped and row numbers are kept", () => {
  const rows = E.parseCsv("id\n\nQ1\n");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].line, 3);
});
test("unclosed quote is reported", () => {
  assert.throws(() => E.parseCsv('a,"b\n'), (e) => e instanceof E.PackError);
});
test("metadata lines set pack name and version", () => {
  const p = E.loadPack("# name: Demo\n# version: 2.1\nid,pack,section,question,type\nQ1,p,S,Ok?,yesno\n", "x.csv");
  assert.equal(p.name, "Demo");
  assert.equal(p.version, "2.1");
  assert.deepEqual(p.questions[0].options.map((o) => o.value), ["yes", "no", "unsure"]);
});
test("option labels may contain = after the first", () => {
  const p = E.loadPack('id,pack,section,question,type,options\nQ1,p,S,Q?,choice,"a=x=y|b=B"\n', "x.csv");
  assert.deepEqual(p.questions[0].options[0], { value: "a", label: "x=y" });
});
