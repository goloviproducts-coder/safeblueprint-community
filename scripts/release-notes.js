// Release notes from the CHANGELOG section for a version, plus verification and approval lines.
// Usage: node scripts/release-notes.js <version> <zip name> <repo> [approver] [run url] > notes.md
"use strict";
const fs = require("fs");
const { section, HEADINGS } = require("./check-release.js");

function releaseNotes({ changelog, version, name, repo, approver, runUrl }) {
  const v = String(version).replace(/^v/, "");
  const body = section(changelog, v);
  if (body === null) throw new Error(`CHANGELOG.md has no ## [${v}] section. Run 'node scripts/prepare-release.js' in a PR before releasing (docs/RELEASING.md).`);
  for (const h of HEADINGS) if (!new RegExp(`^### ${h}$`, "m").test(body)) throw new Error(`CHANGELOG.md [${v}] is missing heading '### ${h}'.`);
  const safe = (s) => String(s).replace(/[^A-Za-z0-9_.:/@-]/g, "");
  let out = body.trim() + "\n\n";
  out += `Verify the download: \`gh attestation verify ${safe(name)}.zip --repo ${safe(repo)} && sha256sum -c SHA256SUMS\`. Full steps: docs/VERIFY.md\n`;
  if (approver || runUrl) {
    out += `\nReleased through the approve-to-release workflow. Approved by @${safe(approver || "unknown")} in the \`production\` environment. Run: ${safe(runUrl || "")}\n`;
    out += "The tag is SSH-signed by the release key (check with `scripts/verify-release-tag.sh` against `.github/release-signers`; GitHub cannot show deploy-key signatures as Verified), and the zip has a build provenance attestation.\n";
  }
  return out;
}

if (require.main === module) {
  const [version, name, repo, approver, runUrl] = process.argv.slice(2);
  try {
    process.stdout.write(releaseNotes({ changelog: fs.readFileSync("CHANGELOG.md", "utf8"), version, name, repo, approver, runUrl }));
  } catch (e) {
    console.error(process.env.GITHUB_ACTIONS ? `::error title=Release not prepared::${e.message}` : `error: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { releaseNotes };
