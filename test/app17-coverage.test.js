"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "site", "home.js"), "utf8");

// Each APP 1.7-1.9 area from the OAIC APP guidelines chapter 1 (paras 1.35-1.73)
// must be named somewhere in the fixed APP 1.7 check.
const areas = {
  "program decides alone": /decisions a program makes alone/,
  "substantially and directly related": /substantially and directly related to making/,
  "human review does not take it out of scope": /even when a person reviews it/,
  "APP 1.9 refusing or failing": /refusing or failing to decide counts/,
  "APP 1.9 good or bad effects": /good or bad effects both count/,
  "benefit, contract, significant service": /a benefit, rights under a contract, or access to a significant service/,
  "vulnerability": /person experiencing vulnerability/,
  "sensitive kinds named separately": /name sensitive kinds such as health information separately/,
  "placement in APP privacy policy": /goes in your APP privacy policy/,
  "up-to-date policy (APP 1.3)": /keep up to date \(APP 1\.3\)/,
  "review framed as OAIC good practice": /Good practice, not a legal requirement: OAIC guidance suggests dating the policy/,
  "exemptions screen": /small business or employee records/,
  "commercial-in-confidence framed as OAIC guidance": /OAIC guidance, based on the Explanatory Memorandum rather than the words of APP 1\.7/,
  "commencement": /10 December 2026/,
  "not legal advice framing": /not a finding of compliance/
};
for (const [name, re] of Object.entries(areas)) {
  test("APP 1.7 check covers: " + name, () => assert.match(src, re));
}
test("APP 1.7 check has no penalty amounts", () => {
  assert.doesNotMatch(src, /penalt|civil penalty|fine of/i);
});

const sample = fs.readFileSync(path.join(__dirname, "..", "site", "sample", "index.html"), "utf8");
test("guidance is not stated as law", () => {
  for (const t of [src, sample]) {
    assert.doesNotMatch(t, /review it at least yearly/);
    assert.doesNotMatch(t, /You can leave out commercial-in-confidence/);
    assert.doesNotMatch(t, /Leave out trade secrets\./);
  }
});
test("each guidance line links its OAIC paragraph", () => {
  for (const t of [src, sample]) {
    for (const para of ["1.9", "1.41", "1.67"]) assert.ok(t.includes("OAIC APP Guidelines, para " + para), para);
    assert.ok(t.includes("oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1"));
  }
});
