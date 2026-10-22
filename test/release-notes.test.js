"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { releaseNotes } = require("../scripts/release-notes.js");

const md = "## [Unreleased]\n\n## [1.1.0] - 2026-11-01\n" + ["Features", "Issues fixed", "Interfaces updated", "Security fixes", "Privacy", "General"].map((h) => `### ${h}\n- None\n`).join("\n") + "\n## [1.0.0] - x\n### General\n- Old\n";
const base = { changelog: md, version: "v1.1.0", name: "safeblueprint-selfhost-1.1.0", repo: "o/r" };

test("notes from a signed tag have no approval line", () => {
  const n = releaseNotes(base);
  assert.match(n, /^### Features\n- None/);
  assert.doesNotMatch(n, /Old/);
  assert.match(n, /gh attestation verify safeblueprint-selfhost-1\.1\.0\.zip --repo o\/r/);
  assert.doesNotMatch(n, /Approved by/);
});

test("approve-to-release notes record the approver and run", () => {
  const n = releaseNotes({ ...base, approver: "maint", runUrl: "https://github.com/o/r/actions/runs/1" });
  assert.match(n, /Approved by @maint in the `production` environment\. Run: https:\/\/github\.com\/o\/r\/actions\/runs\/1/);
  assert.match(n, /SSH-signed by the release key/);
});

test("approver text cannot inject markdown or commands", () => {
  const n = releaseNotes({ ...base, approver: "x`$(rm -rf /)`[link](http://e)", runUrl: "https://a/b" });
  assert.doesNotMatch(n, /[`$()\[\]]rm|\$\(/);
});

test("missing section or heading fails with a clear message", () => {
  assert.throws(() => releaseNotes({ ...base, version: "1.2.0" }), /no ## \[1\.2\.0\] section/);
  assert.throws(() => releaseNotes({ ...base, changelog: md.replace("### Privacy\n- None\n", "") }), /missing heading '### Privacy'/);
});
