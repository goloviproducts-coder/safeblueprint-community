"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const { checkRelease } = require("../scripts/check-release.js");

const sec = (v, skip) => `## [${v}] - 2026-10-22\n` + ["Features", "Issues fixed", "Interfaces updated", "Security fixes", "Privacy", "General"].filter((h) => h !== skip).map((h) => `### ${h}\n- None\n`).join("\n");
const md = (v, skip) => `# Changelog\n\n## [Unreleased]\n\n${sec(v, skip)}\n## [1.0.0] - 2026-10-01\n### General\n- First\n`;
const vf = (v) => `SafeBlueprint self-hosted edition ${v}\nBuild date: x\n`;

test("ready release passes", () => {
  assert.deepStrictEqual(checkRelease({ changelog: md("1.0.1"), versionFile: vf("1.0.1"), pkgVersion: "1.0.1", version: "v1.0.1" }), []);
  assert.deepStrictEqual(checkRelease({ changelog: md("1.0.1"), versionFile: vf("1.0.1"), pkgVersion: "1.0.1" }), []);
});

test("tag without a prepared changelog fails (the v1.0.1 incident)", () => {
  const changelog = "## [Unreleased]\n### Features\n- x\n\n## [1.0.0] - d\n" + sec("1.0.0").split("\n").slice(1).join("\n");
  const e = checkRelease({ changelog, versionFile: vf("1.0.0"), pkgVersion: "1.0.0", version: "v1.0.1" });
  assert.ok(e.some((x) => /no ## \[1\.0\.1\] section/.test(x)));
  assert.ok(e.some((x) => /VERSION says 1\.0\.0, expected 1\.0\.1/.test(x)));
  assert.ok(e.some((x) => /package\.json version is 1\.0\.0/.test(x)));
});

test("missing heading, empty heading and version drift fail", () => {
  assert.ok(checkRelease({ changelog: md("1.0.1", "Privacy"), versionFile: vf("1.0.1"), pkgVersion: "1.0.1" }).some((x) => /missing heading: ### Privacy/.test(x)));
  const empty = md("1.0.1").replace("### General\n- None\n", "### General\n");
  assert.ok(checkRelease({ changelog: empty, versionFile: vf("1.0.1"), pkgVersion: "1.0.1" }).some((x) => /'### General' has no bullet/.test(x)));
  assert.ok(checkRelease({ changelog: md("1.0.1"), versionFile: vf("1.0.0"), pkgVersion: "1.0.1" }).length === 1);
  assert.ok(checkRelease({ changelog: md("1.0.1"), versionFile: vf("1.0.1"), pkgVersion: "1.0.1", version: "v1.0.2" }).length > 0);
  assert.deepStrictEqual(checkRelease({ changelog: md("1.0.1"), versionFile: vf("1.0.1"), pkgVersion: "1.0.1", version: "latest" }), ["'latest' is not a vX.Y.Z version"]);
});

test("repository release files are consistent", () => {
  const errors = checkRelease({
    changelog: fs.readFileSync("CHANGELOG.md", "utf8"),
    versionFile: fs.readFileSync("VERSION", "utf8"),
    pkgVersion: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
  });
  assert.deepStrictEqual(errors, []);
});
