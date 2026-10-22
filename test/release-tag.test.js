"use strict";
// Real git + ssh-keygen: the approve-release tag is SSH-signed, verified against an allowed-signers
// file and pushed; anything else fails. Uses a throwaway key and a local bare repo as the remote.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const create = path.join(root, "scripts/create-release-tag.sh");
const verify = path.join(root, "scripts/verify-release-tag.sh");
const hasTools = spawnSync("ssh-keygen", ["-?"]).error === undefined;

function setup() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "sbtag-"));
  const git = (...a) => execFileSync("git", a, { cwd: path.join(d, "w"), encoding: "utf8" }).trim();
  execFileSync("git", ["init", "-q", "--bare", path.join(d, "remote.git")]);
  fs.mkdirSync(path.join(d, "w"));
  git("init", "-q");
  git("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-q", "--allow-empty", "-m", "c1");
  const sha = git("rev-parse", "HEAD");
  for (const k of ["key", "other"]) execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "safeblueprint-release", "-f", path.join(d, k)]);
  const line = (k) => `release@safeblueprint.invalid namespaces="git" ${fs.readFileSync(path.join(d, k + ".pub"), "utf8").trim()}\n`;
  fs.writeFileSync(path.join(d, "signers"), "# comment\n" + line("key"));
  fs.writeFileSync(path.join(d, "signers-other"), line("other"));
  fs.writeFileSync(path.join(d, "signers-empty"), "# no key yet\n");
  fs.writeFileSync(path.join(d, "kh"), "");
  const env = (k, extra = {}) => ({ ...process.env, RELEASE_DEPLOY_KEY: k === "" ? "" : fs.readFileSync(path.join(d, k), "utf8"), RELEASE_REMOTE: path.join(d, "remote.git"), KNOWN_HOSTS: path.join(d, "kh"), SIGNERS: path.join(d, "signers"), ...extra });
  const run = (cmd, args, e) => spawnSync(cmd, args, { cwd: path.join(d, "w"), env: e, encoding: "utf8" });
  // scripts call scripts/verify-release-tag.sh relative to cwd
  fs.mkdirSync(path.join(d, "w", "scripts"));
  fs.copyFileSync(verify, path.join(d, "w", "scripts", "verify-release-tag.sh"));
  fs.chmodSync(path.join(d, "w", "scripts", "verify-release-tag.sh"), 0o755);
  return { d, git, sha, env, run };
}

test("approved tag is signed, verified and pushed; key never printed", { skip: !hasTools }, () => {
  const s = setup();
  const r = s.run(create, ["v1.2.3", s.sha, "maint", "https://github.com/o/r/actions/runs/9"], s.env("key"));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /PRIVATE KEY/);
  const remote = execFileSync("git", ["--git-dir", path.join(s.d, "remote.git"), "cat-file", "-p", "refs/tags/v1.2.3"], { encoding: "utf8" });
  assert.match(remote, new RegExp(`^object ${s.sha}`, "m"));
  assert.match(remote, /^tagger safeblueprint-release <release@safeblueprint\.invalid>/m);
  assert.match(remote, /Approved-By: @maint/);
  assert.match(remote, /BEGIN SSH SIGNATURE/);
  const v = s.run(verify, ["v1.2.3", s.sha, path.join(s.d, "signers")], process.env);
  assert.strictEqual(v.status, 0, v.stderr);
  assert.strictEqual(v.stdout.trim(), s.sha);
});

test("verification fails for the wrong key, commit, identity or an unsigned tag", { skip: !hasTools }, () => {
  const s = setup();
  assert.strictEqual(s.run(create, ["v1.2.3", s.sha, "m", "u"], s.env("key")).status, 0);
  const v = (args) => s.run(verify, args, process.env);
  assert.match(v(["v1.2.3", s.sha, path.join(s.d, "signers-other")]).stderr, /does not match|not signed/);
  assert.match(v(["v1.2.3", "0".repeat(40), path.join(s.d, "signers")]).stderr, /not the approved commit/);
  assert.match(v(["v1.2.3", s.sha, path.join(s.d, "signers-empty")]).stderr, /no release key yet/);
  s.git("tag", "v2.0.0");
  assert.match(v(["v2.0.0", "", path.join(s.d, "signers")]).stderr, /not an annotated tag/);
  s.git("-c", "user.name=safeblueprint-release", "-c", "user.email=release@safeblueprint.invalid", "tag", "-a", "v3.0.0", "-m", "x");
  assert.match(v(["v3.0.0", "", path.join(s.d, "signers")]).stderr, /does not match|not signed/);
  s.git("-c", "user.name=someone", "-c", "user.email=s@example.invalid", "-c", "gpg.format=ssh", "-c", `user.signingkey=${path.join(s.d, "key")}`, "tag", "-s", "v4.0.0", "-m", "x");
  assert.match(v(["v4.0.0", "", path.join(s.d, "signers")]).stderr, /not tagged by the release identity/);
});

test("refuses to tag without the key, with a bad input, or a key not in allowed signers", { skip: !hasTools }, () => {
  const s = setup();
  assert.match(s.run(create, ["v1.2.3", s.sha, "m", "u"], s.env("")).stderr, /RELEASE_DEPLOY_KEY is not set/);
  assert.match(s.run(create, ["latest", s.sha, "m", "u"], s.env("key")).stderr, /not a vX\.Y\.Z/);
  assert.match(s.run(create, ["v1.2.3", "abc", "m", "u"], s.env("key")).stderr, /bad commit sha/);
  const r = s.run(create, ["v1.2.3", s.sha, "m", "u"], s.env("other"));
  assert.notStrictEqual(r.status, 0);
  assert.throws(() => execFileSync("git", ["--git-dir", path.join(s.d, "remote.git"), "rev-parse", "refs/tags/v1.2.3"], { stdio: "ignore" }));
});

test("committed release files are well formed", () => {
  const kh = fs.readFileSync(path.join(root, ".github/ssh/github_known_hosts"), "utf8");
  assert.match(kh, /^github\.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl$/m);
  const signers = fs.readFileSync(path.join(root, ".github/release-signers"), "utf8");
  for (const l of signers.split("\n").filter((x) => x && !x.startsWith("#"))) assert.match(l, /^release@safeblueprint\.invalid namespaces="git" ssh-ed25519 [A-Za-z0-9+/=]+( \S+)?$/);
  assert.doesNotMatch(signers, /PRIVATE KEY/);
});
