#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

bash "$ROOT_DIR/scripts/build.sh" >/dev/null

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

(
  cd "$ROOT_DIR/build/firefox"
  zip -qr "$DIST_DIR/abrantes-checker-firefox.zip" .
)

(
  cd "$ROOT_DIR/build/chrome"
  zip -qr "$DIST_DIR/abrantes-checker-chrome.zip" .
)

echo "Packaged:"
echo "  $DIST_DIR/abrantes-checker-firefox.zip"
echo "  $DIST_DIR/abrantes-checker-chrome.zip"

