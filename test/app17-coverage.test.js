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
  "maintenance and review": /review it at least yearly/,
  "exemptions screen": /small business or employee records/,
  "commercial-in-confidence exclusion": /commercial-in-confidence/,
  "commencement": /10 December 2026/,
  "not legal advice framing": /not a finding of compliance/
};
for (const [name, re] of Object.entries(areas)) {
  test("APP 1.7 check covers: " + name, () => assert.match(src, re));
}
test("APP 1.7 check has no penalty amounts", () => {
  assert.doesNotMatch(src, /penalt|civil penalty|fine of/i);
});
