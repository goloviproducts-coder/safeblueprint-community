# Security testing notes

These notes back the **Security** page claims with evidence in this repo.

- **Runs on your device.** `test/security/no-egress.spec.js` loads every page, runs the APP 1.7 inventory and the AI security checklist end to end, and triggers every export. The test fails on any request to another origin or any Content Security Policy violation.
- **Untrusted question packs.** `test/security/malicious-packs.spec.js` loads packs full of `<script>`, `onerror`, `<svg onload>`, `javascript:` URLs and spreadsheet formulas, plus oversized, deeply nested, malformed and prototype-pollution JSON. Nothing executes; text shows as text; HTML exports are escaped; CSV cells starting with `= + - @` are prefixed with `'`; bad files get a clear error.
- **Scanners.** Nuclei (PRs), ZAP baseline (PRs), ZAP full active scan (weekly and releases), Nikto against the self-host container. Results land in the job summary and, for SARIF tools, in GitHub code scanning.
- **Scope.** The self-host edition has no server-side code. The hosted edition's contact function is covered by unit tests (origin allow-list, Resend only, 503 when unconfigured).
- **Report a problem** privately: https://github.com/goloviproducts-coder/safeblueprint-community/security/advisories/new

General guidance only, not legal advice.
