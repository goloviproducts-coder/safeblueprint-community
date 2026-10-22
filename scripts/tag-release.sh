#!/usr/bin/env bash
# Maintainer helper: refuses to tag unless origin/main has a prepared release for the version,
# then creates a signed, annotated tag at origin/main. It does not push.
# Usage: scripts/tag-release.sh v1.2.3
set -euo pipefail
TAG="${1:?usage: scripts/tag-release.sh vX.Y.Z}"
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "error: '$TAG' is not vX.Y.Z" >&2; exit 1; }
git fetch -q origin main --tags
sha=$(git rev-parse origin/main)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
for f in CHANGELOG.md VERSION package.json; do git show "$sha:$f" > "$tmp/$f"; done
(cd "$tmp" && node "$OLDPWD/scripts/check-release.js" "$TAG")
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && { echo "error: $TAG already exists" >&2; exit 1; }
git tag -s -a "$TAG" -m "SafeBlueprint $TAG" "$sha"
echo "Signed $TAG at $sha. Push with: git push origin $TAG"
