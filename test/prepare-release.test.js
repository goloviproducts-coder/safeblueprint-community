"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { nextVersion, promoteChangelog } = require("../scripts/prepare-release.js");

test("next version from latest v* tag", () => {
  const tags = ["v1.0.0", "v1.2.3", "v1.10.0", "junk", "v2.0.0-rc1"];
  assert.strictEqual(nextVersion(tags, "patch"), "1.10.1");
  assert.strictEqual(nextVersion(tags, "minor"), "1.11.0");
  assert.strictEqual(nextVersion(tags, "major"), "2.0.0");
  assert.throws(() => nextVersion(tags, "huge"));
});

test("promotes Unreleased into the version", () => {
  const md = "# Changelog\n\n## [Unreleased]\n### General\n- Thing\n\n## [1.0.0] - 2026-10-22\n- First\n\n[Unreleased]: https://github.com/o/r/compare/v1.0.0...HEAD\n[1.0.0]: https://github.com/o/r/releases/tag/v1.0.0\n";
  const out = promoteChangelog(md, "1.1.0", "2026-11-01", "o/r");
  assert.match(out, /## \[Unreleased\]\n\n## \[1\.1\.0\] - 2026-11-01\n### General\n- Thing\n\n## \[1\.0\.0\]/);
  assert.match(out, /\[Unreleased\]: https:\/\/github.com\/o\/r\/compare\/v1\.1\.0\.\.\.HEAD/);
  assert.match(out, /\[1\.1\.0\]: https:\/\/github.com\/o\/r\/compare\/v1\.0\.0\.\.\.v1\.1\.0/);
  assert.throws(() => promoteChangelog(out, "1.1.0", "x", "o/r"));
  assert.throws(() => promoteChangelog(out, "1.2.0", "x", "o/r"), /empty/);
});
