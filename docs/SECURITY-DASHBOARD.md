# Security dashboard

Live status of every security control on this repository. Badges update automatically; click any badge for the latest run. Everything here is public and anyone can check it.

## OpenSSF Scorecard
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/goloviproducts-coder/safeblueprint-community/badge)](https://scorecard.dev/viewer/?uri=github.com/goloviproducts-coder/safeblueprint-community)

Target: **8.0 or above**. Full check-by-check results: [Scorecard viewer](https://scorecard.dev/viewer/?uri=github.com/goloviproducts-coder/safeblueprint-community) or `curl -s https://api.securityscorecards.dev/projects/github.com/goloviproducts-coder/safeblueprint-community`.

| Check | Status on 22 Oct 2026 | What we do |
|---|---|---|
| Dangerous-Workflow, Token-Permissions, Pinned-Dependencies | 10 | Read-only default token, per-job permissions, every action and image pinned by SHA or digest |
| Security-Policy, License, Binary-Artifacts, Vulnerabilities, Dependency-Update-Tool, CI-Tests | 10 | SECURITY.md, Apache-2.0, no binaries, OSV/Trivy/Dependabot |
| SAST | 9 | CodeQL and Semgrep on every pull request and push to main; rises to 10 as history accrues |
| Fuzzing | 0 (pending re-scan) | Property-based fuzzing of the question-pack loader with fast-check (`test/fuzz.test.js`), run on every change |
| Signed-Releases | 0 | Releases carry GitHub artifact attestations (SLSA provenance and SBOM). Scorecard only counts signature files attached to the release; see [SLSA](SLSA.md) |
| Branch-Protection | 4 | Rulesets protect main and release tags; Scorecard's default token cannot read every ruleset setting |
| Code-Review | 0 | Every change goes through a pull request; rises as changes are approved by a maintainer |
| Maintained, Contributors | 0 | Time- and community-based; the project is under 90 days old |
| CII-Best-Practices | 0 | OpenSSF Best Practices badge in progress |

## Workflows
| Area | Badge |
|---|---|
| Tests (unit, fuzzing, pack validation) | [![tests](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/tests.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/tests.yml) |
| Static analysis (SAST) | [![CodeQL](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/codeql.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/codeql.yml) [![Semgrep](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/semgrep.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/semgrep.yml) |
| Secrets | [![Gitleaks](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/gitleaks.yml) |
| Dependencies and containers | [![Trivy](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/trivy.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/trivy.yml) [![OSV-Scanner](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/osv-scanner.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/osv-scanner.yml) [![Dependency review](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/dependency-review.yml) |
| Workflow security | [![zizmor](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zizmor.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zizmor.yml) |
| Dynamic testing (DAST) and pentest | [![ZAP baseline](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zap-baseline.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zap-baseline.yml) [![ZAP full](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zap-full.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/zap-full.yml) [![Nuclei](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/nuclei.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/nuclei.yml) [![Nikto](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/nikto.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/nikto.yml) |
| Browser security and privacy tests | [![Security tests](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/security-tests.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/security-tests.yml) |
| Threat model gate | [![Threat model gate](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/threat-model-gate.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/threat-model-gate.yml) |
| Site quality | [![Site quality](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/site-quality.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/site-quality.yml) |
| Integrity and supply chain | [![checksums](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/checksums.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/checksums.yml) [![Scorecard](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/scorecard.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/scorecard.yml) [![Release](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/release.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/release.yml) |

## Also enabled (checked with the GitHub API on 22 Oct 2026)
- Secret scanning with push protection
- Dependabot alerts and Dependabot security updates
- Private vulnerability reporting
- `main` ruleset: pull request with review required, required status checks, signed commits, linear history, no force-push, no deletion
- Release-tag ruleset (`v*`): tags cannot be created, moved or deleted except by admins

Found something? See [SECURITY.md](../SECURITY.md).
