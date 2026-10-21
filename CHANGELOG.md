# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Customisable question packs: load your own CSV or JSON questions on the AI security checklist page. Files are read on your device and never uploaded.
- `site/questions/default.csv` / `default.json`: the built-in APP 1.7 inventory (12 questions) and AI security checklist (14 questions), with weights, severities and control mappings. Built-in tool behaviour is unchanged.
- Pack schema `site/schema/questions/v1.json`, template `site/questions/template.csv`, example `examples/acme-pack.csv`.
- Pack reports show the pack name, version and SHA-256 in document control, with JSON, Markdown and HTML exports.
- `config.json` `questionPack` lets self-hosters preload their own pack.
- `docs/CUSTOMISING.md` guide for non-developers.
- `npm test` (node:test) and a `tests` CI workflow; `scripts/update-hashes.js` refreshes SRI and SHA256SUMS.

### General
- Documented the release supply-chain level (SLSA Build Level 2) and how to verify it

## [1.0.0] - 2026-10-22
### Added
- First community release: APP 1.7 automated-decision readiness inventory, AI security checklist, three-part report (leaders, delivery team, security architects), portfolio view, PDF/JSON/Markdown exports.
- Self-hosting pack: Dockerfile, docker-compose, nginx config, INSTALL guide, SHA256SUMS.
- Signed release with SBOMs (SPDX, CycloneDX) and build provenance attestations.

[Unreleased]: https://github.com/goloviproducts-coder/safeblueprint-community/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/goloviproducts-coder/safeblueprint-community/releases/tag/v1.0.0
