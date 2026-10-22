# Contributing to SafeBlueprint

Thanks for helping. This guide explains what we accept and how to get a change merged.

## Ways to contribute
- **Bug reports** - use the Bug report template; include browser, OS, steps, expected vs actual. Never paste real personal or confidential data.
- **Framework / control mapping updates** - e.g. a new OWASP LLM Top 10 release, NIST AI RMF, ISO/IEC 42001, MITRE ATLAS, Australian Guidance for AI Adoption, ASD guidance, EU AI Act dates. Cite the official source and version/date.
- **New security patterns** - additions to the PAT-nn pattern library (e.g. new agent or RAG patterns). Describe the context, risks, controls and mapping.
- **Wording and readability** - plainer language, especially page 1 for leaders. Keep it short.
- **Translations** - open an issue first so we can agree file structure.
- **Question packs** - see "Contribute a question pack" below.
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

## Tests
Run `npm test` (Node 20+, no install needed). **Test policy: new or changed functionality must include tests in the automated suite (`test/`), and the `tests` CI check must pass.**

## Contribute a question pack
1. Build it with [docs/CUSTOMISING.md](docs/CUSTOMISING.md) and check it loads with no errors.
2. Put it in `examples/<name>-pack.csv` with `# name:` and `# version:` lines.
3. Cite official sources (with version/date) for every framework ID in `maps_to_control`. No penalty amounts, no legal advice, no organisation names or email addresses.
4. Add it to the list in `test/validation.test.js` ("shipped template and example packs are valid").
5. If you change the built-in questions in `home.js` or `checklist.js`, run `npm run build:default-pack` and commit `site/questions/default.*`.

## Updating hashes after edits
Quickest: `node scripts/update-hashes.js` updates every SRI attribute and `SHA256SUMS.txt`. CI fails if you forget. Manual method:

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
- New or changed functionality has tests and `npm test` passes

### 5. Hygiene
- Commits signed off (DCO, `git commit -s`)
- Small, focused PR
- No new dependencies without prior discussion
- All review conversations resolved

> **Maintainer final approval required** for changes to security headers (`site/_headers`, `nginx.conf`), privacy wording, workflows (`.github/`), `LICENSE` or `SECURITY.md`.

## Security scans on your PR
Required to pass: `test` (unit tests + hashes current), `verify` (checksums + no outbound calls), CodeQL, Semgrep, Gitleaks, Trivy, dependency review and zizmor. HTML validation must pass too; Lighthouse is report-only. If a scanner flags a false positive, explain it in the PR rather than disabling the rule. New workflows must pin actions to a full commit SHA, use least-privilege `permissions`, set `persist-credentials: false` and never use `pull_request_target`. The `security-review` label triggers an optional AI review (off until the maintainers add an API key).

## Threat model gate
`THREAT_MODEL.md` and `docs/threat-model/safeblueprint.json` (OWASP Threat Dragon v2) describe how SafeBlueprint can be attacked and what stops it. The `threat-model-gate` check runs `scripts/threat-model-gate.js` on every PR. It **fails** when the PR changes a security-sensitive area and neither threat model file changed:
- `site/_headers`, `nginx.conf`, `Dockerfile`, `docker-compose.yml`
- `.github/workflows/**`, `.github/dependabot.yml`, `.github/CODEOWNERS`
- `site/schema/**`, `site/questions/loader.js`, `site/questions/engine.js`
- `scripts/threat-model-gate.js`, `test/threat-model-gate.test.js`, `.zap/**`, `package.json`, `package-lock.json`
- export code (`site/report.js`, `site/forms.js`) and `site/sw.js`
- any changed `site/**/*.js` that uses `fetch(`, `XMLHttpRequest`, `FileReader`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator.sendBeacon`, `import(`, `WebSocket`, `EventSource`, `postMessage` or `innerHTML`

To pass: add or update the relevant threats and mitigations (edit the JSON in Threat Dragon, then mirror the table in `THREAT_MODEL.md`), **or** ask a maintainer to review and apply the `threat-model-reviewed` label. The label only counts if a user with admin or maintain permission applied it **after the latest push**; a new push removes the label automatically. The gate script always runs from the base branch, so a PR cannot weaken it, and changes to the gate itself, its tests, `.zap/**`, `CODEOWNERS` or `package*.json` are also security-sensitive. The JSON must parse, and the job summary lists the areas that were triggered. Tests: `test/threat-model-gate.test.js`.

## Extra scanners
- **harden-runner** (egress audit) runs first in every job except container jobs (semgrep), where it isn't supported.
- **OSV-Scanner** checks dependencies on PRs and weekly.
- **ZAP baseline** passively scans `npx serve site` on PRs and fails on any High-risk alert. Tune false positives in `.zap/rules.tsv` with a reason. Header alerts are ignored locally because `serve` does not apply `site/_headers`; production headers are set in `_headers` and `nginx.conf`.

## Editions and deploys
- `site/` is the **self-hosted edition**: contact form off, nothing sent anywhere. The release zip is built from it.
- `editions/hosted/` overlays the **hosted edition** (https://safeblueprint.pages.dev): contact page, `contact.js`, `config.js` with `FORM_ENDPOINT = "/api/contact"`. `functions/api/contact.js` is the Cloudflare Pages Function; it sends through Resend only and reads `RESEND_API_KEY` and `CONTACT_TO` from the Pages environment. No keys or addresses live in the repo.
- Build either with `node scripts/build-edition.js hosted|selfhost`.
- Release flow: **PR to `main`** (review + all required checks) → **fast-forward `staging` to `main`** (`git push origin origin/main:staging`, or open a PR into `staging`) → `deploy-staging.yml` deploys automatically to https://staging.safeblueprint.pages.dev (no approval; `X-Robots-Tag: noindex`) → check staging → **approve the `production` environment** on the waiting `deploy` run.
- `staging` is protected from deletion and force-pushes. Manual staging deploys: Actions → deploy-staging → Run workflow.
- Every merge to `main` runs `deploy.yml`, which waits for a maintainer to approve the `production` environment, builds the hosted edition, deploys it to Cloudflare Pages and smoke-tests it.

## Penetration tests
| What | When | Fails on |
|---|---|---|
| `security-tests`: Playwright browser tests in `test/security/` (malicious CSV/JSON packs with script tags, `onerror`, `javascript:` URLs, formula injection, huge and deeply nested files; CSP violations; zero cross-origin requests during full tool runs and exports) | every PR | any injected script running, a CSP violation, or any request to another origin |
| `nuclei` (pinned image digest, templates v10.5.0) against `serve site` | every PR | any medium, high or critical finding |
| `nikto` against the Docker image built from `Dockerfile` | PRs touching Dockerfile, nginx.conf or compose, and weekly | missing security headers or nginx version disclosure (Nikto items are reported in the job summary) |
| ZAP full (active) scan against `serve site` | weekly, on `v*` tags, or manually | any High alert; it also opens an issue |

Run the browser tests locally with `npm ci && npx playwright install chromium && npm run test:security`. Add a test for any new way user content reaches the page or an export.

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
