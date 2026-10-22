// Release readiness check. Fails fast, with a plain fix, when CHANGELOG.md, VERSION and
// package.json are not ready for a version. Used by tests (every PR and main), by
// scripts/tag-release.sh before a tag is signed, and by release.yml / deploy.yml on tag push.
// Usage: node scripts/check-release.js            -> consistency (VERSION = package.json = newest CHANGELOG section)
//        node scripts/check-release.js v1.2.3     -> everything above, and it is exactly 1.2.3
"use strict";
const fs = require("fs");

const HEADINGS = ["Features", "Issues fixed", "Interfaces updated", "Security fixes", "Privacy", "General"];
const FIX = "Fix: on a new branch run 'node scripts/prepare-release.js patch|minor|major', fill in the six headings, run 'node scripts/update-hashes.js', open a PR and merge it before tagging (docs/RELEASING.md).";

function section(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## ["));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function newestVersion(changelog) {
  const m = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  return m ? m[1] : null;
}

function versionFromFile(text) {
  const m = (text.split("\n")[0] || "").match(/ (\d+\.\d+\.\d+)$/);
  return m ? m[1] : null;
}

function checkRelease({ changelog, versionFile, pkgVersion, version }) {
  const errors = [];
  const newest = newestVersion(changelog);
  const ver = versionFromFile(versionFile);
  const want = version ? String(version).replace(/^v/, "") : newest;
  if (version && !/^\d+\.\d+\.\d+$/.test(want)) return [`'${version}' is not a vX.Y.Z version`];
  if (!want) return ["CHANGELOG.md has no released version section (## [X.Y.Z] - date)"];
  if (newest !== want) errors.push(`CHANGELOG.md newest section is [${newest || "none"}], expected [${want}]`);
  const body = section(changelog, want);
  if (body === null) errors.push(`CHANGELOG.md has no ## [${want}] section`);
  else {
    for (const h of HEADINGS) {
      const re = new RegExp(`^### ${h}\\n((?:- .*\\n?)+)`, "m");
      if (!new RegExp(`^### ${h}$`, "m").test(body)) errors.push(`CHANGELOG.md [${want}] is missing heading: ### ${h}`);
      else if (!re.test(body + "\n")) errors.push(`CHANGELOG.md [${want}] heading '### ${h}' has no bullet (use '- None' if nothing changed)`);
    }
  }
  if (ver !== want) errors.push(`VERSION says ${ver || "nothing"}, expected ${want}`);
  if (pkgVersion !== want) errors.push(`package.json version is ${pkgVersion || "missing"}, expected ${want}`);
  return errors;
}

if (require.main === module) {
  const errors = checkRelease({
    changelog: fs.readFileSync("CHANGELOG.md", "utf8"),
    versionFile: fs.readFileSync("VERSION", "utf8"),
    pkgVersion: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
    version: process.argv[2],
  });
  if (errors.length) {
    for (const e of errors) console.error(process.env.GITHUB_ACTIONS ? `::error title=Release not prepared::${e}` : `error: ${e}`);
    console.error(FIX);
    process.exit(1);
  }
  console.log(`Release files are ready${process.argv[2] ? ` for ${process.argv[2]}` : ""}.`);
}

module.exports = { checkRelease, section, newestVersion, HEADINGS };
