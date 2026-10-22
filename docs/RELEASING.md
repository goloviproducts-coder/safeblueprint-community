# Releasing, previews, staging and rollback

| Stage | Trigger | Where | Approval |
|---|---|---|---|
| Preview | Every PR from a branch in this repo (never forks or Dependabot) | `https://pr-<number>.safeblueprint.pages.dev`, URL posted as a PR comment | None (`preview` environment) |
| Staging | Every merge to `main`, every release tag, or Actions → deploy → Run workflow | https://staging.safeblueprint.pages.dev | None (`staging` environment) |
| Production | A signed `vX.Y.Z` tag on `main` | https://safeblueprint.pages.dev | Maintainer (`production` environment) |
| Production (label) | Merge of a PR labelled `prod` **by goloviproducts-coder** | https://safeblueprint.pages.dev, right after staging | Owner's PR review + owner-applied label (`production` environment) |
| Rollback | Actions → rollback → Run workflow with an earlier tag | https://safeblueprint.pages.dev | Maintainer (`production` environment) |

Previews and staging send `X-Robots-Tag: noindex, nofollow` so search engines ignore them. Production does not. All deploys build the hosted edition with `scripts/build-edition.js` and use the same pinned actions, harden-runner, read-only token permissions and no package-manager cache.

## Label `prod` (fastest)
Add the label `prod` to a PR before merging it. After the merge, `deploy.yml` deploys staging, then production straight away in the `production` environment, with no approval step. The label only counts if the latest `prod` label event on that PR was by **goloviproducts-coder**; a label added by a bot or anyone else is ignored (staging only, with a warning). Unlabelled merges stop at staging. This does not tag or publish a release; use approve-release for a versioned release.

The `production` environment has no required reviewers, so labelled merges (and tag or approve-release releases) deploy without a second approval. The gates are the owner's approving review on the PR plus the owner-applied `prod` label, or the owner's approve-release dispatch. Only the release tagging job reads `RELEASE_DEPLOY_KEY`; the label deploy job uses only the Cloudflare secrets.

## Approve to release (recommended for versioned releases)
No local tagging needed.
1. **Prepare (PR).** Same as step 1 below: `node scripts/prepare-release.js patch|minor|major`, `node scripts/update-hashes.js`, signed commit, PR, merge.
2. **Start.** Actions → **approve-release** → Run workflow on `main`, version `vX.Y.Z`. The `check` job confirms CHANGELOG, VERSION and package.json are prepared for that version, the tag is free and main HEAD is a verified commit, and records main's SHA.
3. **Approve.** The `release-production` job waits for the `production` environment. Review the summary and approve under the run → Review deployments. This is the only approval.
4. **Automatic.** After approval it SSH-signs an annotated tag at the recorded SHA with the release deploy key (tagger `safeblueprint-release <release@safeblueprint.invalid>`; the message names the approver and the run), checks the signature against `.github/release-signers`, and pushes only that tag over SSH, trusting only the pinned github.com host key in `.github/ssh/github_known_hosts`. It then deploys that commit to production with the same steps and smoke tests as `deploy.yml`, and calls `release.yml` to build the reproducible zip, SBOMs, SHA256SUMS and provenance attestation and publish the release. The notes come from the CHANGELOG and name the approver and the run URL.

Notes:
- GitHub can't show these tags as **Verified**: that badge needs a key registered to a user account, and a deploy key isn't one. `release.yml` (called path) and `rollback.yml` verify them against the committed `.github/release-signers` instead. To check by hand: `git fetch origin tag vX.Y.Z && git -c gpg.ssh.allowedSignersFile=.github/release-signers verify-tag vX.Y.Z`, or run `scripts/verify-release-tag.sh vX.Y.Z`.
- The SSH push does trigger the tag-push `release` and `deploy` workflows. Their first job (`source`) sees the release identity as the tagger and skips them, so nothing is released or deployed twice and there's no second approval.
- If the deploy fails after tagging, the tag exists without a release. Fix forward with a new patch version, or delete the tag (maintainer) and run again. If only `publish` fails, re-run the failed job.

