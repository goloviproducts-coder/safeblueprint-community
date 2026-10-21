# Contributing to SafeBlueprint

Thanks for helping. This guide explains what we accept and how to get a change merged.

## Ways to contribute
- **Bug reports** - use the Bug report template; include browser, OS, steps, expected vs actual. Never paste real personal or confidential data.
- **Framework / control mapping updates** - e.g. a new OWASP LLM Top 10 release, NIST AI RMF, ISO/IEC 42001, MITRE ATLAS, Australian Guidance for AI Adoption, ASD guidance, EU AI Act dates. Cite the official source and version/date.
- **New security patterns** - additions to the PAT-nn pattern library (e.g. new agent or RAG patterns). Describe the context, risks, controls and mapping.
- **Wording and readability** - plainer language, especially page 1 for leaders. Keep it short.
- **Translations** - open an issue first so we can agree file structure.
- **Docs** - INSTALL.md, hosting recipes, screenshots.

## Workflow
1. Open or find an issue and comment that you're working on it (small typos can skip this).
2. Fork the repo and create a branch: `git checkout -b fix/short-description`.
3. Make focused changes - one topic per PR.
4. Run locally and test (below).
5. Update hashes (below).
6. Commit with sign-off and push to your fork.
7. Open a PR to `main` using the template. `main` is protected: PRs need 1 approving review, the checksums check must pass, conversations must be resolved, and history is linear (squash or rebase).

## Run locally
```bash
npx serve site      # then open http://localhost:3000
```
Check every page you touched, the PDF/JSON/Markdown exports, and the browser devtools Network tab: there must be **no requests to outside hosts**.

## Updating hashes after edits
**SRI:** if you change a JS or CSS file referenced with `integrity="sha384-..."`, regenerate it:
```bash
openssl dgst -sha384 -binary site/app.css | openssl base64 -A
```
and update every `integrity` attribute pointing at that file (`grep -rn 'app.css' site`).

**SHA256SUMS:** regenerate from the repo root, then verify:
```bash
find . -type f \( -path './site/*' -o -name Dockerfile -o -name docker-compose.yml -o -name nginx.conf -o -name INSTALL.md -o -name VERSION \) | sort | xargs sha256sum > SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt
```
CI runs `sha256sum -c` on every PR; it fails if you forget.

## Approval criteria
A PR is approved when all of the following hold (mirrors the PR template checklist).

### 1. Required scans green
- `verify`, CodeQL, Semgrep, Gitleaks, Trivy, dependency review and zizmor all pass
- Any findings are fixed, or justified in this PR

### 2. Stays on-device
- No new external calls (fetch, scripts, fonts, CDNs, APIs)
- No tracking, analytics or telemetry
- No capturing or storing user input without consent

### 3. Content safety
- No penalty amounts and nothing presented as legal advice
- Framework claims cite a current official source (name, version, date)
- No organisation or brand mentions and no email addresses

### 4. Still works
- `SHA256SUMS.txt` and SRI hashes updated
- Runs locally with `npx serve site`
- PDF, JSON and Markdown exports work

### 5. Hygiene
- Commits signed off (DCO, `git commit -s`)
- Small, focused PR
- No new dependencies without prior discussion
- All review conversations resolved

> **Maintainer final approval required** for changes to security headers (`site/_headers`, `nginx.conf`), privacy wording, workflows (`.github/`), `LICENSE` or `SECURITY.md`.

## Security scans on your PR
Required to pass: `verify` (checksums + no outbound calls), CodeQL, Semgrep, Gitleaks, Trivy, dependency review and zizmor. HTML validation must pass too; Lighthouse is report-only. If a scanner flags a false positive, explain it in the PR rather than disabling the rule. New workflows must pin actions to a full commit SHA, use least-privilege `permissions`, set `persist-credentials: false` and never use `pull_request_target`. The `security-review` label triggers an optional AI review (off until the maintainers add an API key).

## Commit style
- Conventional prefixes: `feat:`, `fix:`, `docs:`, `mapping:`, `pattern:`, `i18n:`, `chore:`.
- Imperative, under 72 chars: `mapping: add OWASP LLM08 controls to PAT-03`.
- Explain *why* in the body when it isn't obvious.

## DCO sign-off
Every commit must be signed off under the [Developer Certificate of Origin](https://developercertificate.org/):
```bash
git commit -s -m "fix: correct schema link"
```
Forgot? `git commit --amend -s` or `git rebase --signoff main`.

## Review expectations
- A maintainer aims to respond within 7 days.
- Expect questions on sources for mapping changes.
- Keep PRs small; large PRs may be asked to split.
- Address feedback with new commits; we squash on merge.

## What we won't accept
- Penalty amounts or fine figures.
- Anything presented as legal advice (keep "Not legal advice" intact).
- Tracking, analytics, telemetry, cookies or fingerprinting.
- External calls: CDNs, fonts, APIs, remote scripts. Everything runs on the device.
- Capturing or storing user input without explicit consent.
- Vendor promotion or affiliate links.
- New build tooling or dependencies without prior discussion.

## Good first issues
Look for the [`good first issue`](../../labels/good%20first%20issue) label - wording, docs and small mapping fixes.

## Conduct
Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
