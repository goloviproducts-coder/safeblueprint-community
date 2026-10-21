## What and why


## Approval checklist

### 1. Required scans green
- [ ] `verify`, CodeQL, Semgrep, Gitleaks, Trivy, dependency review and zizmor all pass
- [ ] Any findings are fixed, or justified in this PR

### 2. Stays on-device
- [ ] No new external calls (fetch, scripts, fonts, CDNs, APIs)
- [ ] No tracking, analytics or telemetry
- [ ] No capturing or storing user input without consent

### 3. Content safety
- [ ] No penalty amounts and nothing presented as legal advice
- [ ] Framework claims cite a current official source (name, version, date)
- [ ] No organisation or brand mentions and no email addresses

### 4. Still works
- [ ] `SHA256SUMS.txt` and SRI hashes updated
- [ ] Runs locally with `npx serve site`
- [ ] PDF, JSON and Markdown exports work

### 5. Hygiene
- [ ] Commits signed off (DCO, `git commit -s`)
- [ ] Small, focused PR
- [ ] No new dependencies without prior discussion
- [ ] All review conversations resolved

> **Maintainer final approval required** for changes to security headers (`site/_headers`, `nginx.conf`), privacy wording, workflows (`.github/`), `LICENSE` or `SECURITY.md`.
