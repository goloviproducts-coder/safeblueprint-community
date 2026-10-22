# Governance

SafeBlueprint Community Edition is an open-source project under the Apache-2.0 licence. This page explains who decides what, and how.

## Roles
| Role | Who | Responsibilities |
|---|---|---|
| Maintainer | ([@goloviproducts-coder](https://github.com/goloviproducts-coder)) | Final approval of every change to `main`, every release and every production deploy. Owns the roadmap, security response and licensing. |
| Automated reviewer | The project's review bot | First review of every pull request: reads the change, checks it against the rules below and posts a review comment. It never gives the final approval. |
| Contributors | Anyone | Open issues, discussions and pull requests under the [Contributing guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md). |

## How a change reaches `main`
1. A contributor opens a pull request. Commits are signed and carry a DCO `Signed-off-by` line.
2. Every required check runs: tests, CodeQL, Semgrep, Gitleaks, Trivy, OSV-Scanner, dependency review, zizmor, HTML validation, ZAP and the threat-model gate.
3. The automated reviewer posts a first review. It flags anything that needs the maintainer's explicit sign-off: privacy wording, workflow or supply-chain changes, licence changes, and any public claim.
4. The maintainer gives the final approval. Merges are squash or rebase only, with linear history.
5. Deploys to the hosted site and releases need a separate maintainer approval.

## Decisions
- **Day-to-day:** decided in the pull request or issue by the maintainer, after the automated review and any community comments.
- **Larger changes** (new features, new data handling, changes to the scoring model or schemas): open an issue labelled `proposal` first. It stays open for comment for at least 7 days before the maintainer decides and records the reason in the issue.
- **Non-negotiables:** everything runs on the visitor's device; nothing a user enters is captured without their consent; no penalty amounts; the tool is not legal advice.

## Security
See [SECURITY.md](SECURITY.md). Reports are acknowledged within 72 hours and fixes are published as GitHub Security Advisories.

## Becoming a maintainer
Contributors with a record of sustained, high-quality contributions may be invited by the maintainer. New maintainers are added to this file and to `.github/CODEOWNERS` through a pull request.

## Changes to this document
Changes to governance follow the larger-change process above.