### One-time setup (maintainer, on your own computer; the private key never leaves it except into the secret)
1. Generate the key with no passphrase: `ssh-keygen -t ed25519 -N "" -C safeblueprint-release -f ./safeblueprint-release`
2. Add the deploy key: Settings → Deploy keys → Add deploy key. Title `safeblueprint-release`, paste `safeblueprint-release.pub`, tick **Allow write access**, click Add key.
3. Add the secret: Settings → Environments → `production` → Environment secrets → Add environment secret. Name `RELEASE_DEPLOY_KEY`, value = the whole private key file `safeblueprint-release` (including the BEGIN/END lines).
4. Allow the public key to sign releases: add this one line to `.github/release-signers` in a PR (or paste the **public** key to the maintainers and they will open the PR):
   `release@safeblueprint.invalid namespaces="git" <contents of safeblueprint-release.pub>`
5. Tag ruleset: Settings → Rules → Rulesets → Protect release tags → Bypass list → Add bypass → **Deploy keys** → Always allow → Save changes.
6. Delete the local private key: `rm ./safeblueprint-release` (keep or delete the `.pub`; it is public).

To rotate: repeat with a new key, replace the line in `.github/release-signers` and the secret, and delete the old deploy key. To revoke: delete the deploy key and remove the line.

## Cutting a release (manual signed tag)
1. **Prepare (PR).** On a new branch run `node scripts/prepare-release.js patch|minor|major`. It computes the next version from the latest `v*` tag and moves the CHANGELOG `Unreleased` bullets into that version, updating `VERSION` and `package.json`. Run `node scripts/update-hashes.js`, commit (signed, `-s`), open a PR, and merge it once the checks pass. Staging updates automatically.
2. **Gate.** Actions → **Release** → Run workflow on `main` and choose the same bump. Only the maintainer can run it (`release` environment, required reviewer). It checks that `main` HEAD is a verified commit, that CHANGELOG and VERSION match the next version and that the tag is free, then prints the exact tag command in the job summary.
3. **Tag (maintainer, locally).** Use `scripts/tag-release.sh vX.Y.Z`: it runs `scripts/check-release.js` against `origin/main` and refuses to sign the tag unless CHANGELOG has a `## [X.Y.Z]` section with all six headings and `VERSION` and `package.json` say `X.Y.Z`. Or run the printed command, for example:
   `git fetch origin && git tag -s v1.1.0 -m "SafeBlueprint v1.1.0" <main HEAD sha> && git push origin v1.1.0`
   Your signing key must be added to GitHub as a **signing** key so the tag shows as Verified.
4. **Build.** The tag push runs `release.yml`: it checks that the tag is signed, annotated and on `main`, then builds the zip, SPDX and CycloneDX SBOMs, SHA256SUMS and provenance attestations, and publishes release notes taken from the CHANGELOG section.
5. **Deploy.** The same tag push runs `deploy.yml`: staging first, then `deploy-production` verifies the tag and waits. Approve it under Actions → the run → Review deployments.

### Release readiness checks
`scripts/check-release.js` is the single check for release files. It runs on every PR and on main (CHANGELOG, VERSION and package.json must agree), in `tag-release.sh` before signing, and first thing in `release.yml` and `deploy-production` on a tag push, so a tag cut without step 1 fails in seconds with the fix to apply and never reaches production. If that happens, merge the prepare PR, then delete and re-create the tag.

### Why CI does not create the tag
A tag created by CI would not be signed with the maintainer's key. The `v*` tag ruleset allows only admins to create tags, and a tag pushed with `GITHUB_TOKEN` would not trigger the release and deploy workflows. Tagging locally with your own key is the safest option.

## Rolling back
Actions → **rollback** → Run workflow, enter a tag (for example `v1.1.0`), then approve the `production` environment. The workflow checks that the tag is signed (verified by GitHub), annotated and on `main`. It then checks out exactly that commit, verifies SHA256SUMS, builds and deploys to production, and smoke-tests the site. It never pushes to `main` or changes tags. Tags older than the hosted-edition build script (including `v1.0.0`) cannot be rolled back to; the workflow stops with a clear error.

## Moving the Cloudflare secrets into environments (maintainer)
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are currently repository secrets, so any workflow can reference them. To limit them to the deploy environments:
1. Settings → Environments → `production`, `staging` and `preview` → Add environment secret: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the same values). Optionally use a separate Cloudflare token for `preview` (Pages: Edit only).
2. Run one preview, one staging and one production deploy to confirm.
3. Settings → Secrets and variables → Actions → delete the two **repository** secrets.
