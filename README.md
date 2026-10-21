# SafeBlueprint Community Edition

[![CodeQL](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/codeql.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/codeql.yml) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/goloviproducts-coder/safeblueprint-community/badge)](https://scorecard.dev/viewer/?uri=github.com/goloviproducts-coder/safeblueprint-community) [![checksums](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/checksums.yml/badge.svg)](https://github.com/goloviproducts-coder/safeblueprint-community/actions/workflows/checksums.yml)

Free, self-hostable AI decision-readiness and AI security checklist. **Everything runs on your device**: no accounts, no tracking, no external calls, nothing you type leaves the browser unless you choose to save an export.

Hosted version: https://safeblueprint.pages.dev

## What it does
- **APP 1.7 automated-decision readiness** - prepare for the Privacy Act transparency duties for automated decisions using personal information.
- **AI security checklist** - mapped to OWASP LLM Top 10 (2025), MITRE ATLAS, NIST AI RMF, ISO/IEC 42001 themes, the Australian Guidance for AI Adoption and ASD guidance.
- **Three-part report**: A - For leaders (one-minute page 1), B - For the delivery team, C - For security architects (pattern match).
- **Portfolio view** - group decisions across initiatives by AI type.
- Exports to PDF, JSON (schema in `site/schema/report/`) and Markdown, ready to feed into GRC or AI tools.

## Customise the questions
Load your own questions (your policies, control IDs and owners) from a CSV or JSON file. It stays on your device. Plain guide: [docs/CUSTOMISING.md](docs/CUSTOMISING.md). Template: [site/questions/template.csv](site/questions/template.csv). Example: [examples/acme-pack.csv](examples/acme-pack.csv).

## Quick start
```bash
npx serve site                 # local, http://localhost:3000
docker compose up -d           # Docker + nginx, see INSTALL.md
```
Or copy `site/` to any static host (intranet, S3, Azure Static Web Apps). Serve from the site root. Verify integrity with `sha256sum -c SHA256SUMS.txt`. Details: [INSTALL.md](INSTALL.md).

## Verify a release

Each GitHub Release ships the zip, SPDX and CycloneDX SBOMs, a `SHA256SUMS` file, and signed build-provenance and SBOM attestations.

```bash
gh release download v1.0.0 --repo goloviproducts-coder/safeblueprint-community
sha256sum -c SHA256SUMS
gh attestation verify safeblueprint-selfhost-1.0.0.zip --repo goloviproducts-coder/safeblueprint-community
```
Both must pass before you deploy. After unzipping, `sha256sum -c SHA256SUMS.txt` inside the folder checks every file.

## Project
- [Governance](GOVERNANCE.md) · [Roadmap](ROADMAP.md) · [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## Screenshots
| Leader summary (portfolio) | Portfolio report p1 | Portfolio report p2 |
|---|---|---|
| ![](docs/screenshots/leader-summary-portfolio-page-1.png) | ![](docs/screenshots/sample-portfolio-page-1.png) | ![](docs/screenshots/sample-portfolio-page-2.png) |

| Single initiative p1 | p2 | p3 |
|---|---|---|
| ![](docs/screenshots/single-initiative-page-1.png) | ![](docs/screenshots/single-initiative-page-2.png) | ![](docs/screenshots/single-initiative-page-3.png) |

Full sample (fictional company): [docs/samples/sample-portfolio.pdf](docs/samples/sample-portfolio.pdf)

## Contributing
We welcome bug reports, framework mapping updates, new security patterns, question packs, wording fixes and translations. Read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Look for `good first issue`.

## Security scans
Every PR runs: unit tests (`npm test`), checksum + no-outbound-calls check, CodeQL (JavaScript and Actions), Semgrep, Gitleaks (full history), Trivy (config + filesystem), dependency review, zizmor (workflow linting) and HTML validation. Lighthouse runs report-only. OpenSSF Scorecard runs on `main` weekly. All actions are pinned to commit SHAs with least-privilege permissions. An optional AI security review runs when a maintainer adds the `security-review` label; it is **off until an `ANTHROPIC_API_KEY` secret is added**.

## Security
See [SECURITY.md](SECURITY.md). Please don't open public issues for vulnerabilities.

## Not legal advice
SafeBlueprint is a readiness aid, not legal advice. You own your content and outputs; check obligations with a qualified adviser.

## Credit
Apache-2.0 requires you to keep the LICENSE and NOTICE files with any copy or fork. A visible "Built with SafeBlueprint" link back to this repository is appreciated but not required. Under section 6 of the licence, the SafeBlueprint name may not be used to endorse or promote forks without permission.

## License
Apache-2.0 - see [LICENSE](LICENSE).
