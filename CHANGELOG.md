# Changelog

All notable changes to this project are documented here. Each release uses six plain-English headings: Features, Issues fixed, Interfaces updated, Security fixes, Privacy, General (see docs/RELEASE_NOTES_TEMPLATE.md). The release workflow publishes the matching section as the GitHub release notes. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Features
- Custom question packs: load your own questions from CSV or JSON, with weights and control mappings
- HTML export for custom question pack reports

### Issues fixed
- Removed a penalty figure from the guidance (we do not quote penalty amounts)
- Fixed the automated security scans so every scan runs on every change

### Interfaces updated
- Two editions: hosted (safeblueprint.pages.dev) and self-hosted (localhost or your own infrastructure)
- About page and FAQ updated for both editions and the open-source project
- Step-by-step guide for creating your own question packs

### Security fixes
- Threat model check required on every change
- Automated penetration tests (ZAP, Nuclei, Nikto) and browser security tests
- Owner approval required for every live deploy to the hosted site

### Privacy
- Removed the third-party form service (FormSubmit); no contact email is shown on the site
- Nothing you enter is captured without your consent

### General
- Automatic deploy of the hosted site from the main branch to Cloudflare Pages
- NOTICE file and a polite request to credit SafeBlueprint when you reuse it

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
