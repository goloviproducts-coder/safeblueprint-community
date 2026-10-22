// Prepare a release PR: compute the next semver from the latest v* tag and promote
// CHANGELOG "Unreleased" into that version. Runs locally; it never tags or pushes.
// Usage: node scripts/prepare-release.js patch|minor|major
"use strict";
const fs = require("fs");
const { execFileSync } = require("child_process");

const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;

function latestTag(tags) {
  const v = tags.filter((t) => SEMVER.test(t)).map((t) => t.match(SEMVER).slice(1).map(Number));
  if (!v.length) return [0, 0, 0];
  v.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return v[v.length - 1];
}

function nextVersion(tags, bump) {
  const [ma, mi, pa] = latestTag(tags);
  if (bump === "major") return `${ma + 1}.0.0`;
  if (bump === "minor") return `${ma}.${mi + 1}.0`;
  if (bump === "patch") return `${ma}.${mi}.${pa + 1}`;
  throw new Error("bump must be patch, minor or major");
}

function promoteChangelog(text, version, date, repo) {
  if (text.includes(`## [${version}]`)) throw new Error(`CHANGELOG already has ${version}`);
  const head = "## [Unreleased]\n";
  const i = text.indexOf(head);
  if (i === -1) throw new Error("CHANGELOG has no [Unreleased] section");
  const rest = text.slice(i + head.length);
  const next = rest.search(/^## \[/m);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  if (!body) throw new Error("Unreleased section is empty");
  let out = text.slice(0, i) + head + "\n" + `## [${version}] - ${date}\n` + body + "\n\n" + (next === -1 ? "" : rest.slice(next));
  const prev = out.match(/^\[Unreleased\]: .*\/compare\/(v[^.]+\.[^.]+\.[^.]+)\.\.\.HEAD$/m);
  if (prev) {
    out = out.replace(prev[0], `[Unreleased]: https://github.com/${repo}/compare/v${version}...HEAD\n[${version}]: https://github.com/${repo}/compare/${prev[1]}...v${version}`);
  }
  return out;
}

if (require.main === module) {
  const bump = process.argv[2];
  const repo = "goloviproducts-coder/safeblueprint-community";
  const tags = execFileSync("git", ["tag", "-l", "v*"], { encoding: "utf8" }).split("\n");
  const version = nextVersion(tags, bump);
  const date = new Date().toISOString().slice(0, 10);
  fs.writeFileSync("CHANGELOG.md", promoteChangelog(fs.readFileSync("CHANGELOG.md", "utf8"), version, date, repo));
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkg.version = version;
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  const ver = fs.readFileSync("VERSION", "utf8").split("\n");
  ver[0] = `SafeBlueprint self-hosted edition ${version}`;
  fs.writeFileSync("VERSION", ver.join("\n"));
  console.log(`Prepared v${version}. Next: node scripts/update-hashes.js, commit (signed, DCO), open a PR to main.`);
}

module.exports = { nextVersion, promoteChangelog, latestTag };
