# SafeBlueprint self-hosted edition: install guide

SafeBlueprint is a static website. Everything runs in the user's browser. It has no server code, no database, no analytics and no forms that send data. Answers stay on the user's device.

The contact form is disabled in this edition. The files do not call any outside service. The pages contain plain reference links (regulator and framework sources) that only open when someone clicks them.

**Not legal advice.** SafeBlueprint helps teams prepare. It does not replace advice from your legal or privacy team.

## What's in the pack

- `site/` the website files (serve this folder)
- `Dockerfile`, `docker-compose.yml`, `nginx.conf` for option C
- `VERSION` the release number
- `SHA256SUMS.txt` checksums for every file
- `site/config.json` a placeholder for future custom templates. Not active yet.

## Option A: run it on your laptop

The site must be served from a web address (not opened as a file) so the offline cache works. From the pack folder, run one of:

    npx serve site -l 8080
    python3 -m http.server 8080 --directory site

Then open http://localhost:8080/

## Option B: your own web server

Copy the contents of `site/` to the **root** of a site or host name (for example `https://safeblueprint.intranet.example/`). The pages use root paths, so a subfolder such as `/tools/safeblueprint/` is not supported in this release.

- **nginx:** use `nginx.conf` from the pack as a starting point. Put your SSO proxy (for example oauth2-proxy or your identity-aware proxy) in front if you want sign-in.
- **Amazon S3 + CloudFront:** upload `site/`, set `index.html` as the default object, and add the security headers below with a CloudFront response headers policy.
- **Azure Static Web Apps:** deploy `site/` as the app folder and add the headers in `staticwebapp.config.json` under `globalHeaders`. Use built-in authentication if you need sign-in.
- **Cloudflare Pages or Netlify:** the included `site/_headers` file applies the headers automatically.

Security headers to set (the same as the public site):

    Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' blob:; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; worker-src 'self'; manifest-src 'self'
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Resource-Policy: same-origin
    X-Frame-Options: DENY
    Strict-Transport-Security: max-age=63072000; includeSubDomains   (HTTPS only)

Add `upgrade-insecure-requests` to the CSP when you serve over HTTPS.

## Option C: Docker

    docker compose up -d --build

Then open http://localhost:8080/. The container runs nginx as a non-root user on port 8080, with a read-only file system. Put it behind your TLS and SSO proxy for shared use.

## Check the files have not been changed

From the pack folder:

    sha256sum -c SHA256SUMS.txt          # Linux
    shasum -a 256 -c SHA256SUMS.txt      # macOS

Every line should say `OK`. On Windows, use `Get-FileHash -Algorithm SHA256 <file>` and compare with the list. Each script and stylesheet is also locked with a subresource integrity hash, so a changed file will not load.

## Where data goes

Nowhere. Answers stay in the browser tab and are not saved to local storage, session storage or cookies. Saved reports (PDF, HTML, JSON, Markdown, CSV) go only where the user saves them. The browser keeps an offline copy of the site's own files, never what users type.

## Updates

Each release has a new `VERSION` and `SHA256SUMS.txt`. To update, replace the whole `site/` folder (do not mix files from two releases), check the checksums, and reload. The offline cache clears itself when the new version loads.

## Verify a release

Each GitHub Release ships the zip, SPDX and CycloneDX SBOMs, a `SHA256SUMS` file, and signed build-provenance and SBOM attestations.

```bash
gh release download v1.0.0 --repo goloviproducts-coder/safeblueprint-community
sha256sum -c SHA256SUMS
gh attestation verify safeblueprint-selfhost-1.0.0.zip --repo goloviproducts-coder/safeblueprint-community
```
Both must pass before you deploy. After unzipping, `sha256sum -c SHA256SUMS.txt` inside the folder checks every file.
