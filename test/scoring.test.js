"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../site/questions/engine.js");
const pack = E.loadPack([
  "id,pack,section,question,type,options,weight,risk_if,severity,maps_to_control,show_if,required",
  "Q1,p,S,Agent acts?,choice,text=Text|auto=Auto,0,,,,,true",
  "Q2,p,S,Approval?,yesno,,3,no|unsure,high,OWASP-LLM06,Q1=auto,",
  "Q3,p,S,MFA?,yesno,,2,no,medium,ASD-E8-MFA,,",
  "Q4,p,S,Logs?,yesno,,1,no,low,ISO42001-9.1,,",
  "Q5,p,S,Admins,number,,2,>5,medium,ASD-E8-ADMIN,,"
].join("\n"), "t.csv");

test("all good is Ready at 100%", () => {
  const s = E.score(pack, { Q1: "text", Q3: "yes", Q4: "yes", Q5: "2" });
  assert.equal(s.readiness, 100);
  assert.equal(s.verdict, "Ready");
});
test("weighted share of answered non-gap questions", () => {
  const s = E.score(pack, { Q1: "text", Q3: "no", Q4: "yes", Q5: "3" });
  assert.equal(s.readiness, Math.round(100 * 3 / 5));
  assert.equal(s.verdict, "Partly ready");
});
test("a high severity gap makes it Not ready", () => {
  const s = E.score(pack, { Q1: "auto", Q2: "unsure", Q3: "yes", Q4: "yes", Q5: "1" });
  assert.equal(s.verdict, "Not ready");
  assert.equal(s.gaps[0].id, "Q2");
});
test("only low gaps stay Ready", () => {
  assert.equal(E.score(pack, { Q1: "text", Q3: "yes", Q4: "no", Q5: "1" }).verdict, "Ready");
});
test("show_if hides questions from scoring", () => {
  const s = E.score(pack, { Q1: "text", Q3: "yes", Q4: "yes", Q5: "1" });
  assert.ok(!s.visible.some((q) => q.id === "Q2"));
});
test("number comparison and missing required answers", () => {
  assert.equal(E.score(pack, { Q1: "text", Q3: "yes", Q4: "yes", Q5: "9" }).gaps[0].id, "Q5");
  assert.equal(E.score(pack, { Q3: "yes", Q4: "yes", Q5: "1" }).verdict, "Not enough answers");
});
test("multi answers count a gap if any picked value is risky", () => {
  const p = E.loadPack("id,pack,section,question,type,options,weight,risk_if,severity\nM,p,S,Data?,multi,a=A|b=B|c=C,1,b,high\n", "m.csv");
  assert.equal(E.score(p, { M: ["a", "b"] }).verdict, "Not ready");
  assert.equal(E.score(p, { M: ["a", "c"] }).verdict, "Ready");
});
