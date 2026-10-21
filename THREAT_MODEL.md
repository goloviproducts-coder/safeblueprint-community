# Threat model

STRIDE threat model for SafeBlueprint Community Edition. The machine-readable copy is [docs/threat-model/safeblueprint.json](docs/threat-model/safeblueprint.json) (OWASP Threat Dragon v2; open it at https://www.threatdragon.com or in the desktop app). **Keep both in sync.**

## Scope and assumptions
- The app is static HTML/JS. There is no backend, account or database in the self-hosted edition; the contact relay is disabled.
- All answers and question packs stay in the visitor's browser. Nothing is sent unless a future feature asks for explicit consent.
- Out of scope: the visitor's own device security, and how users store or share exported files.

## Trust boundaries
| Boundary | Contains | Crosses it |
|---|---|---|
| Browser | Web app, local file loader, exports | User input, chosen pack files, saved files |
| Self-host server | nginx or another static host | Static files served to browsers |
| CI/CD supply chain | GitHub repo, Actions, releases | Third-party actions, base images, release assets |

## Data flows
```
Visitor --answers/file--> Web app (browser) <--validated pack-- Local file loader
Web app --reports--> Exports (device)
Self-host server --static files (HTTPS)--> Web app
CI/CD --signed release, attestations--> Repository --zip/image--> Self-host server
```

## Threats and mitigations
| ID | Element | STRIDE | Threat | Severity | Mitigation | Controls | Status |
|---|---|---|---|---|---|---|---|
| T01 | SafeBlueprint web app (browser) | Tampering | Script injection via answers or pack text | High | All user and pack text is set with textContent or escaped (esc()); no eval; CSP script-src 'self' with SRI on every script. | OWASP-ASVS-5.3, CWE-79 | Mitigated |
| T02 | SafeBlueprint web app (browser) | Information disclosure | Answers leave the device | High | No analytics or third-party loads; CSP default-src/connect-src 'self'; CI verify job and ZAP baseline check for outbound calls. | APP1.7, APP11, OWASP-LLM02 | Mitigated |
| T03 | SafeBlueprint web app (browser) | Spoofing | Look-alike or modified copy of the tool | Medium | Signed releases, SLSA provenance and SBOM attestations; SHA256SUMS; SRI hashes. | SLSA-L2, ASD-E8-APPCTRL | Mitigated |
| T04 | SafeBlueprint web app (browser) | Denial of service | Very large or deeply nested pack freezes the tab | Low | 1 MB file limit, 500 question limit, 2000 character cell limit; parser is linear with no recursion. | CWE-400 | Mitigated |
| T05 | Local file loader (question packs) | Tampering | Malicious pack content (HTML, formulas, javascript: URLs) | Medium | Pack text only rendered via textContent; links are never created from pack data; strict field validation with row/column errors. | CWE-79, CWE-1236 | Mitigated |
| T06 | Local file loader (question packs) | Repudiation | Unclear which pack produced a report | Low | Report document control shows pack name, version and SHA-256 of the exact file. | ISO42001-7.5 | Mitigated |
| T07 | Local file loader (question packs) | Elevation of privilege | Pack loaded from another origin via config | Medium | Only same-site paths matching a strict pattern are fetched; CSP connect-src 'self'. | CWE-918 | Mitigated |
| T08 | Exports (PDF, HTML, JSON, Markdown, CSV) | Tampering | Formula injection in CSV exports | Medium | formulaSafe() prefixes risky cells with an apostrophe. | CWE-1236 | Mitigated |
| T09 | Exports (PDF, HTML, JSON, Markdown, CSV) | Information disclosure | Saved reports contain sensitive answers | Medium | Classification label on every page; user owns content; files never leave the device unless the user shares them. | APP11, ISO42001-A.7 | Accepted |
| T10 | Exports (PDF, HTML, JSON, Markdown, CSV) | Tampering | Markdown/HTML injection in exported files | Low | Markdown cells escape backslashes and pipes; HTML export serialises DOM built with textContent. | CWE-116 | Mitigated |
| T11 | Self-host server (nginx / static host) | Information disclosure | Missing security headers | Medium | nginx.conf and site/_headers set CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP. | OWASP-ASVS-14.4, ASD-E8-HARDEN | Mitigated |
| T12 | Self-host server (nginx / static host) | Tampering | Modified files on the server | Medium | SHA256SUMS.txt and SRI; verify with sha256sum -c; container runs read-only static content. | ASD-E8-APPCTRL | Mitigated |
| T13 | Self-host server (nginx / static host) | Elevation of privilege | Vulnerable base image | Medium | Image pinned by digest; Dependabot docker updates; Trivy scan on PR. | ASD-E8-PATCH | Mitigated |
| T14 | CI/CD (GitHub Actions) | Tampering | Compromised third-party action | High | All actions pinned to full SHAs; allowed-actions list; SHA pinning required; harden-runner egress audit; zizmor lint; read-only default token. | SLSA-L2, OWASP-CICD-SEC-8 | Mitigated |
| T15 | CI/CD (GitHub Actions) | Elevation of privilege | Untrusted PR code with secrets | High | No pull_request_target; persist-credentials false; fork workflow approval for external contributors; AI review only for same-repo PRs. | OWASP-CICD-SEC-4 | Mitigated |
| T16 | CI/CD (GitHub Actions) | Spoofing | Unverified commits or tags | Medium | Signed commits required on main; tag ruleset restricts v* to admins; provenance attestations. | SLSA-L2 | Mitigated |
| T17 | CI/CD (GitHub Actions) | Repudiation | Security-sensitive change without review | Medium | Threat-model gate (run from the base branch) requires a model update or a maintainer label applied after the latest push; CODEOWNERS; 1 approval and conversation resolution. | ISO42001-8.1 | Mitigated |
| T18 | Source repository | Information disclosure | Secrets committed | Medium | Secret scanning with push protection; Gitleaks full-history scan. | CWE-798 | Mitigated |
| T19 | Contact function (hosted only) | Information disclosure | Contact details sent to a third party or leaked in logs | Medium | Resend only; recipient and key from Pages env (CONTACT_TO, RESEND_API_KEY); 503 when unset; origin allow-list; strict field limits; emails redacted in logs; self-host edition has no function. | APP11, OWASP-ASVS-14.4 | Mitigated |
| T20 | CI/CD deploy | Elevation of privilege | Unreviewed code deployed to production | High | Deploy only from main (PR + required checks); production environment needs maintainer approval; secrets scoped to the environment; pinned wrangler-action; smoke tests after deploy; setup-node package cache disabled in the deploy job to prevent cache poisoning; production contact function accepts only the pages.dev origins (no localhost). | SLSA-L2, OWASP-CICD-SEC-1 | Mitigated |

## Verification
Mitigations above are tested continuously: property-based fuzzing (fast-check, a pinned dev-only dependency that never ships in the site) feeds random and hostile input to the pack loader, scoring and Markdown export; browser security tests (`test/security/`) prove malicious packs cannot run script or break reports, CSP violations fail the build, and full tool runs and exports make zero cross-origin requests. Nuclei and ZAP scan the served site; Nikto and header checks scan the self-host container. See CONTRIBUTING.md, "Penetration tests".

## When to update
Update this file **and** the Threat Dragon JSON when a change touches a security-sensitive area: security headers, nginx/Docker, workflows, schemas, the question loader, export code, the service worker, or browser code that uses network, storage or DOM-injection APIs. The `threat-model-gate` check enforces this (see CONTRIBUTING.md).

## Residual risks
- Exported reports can contain sensitive answers; users control where they go (accepted).
- Solo maintainer: code review relies on the admin bypass until a second maintainer joins.

General guidance only, not legal advice.
