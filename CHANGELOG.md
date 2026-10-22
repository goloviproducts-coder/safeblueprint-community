# Changelog

All notable changes to this project are documented here. Each release uses six plain-English headings: Features, Issues fixed, Interfaces updated, Security fixes, Privacy, General (see docs/RELEASE_NOTES_TEMPLATE.md). The release workflow publishes the matching section as the GitHub release notes. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Features
- Custom question packs: load your own questions from CSV or JSON, with weights and control mappings
- HTML export for custom question pack reports
- Community question pack library: health, education and public sector starter packs, plus a template for your own internal control IDs
- Public security dashboard showing the live status of every security check
- Pull request previews: each PR gets its own temporary preview link, posted on the PR and hidden from search engines
- Reproducible release builds: anyone can rebuild the self-host zip from the tagged commit and get an identical file
- "Verify this release" guide (docs/VERIFY.md) with one-command checks for checksums, build provenance, the SBOM and the signed tag
- Threat model inventory generated from the code (pages, data flows, external endpoints, storage, headers, workflow permissions)

### Issues fixed
- Removed a penalty figure from the guidance (we do not quote penalty amounts)
- Fixed the automated security scans so every scan runs on every change
- Cosmetic changes such as menu, styling and copy no longer get stuck at the threat model check

### Interfaces updated
- Two editions: hosted (safeblueprint.pages.dev) and self-hosted (localhost or your own infrastructure)
- About page and FAQ updated for both editions and the open-source project
- Step-by-step guide for creating your own question packs
- Security page links to the verify guide (plain link, no new network calls)

### Security fixes
- Threat model check required on every change
- Automated penetration tests (ZAP, Nuclei, Nikto) and browser security tests
- Owner approval required for every live deploy to the hosted site
- Automated fuzz testing of the question-pack loader to catch crashes from unusual or hostile files
- Pull request previews are only built for branches in this repository; forks never get previews or deploy credentials
- Every release and rollback checks the tag is signed, verified by GitHub and on main before deploying
- Release workflow builds the zip twice and refuses to publish if the builds differ; a new check does the same on every pull request
- Smarter threat model check: risk-relevant changes still need maintainer review and now get a draft threat entry

### Privacy
- Removed the third-party form service (FormSubmit); no contact email is shown on the site
- Nothing you enter is captured without your consent
- Plain "What we never collect" list in the README and on the security page
- Privacy proof anyone can run (npm run privacy-proof): a full run, a custom pack run and every export make zero requests to other sites

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

[Unreleased]: https://github.com/goloviproducts-coder/safeblueprint-community/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/goloviproducts-coder/safeblueprint-community/releases/tag/v1.0.0
