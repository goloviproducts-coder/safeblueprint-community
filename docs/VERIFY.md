# Verify this release

Check that the SafeBlueprint release you downloaded is exactly what this repository built and published. You need `gh` (GitHub CLI, signed in), `git` and `sha256sum`. Examples use v1.0.0; change the version for later releases.

```bash
REPO=goloviproducts-coder/safeblueprint-community
VER=1.0.0
```

## 1. Download the release

```bash
gh release download "v$VER" --repo "$REPO" && ls
```
```text
SHA256SUMS
safeblueprint-selfhost-1.0.0.cdx.json
safeblueprint-selfhost-1.0.0.spdx.json
safeblueprint-selfhost-1.0.0.zip
```

## 2. Check the checksums (one command)

```bash
sha256sum -c SHA256SUMS
```
Actual output for v1.0.0:
```text
safeblueprint-selfhost-1.0.0.zip: OK
safeblueprint-selfhost-1.0.0.spdx.json: OK
safeblueprint-selfhost-1.0.0.cdx.json: OK
```
Every line must say `OK`. On macOS use `shasum -a 256 -c SHA256SUMS`.

## 3. Check the build provenance of the zip (one command)

Proves the zip was built by this repository's release workflow from the tagged commit, not uploaded by hand.

```bash
gh attestation verify "safeblueprint-selfhost-$VER.zip" --repo "$REPO"
```
Actual output for v1.0.0:
```text
Loaded digest sha256:8e1a789ba2fdceaf33ab348ad82f2904f852ab777c6af3ee451c1fcf6e1bb013 for file://safeblueprint-selfhost-1.0.0.zip
Loaded 1 attestation from GitHub API

The following policy criteria will be enforced:
- Predicate type must match:................ https://slsa.dev/provenance/v1
- Source Repository Owner URI must match:... https://github.com/goloviproducts-coder
- Source Repository URI must match:......... https://github.com/goloviproducts-coder/safeblueprint-community
- Subject Alternative Name must match regex: (?i)^https://github\.com/goloviproducts-coder/safeblueprint-community/
- OIDC Issuer must match:................... https://token.actions.githubusercontent.com

✓ Verification succeeded!

The following 1 attestation matched the policy criteria

- Attestation #1
  - Build repo:..... goloviproducts-coder/safeblueprint-community
  - Build workflow:. .github/workflows/release.yml@refs/tags/v1.0.0
  - Signer repo:.... goloviproducts-coder/safeblueprint-community
  - Signer workflow: .github/workflows/release.yml@refs/tags/v1.0.0
```

## 4. Check the SBOM attestation (one command)

Proves the SPDX SBOM (the component list) was produced for this exact zip by the release workflow.

```bash
gh attestation verify "safeblueprint-selfhost-$VER.zip" --repo "$REPO" --predicate-type https://spdx.dev/Document/v2.3
```
Actual output for v1.0.0 (last lines):
```text
- OIDC Issuer must match:................... https://token.actions.githubusercontent.com

✓ Verification succeeded!

The following 1 attestation matched the policy criteria

- Attestation #1
  - Build repo:..... goloviproducts-coder/safeblueprint-community
  - Build workflow:. .github/workflows/release.yml@refs/tags/v1.0.0
  - Signer repo:.... goloviproducts-coder/safeblueprint-community
  - Signer workflow: .github/workflows/release.yml@refs/tags/v1.0.0
```
The SBOM file itself is covered by `SHA256SUMS` in step 2.

## 5. Check the signed tag

Tags are signed with an SSH key. The public key is in [`.github/allowed_signers`](../.github/allowed_signers); cross-check it against the maintainer's published signing key at https://api.github.com/users/goloviproducts-coder/ssh_signing_keys before trusting it.

```bash
git clone --quiet "https://github.com/$REPO" sb && cd sb
git -c gpg.ssh.allowedSignersFile=.github/allowed_signers tag -v "v$VER"
```
Actual output for v1.0.0 (signature line):
```text
Good "git" signature for 268750567+goloviproducts-coder@users.noreply.github.com with ED25519 key SHA256:e5sPoW0m…
```
(Fingerprint shortened here; your output shows it in full and it must match `ssh-keygen -lf` of the key in `.github/allowed_signers`.)

Note: GitHub's web page does not show a "Verified" badge on the v1.0.0 tag because the tagger name on that tag differs from the signing account. The cryptographic check above is what matters. Future tags will use the matching identity.

## 6. Rebuild it yourself (reproducible build)

From the release after v1.0.0 onward, the zip is reproducible: anyone can rebuild it from the tagged commit and get a byte-identical file. v1.0.0 predates this and cannot be rebuilt bit-for-bit.

```bash
git clone --quiet "https://github.com/$REPO" sb && cd sb
git checkout "v$VER"
scripts/build-release.sh "$VER" /tmp/rebuild
grep "safeblueprint-selfhost-$VER.zip" /path/to/downloaded/SHA256SUMS
```
The hash printed by the script must equal the line in `SHA256SUMS`. Requirements: Linux (or WSL) with `git`, `zip` (Info-ZIP 3.0) and coreutils.

How it stays deterministic (`scripts/build-release.sh`):
- files come from the git tree (`git archive`), never from your working copy;
- every file time is set to `SOURCE_DATE_EPOCH`, which defaults to the commit time;
- entries are sorted, permissions are fixed (files 0644, folders 0755), and no extra attributes or folder entries are stored (`zip -X -D`);
- timezone and locale are fixed to UTC and C.

The `reproducible-build` check builds the zip twice on every pull request and fails if the hashes differ, and the release workflow does the same before publishing.

## 7. After unzipping

```bash
cd "safeblueprint-selfhost-$VER" && sha256sum -c SHA256SUMS.txt
```
Checks every site file against the published hashes.

If any step fails, do not deploy the files. Report it privately through [GitHub security advisories](https://github.com/goloviproducts-coder/safeblueprint-community/security/advisories/new).

General guidance only, not legal advice.
