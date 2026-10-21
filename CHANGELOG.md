# Changelog

All notable changes to this project are documented here. Each release uses six plain-English headings: Features, Issues fixed, Interfaces updated, Security fixes, Privacy, General (see docs/RELEASE_NOTES_TEMPLATE.md). The release workflow publishes the matching section as the GitHub release notes. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Features
- _None yet_

### Issues fixed
- _None yet_

### Interfaces updated
- _None yet_

### Security fixes
- _None yet_

### Privacy
- _None yet_

### General
- _None yet_

## [1.0.0] - 2026-10-22
### Features
- APP 1.7 automated-decision readiness inventory and AI security checklist
- Three-part report written for leaders, delivery teams and security architects
- Portfolio view to compare several systems side by side
- Custom question packs: load your own questions from CSV or JSON, with weights and control mappings
- Exports to PDF, JSON, Markdown and HTML

### Issues fixed
- Removed a penalty figure from the guidance (we do not quote penalty amounts)
- Fixed the automated security scans so every scan runs on every change

### Interfaces updated
- Two editions: hosted (safeblueprint.pages.dev) and self-hosted (localhost or your own infrastructure)
- About page and FAQ updated for both editions and the open-source project
- Step-by-step guide for creating your own question packs

### Security fixes
- Every change is checked by code, secret, dependency and container scans before it can merge
- Automated penetration tests (ZAP, Nuclei, Nikto) and browser security tests
- Threat model check required on every change
- Signed commits, protected main branch and owner approval for every live deploy
- Signed release with software bills of materials (SBOMs) and build provenance

### Privacy
- Answers stay on your device and are never uploaded
- Removed the third-party form service (FormSubmit); no contact email is shown on the site
- Nothing you enter is captured without your consent

### General
- Open source under Apache-2.0, maintained on GitHub
- NOTICE file and a polite request to credit SafeBlueprint when you reuse it
- Contributing guide, security policy and issue templates
- Self-hosting pack: Docker, docker-compose, nginx and install guide

[Unreleased]: https://github.com/goloviproducts-coder/safeblueprint-community/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/goloviproducts-coder/safeblueprint-community/releases/tag/v1.0.0
