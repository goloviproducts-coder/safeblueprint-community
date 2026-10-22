# Changelog

All notable changes to this project are documented here. Each release uses six plain-English headings: Features, Issues fixed, Interfaces updated, Security fixes, Privacy, General (see docs/RELEASE_NOTES_TEMPLATE.md). The release workflow publishes the matching section as the GitHub release notes. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Features
- The top of the home page now shows the fictional sample report card (Wattle Lane Retail), in place of the plain sample link and the blank card lower down
- The fictional sample report now shows the APP 1.7 coverage the check gives: refusals and good or bad effects, children and vulnerable people, human review still in scope, sensitive information named separately, a dated policy reviewed yearly, exemptions as a screen only, and the commercial-in-confidence carve-out
- Label `prod` on a PR (applied by the owner) deploys it to production when merged, after staging succeeds and the maintainer approves the production environment; unlabelled merges stop at staging
- Approve to release: one maintainer approval tags main, deploys production and publishes the release, with no local tagging

### Issues fixed
- APP 1.7 check and fictional sample report: the yearly policy review, the commercial-in-confidence/trade-secret carve-out and human-review-still-counts lines now read as OAIC guidance or good practice, not legal requirements, each with a link to its OAIC APP Guidelines paragraph (1.9, 1.67, 1.41). The legal duty to keep the policy up to date (APP 1.3) is kept separate
- The sample card at the top of the home page now opens the fictional sample report PDF (/samples/sample-portfolio.pdf) in a new tab; before, the PDF was only in docs/ and the site returned the home page for it
- APP 1.7 check now covers every area in the OAIC APP 1.7-1.9 guidance: refusing or failing to decide, good or bad effects, people experiencing vulnerability, human review not removing scope, sensitive information, privacy-policy placement and yearly review, exemptions as a screen only, and the commercial-in-confidence exclusion. Questions stay fixed

### Interfaces updated
- New Actions workflow: approve-release (Run workflow with a version, then approve production)

### Security fixes
- The approved release tags exactly the commit that was checked before approval, signed with a dedicated release key checked against a committed allowed-signers list; release notes record the approver and the run
- Build provenance attestation kept for every release

### Privacy
- No change

### General
- Release guide and threat model updated

## [1.0.1] - 2026-10-22
### Features
- Custom question packs: load your own questions from CSV or JSON, with weights and control mappings
- HTML export for custom question pack reports
- Community question pack library: health, education and public sector starter packs, plus a template for your own internal control IDs
- Public security dashboard showing the live status of every security check
- Pull request previews: each PR gets its own temporary preview link, posted on the PR and hidden from search engines
- Reproducible release builds: anyone can rebuild the self-host zip from the tagged commit and get an identical file
- "Verify this release" guide (docs/VERIFY.md) with one-command checks for checksums, build provenance, the SBOM and the signed tag
- Threat model inventory generated from the code (pages, data flows, external endpoints, storage, headers, workflow permissions)
- Site menu grouped into Tools, Trust and About on phone and desktop

### Issues fixed
- Removed a penalty figure from the guidance (we do not quote penalty amounts)
- Fixed the automated security scans so every scan runs on every change
- Cosmetic changes such as menu, styling and copy no longer get stuck at the threat model check
- Staging deploys no longer stall behind a pending production approval (separate staging concurrency group)
- Staging and preview sites keep their full security headers when hidden from search engines
- Release checks now stop a version tag early when the changelog section or version number is missing

### Interfaces updated
- Two editions: hosted (safeblueprint.pages.dev) and self-hosted (localhost or your own infrastructure)
- About page and FAQ updated for both editions and the open-source project
- Step-by-step guide for creating your own question packs
- Security page links to the verify guide (plain link, no new network calls)
- Phone: compact menu button with section labels and current-page highlight
- Desktop: three accessible dropdowns, one open at a time, Escape closes
- Threat model gate now reports two checks: `threat-model` and `inventory-up-to-date`

### Security fixes
- Threat model check required on every change
- Automated penetration tests (ZAP, Nuclei, Nikto) and browser security tests
- Owner approval required for every live deploy to the hosted site
- Automated fuzz testing of the question-pack loader to catch crashes from unusual or hostile files
- Pull request previews are only built for branches in this repository; forks never get previews or deploy credentials
- Every release and rollback checks the tag is signed, verified by GitHub and on main before deploying
- Release workflow builds the zip twice and refuses to publish if the builds differ; a new check does the same on every pull request
- Smarter threat model check: risk-relevant changes still need maintainer review and now get a draft threat entry
- Review gate compares content before and after each change and flags new network calls, storage, external origins, form fields, CSP, workflow, header and dependency changes
- Editing threat model files no longer bypasses maintainer review
- Staging and previews keep CSP, HSTS, frame and permissions policies

### Privacy
- Removed the third-party form service (FormSubmit); no contact email is shown on the site
- Nothing you enter is captured without your consent
- Plain "What we never collect" list in the README and on the security page
- Privacy proof anyone can run (npm run privacy-proof): a full run, a custom pack run and every export make zero requests to other sites
- Project history cleaned to remove personal contact details from past commits

### General
- Automatic deploy of the hosted site to Cloudflare Pages: staging from main, production from signed release tags
- NOTICE file and a polite request to credit SafeBlueprint when you reuse it
- Pack contribution and review process with contributor credit; every pack is validated automatically
- One-command Docker run and clear offline instructions
- Staging site at staging.safeblueprint.pages.dev: every merge to main goes live on staging first, hidden from search engines
- One-click rollback to an earlier signed release, with maintainer approval
- Release, preview, staging and rollback steps documented in docs/RELEASING.md
- Documented the release supply-chain level (SLSA Build Level 2) and how to verify it
- Published governance (who decides and how), a public roadmap, and a promise to acknowledge security reports within 72 hours with a published-advisories process
- Public signing key published in the repo for tag verification
- Maintainer shown by GitHub handle only in GOVERNANCE.md
- Not legal advice

## [1.0.0] - 2026-10-22
### Features
- APP 1.7 automated-decision readiness inventory and AI security checklist
- Three-part report written for leaders, delivery teams and security architects
- Portfolio view to compare several systems side by side
- Exports to PDF, JSON and Markdown

### Issues fixed
- None

### Interfaces updated
- None (first release)

### Security fixes
- Every change is checked by code, secret, dependency, container and workflow scans before it can merge
- Signed release with software bills of materials (SBOMs) and build provenance

### Privacy
- The assessment runs on your device; your answers are not uploaded or stored by us

### General
- Open source under Apache-2.0, maintained on GitHub
- Self-hosting pack: Docker, docker-compose, nginx and install guide
- Contributing guide with an approval checklist, security policy and issue templates

[Unreleased]: https://github.com/goloviproducts-coder/safeblueprint-community/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/goloviproducts-coder/safeblueprint-community/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/goloviproducts-coder/safeblueprint-community/releases/tag/v1.0.0
