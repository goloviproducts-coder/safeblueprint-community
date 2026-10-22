#!/usr/bin/env bash
# Used by approve-release.yml after the production approval: SSH-sign an annotated tag at the approved
# commit with the release deploy key, verify it against the committed allowed-signers file, then push
# only that tag over SSH with pinned github.com host keys. The key is written to a private temp file
# and removed on exit. Never prints the key.
# Usage: RELEASE_DEPLOY_KEY=... scripts/create-release-tag.sh vX.Y.Z <sha> <approver> <run-url>
# Optional env: RELEASE_REMOTE (default git@github.com:$GITHUB_REPOSITORY.git), KNOWN_HOSTS, SIGNERS.
set -euo pipefail
TAG="${1:?tag}"; SHA="${2:?sha}"; APPROVER="${3:?approver}"; RUN_URL="${4:?run url}"
KNOWN_HOSTS="${KNOWN_HOSTS:-.github/ssh/github_known_hosts}"
SIGNERS="${SIGNERS:-.github/release-signers}"
REMOTE="${RELEASE_REMOTE:-git@github.com:${GITHUB_REPOSITORY:?}.git}"
fail() { echo "::error title=Release tag not created::$*" >&2; exit 1; }
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "'$TAG' is not a vX.Y.Z tag"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || fail "bad commit sha"
[ -n "${RELEASE_DEPLOY_KEY:-}" ] || fail "RELEASE_DEPLOY_KEY is not set in the production environment (docs/RELEASING.md, one-time setup)"
approver=$(printf '%s' "$APPROVER" | tr -cd 'A-Za-z0-9-')
run_url=$(printf '%s' "$RUN_URL" | tr -cd 'A-Za-z0-9_.:/-')
umask 077
keydir=$(mktemp -d); trap 'rm -rf "$keydir"' EXIT
printf '%s\n' "$RELEASE_DEPLOY_KEY" > "$keydir/key"
git cat-file -e "$SHA^{commit}" 2>/dev/null || fail "$SHA is not in this checkout"
git -c user.name=safeblueprint-release -c user.email=release@safeblueprint.invalid \
  -c gpg.format=ssh -c user.signingkey="$keydir/key" \
  tag -s -a "$TAG" -m "SafeBlueprint $TAG" -m "Approved-By: @$approver" -m "Release-Run: $run_url" "$SHA"
scripts/verify-release-tag.sh "$TAG" "$SHA" "$SIGNERS" >/dev/null
GIT_SSH_COMMAND="ssh -i $keydir/key -o IdentitiesOnly=yes -o UserKnownHostsFile=$(realpath "$KNOWN_HOSTS") -o GlobalKnownHostsFile=/dev/null -o StrictHostKeyChecking=yes" \
  git push "$REMOTE" "refs/tags/$TAG:refs/tags/$TAG" \
  || fail "Could not push $TAG. Check the deploy key has write access and the v* tag ruleset lets Deploy keys bypass (docs/RELEASING.md)."
echo "Pushed signed $TAG at $SHA (approved by @$approver)"
