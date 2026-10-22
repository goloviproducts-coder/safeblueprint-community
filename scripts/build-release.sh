#!/usr/bin/env bash
# Deterministic build of the self-host release zip.
# Usage: scripts/build-release.sh <version> [out-dir]
# Same commit + same version => byte-identical zip on any Linux machine with
# git, zip (Info-ZIP) and coreutils. Files come from the git tree (not the
# working copy), mtimes are fixed to SOURCE_DATE_EPOCH (default: commit time),
# entries are sorted, permissions normalised and extra attributes dropped.
set -euo pipefail
VER="${1:?usage: build-release.sh <version> [out-dir]}"
[[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "build-release.sh: version must be X.Y.Z, got '$VER'" >&2; exit 2; }
OUT="$(mkdir -p "${2:-dist}" && cd "${2:-dist}" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-$(git log -1 --format=%ct HEAD)}"
export TZ=UTC LC_ALL=C
NAME="safeblueprint-selfhost-${VER}"
FILES=(site Dockerfile docker-compose.yml nginx.conf INSTALL.md VERSION SHA256SUMS.txt LICENSE NOTICE README.md)
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/$NAME"
git archive --format=tar HEAD -- "${FILES[@]}" | tar -x -C "$WORK/$NAME"
find "$WORK/$NAME" -type d -exec chmod 0755 {} +
find "$WORK/$NAME" -type f -exec chmod 0644 {} +
find "$WORK/$NAME" -exec touch -h -d "@${SOURCE_DATE_EPOCH}" {} +
rm -f "$OUT/${NAME}.zip"
(cd "$WORK" && find "$NAME" -type f -print | sort | zip -q -X -D -@ "$OUT/${NAME}.zip")
echo "NAME=${NAME}"
echo "SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}"
sha256sum "$OUT/${NAME}.zip" | sed "s#$OUT/##"
