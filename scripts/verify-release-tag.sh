#!/usr/bin/env bash
# Verify a tag made by the approve-release workflow, using git only (the tag must be fetched locally):
# annotated, tagged by the neutral release identity, at the expected commit, and SSH-signed by a key
# in the committed allowed-signers file. Prints the tag's commit on success.
# Usage: scripts/verify-release-tag.sh vX.Y.Z [expected-commit-sha] [allowed-signers-file]
set -euo pipefail
TAG="${1:?usage: verify-release-tag.sh vX.Y.Z [sha] [signers]}"
WANT="${2:-}"
SIGNERS="${3:-.github/release-signers}"
PRINCIPAL="release@safeblueprint.invalid"
fail() { echo "::error title=Release tag not trusted::$*" >&2; exit 1; }
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "'$TAG' is not a vX.Y.Z tag"
grep -qE "^${PRINCIPAL//./\\.} +namespaces=\"git\" +ssh-" "$SIGNERS" 2>/dev/null || fail "$SIGNERS has no release key yet (docs/RELEASING.md, one-time setup)"
[ "$(git cat-file -t "refs/tags/$TAG" 2>/dev/null)" = "tag" ] || fail "$TAG is not an annotated tag"
commit=$(git rev-parse "refs/tags/$TAG^{commit}")
[ -z "$WANT" ] || [ "$commit" = "$WANT" ] || fail "$TAG points at $commit, not the approved commit $WANT"
tagger=$(git for-each-ref --format='%(taggername) %(taggeremail)' "refs/tags/$TAG")
[ "$tagger" = "safeblueprint-release <$PRINCIPAL>" ] || fail "$TAG was not tagged by the release identity"
out=$(git -c gpg.format=ssh -c gpg.ssh.allowedSignersFile="$SIGNERS" verify-tag "$TAG" 2>&1) || fail "$TAG signature does not match $SIGNERS"
grep -q "Good \"git\" signature for $PRINCIPAL" <<<"$out" || fail "$TAG is not signed by the release key"
echo "$commit"
