# SLSA build level

SafeBlueprint releases meet **[SLSA v1.0 Build Level 2](https://slsa.dev/spec/v1.0/levels#build-l2)**.

## Why Level 2
| Requirement | How we meet it |
|---|---|
| Build L1: provenance exists | `.github/workflows/release.yml` builds the release zip and SBOMs in GitHub Actions and creates a provenance statement with `actions/attest-build-provenance`. |
| Build L2: hosted build platform | The build runs on a GitHub-hosted runner, not a developer machine. |
| Build L2: signed provenance | The provenance is signed with a short-lived Sigstore certificate tied to this repository's workflow identity (OIDC), and recorded in the public transparency log. |
| SBOM | SPDX and CycloneDX SBOMs are generated and attached to the release; the SPDX SBOM is attested with `actions/attest-sbom`. |

## Why not Level 3 yet
Level 3 needs the build to run in an isolated, reusable workflow so that the release job cannot tamper with its own provenance. Today the build and the attestation run in the same job. Moving the build into a separate reusable workflow is planned and will be done through a reviewed pull request.

## Why we do not use slsa-github-generator
The `slsa-framework/slsa-github-generator` reusable workflows must be referenced by version tag, not by commit SHA, for their provenance to verify. This repository requires every action to be pinned to a full commit SHA, so adding the generator would weaken that rule. GitHub artifact attestations give the same signed SLSA provenance without that exception.

Note: OpenSSF Scorecard's Signed-Releases check only counts signature or provenance files attached to the release itself. Our attestations are stored by GitHub and verified with `gh attestation verify`, so Scorecard may not count them yet.

## Verify it yourself
```bash
gh release download v1.0.0 --repo goloviproducts-coder/safeblueprint-community
gh attestation verify safeblueprint-selfhost-1.0.0.zip --repo goloviproducts-coder/safeblueprint-community \
  --signer-workflow goloviproducts-coder/safeblueprint-community/.github/workflows/release.yml
```
A pass proves the zip was built by this repository's release workflow from the tagged commit.
