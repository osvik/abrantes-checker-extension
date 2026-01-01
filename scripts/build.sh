#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"

copy_common_files() {
  local out_dir="$1"
  mkdir -p "$out_dir"
  mkdir -p "$out_dir/popup"

  cp "$ROOT_DIR/background.js" "$out_dir/background.js"
  cp "$ROOT_DIR/content-script.js" "$out_dir/content-script.js"
  cp "$ROOT_DIR/popup/popup.html" "$out_dir/popup/popup.html"
  cp "$ROOT_DIR/popup/popup.css" "$out_dir/popup/popup.css"
  cp "$ROOT_DIR/popup/popup.js" "$out_dir/popup/popup.js"
}

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/firefox" "$BUILD_DIR/chrome"

# Firefox (MV2) build
copy_common_files "$BUILD_DIR/firefox"
cp "$ROOT_DIR/manifest.json" "$BUILD_DIR/firefox/manifest.json"

# Chrome (MV3) build
copy_common_files "$BUILD_DIR/chrome"
cp "$ROOT_DIR/manifest.chrome.json" "$BUILD_DIR/chrome/manifest.json"

echo "Built:"
echo "  $BUILD_DIR/firefox"
echo "  $BUILD_DIR/chrome"

