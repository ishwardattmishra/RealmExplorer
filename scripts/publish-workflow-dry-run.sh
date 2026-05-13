#!/usr/bin/env bash
# Mirrors .github/workflows/publish.yml up to the packaging check, then builds a VSIX locally.
# Does not call vsce publish / ovsx (no tokens). Use TARGET to match a matrix row, e.g. linux-x64.
set -euo pipefail

cd "$(dirname "$0")/.."

detect_target() {
  case "$(uname -s)" in
    Darwin)
      if [ "$(uname -m)" = arm64 ]; then echo darwin-arm64; else echo darwin-x64; fi
      ;;
    Linux) echo linux-x64 ;;
    MINGW* | MSYS* | CYGWIN*) echo win32-x64 ;;
    *) echo linux-x64 ;;
  esac
}

TARGET="${1:-${TARGET:-$(detect_target)}}"
OUT_DIR="${OUT_DIR:-./artifacts}"
mkdir -p "$OUT_DIR"

echo "== publish workflow dry-run (target=$TARGET) =="

echo ">> npm ci"
npm ci

echo ">> Verify Realm module"
if [ -f "node_modules/realm/prebuilds/node/realm.node" ]; then
  echo "✓ Realm native binary found"
  file node_modules/realm/prebuilds/node/realm.node || true
  ls -lh node_modules/realm/prebuilds/node/realm.node
else
  echo "✗ Realm native binary not found!"
  exit 1
fi

echo ">> npm run lint"
npm run lint

echo ">> npm run test:all"
npm run test:all

echo ">> npm run compile"
npm run compile

echo ">> Preview package (vsce ls — must list realm; do not use --no-dependencies)"
npx @vscode/vsce ls | grep -E "realm|prebuilds" | head -20 || true
echo ""
if npx @vscode/vsce ls | grep -q "realm\.node"; then
  echo "✓ realm.node will be included in VSIX"
else
  echo "✗ realm.node missing from vsce ls output"
  exit 1
fi

VSIX_NAME="realm-vscode-$(node -p "require('./package.json').version")-${TARGET}.vsix"
echo ">> vsce package --target $TARGET -> $OUT_DIR/$VSIX_NAME"
npx @vscode/vsce package --target "$TARGET" --out "$OUT_DIR/$VSIX_NAME"

echo ""
echo "✓ Dry-run complete: $OUT_DIR/$VSIX_NAME"
if command -v unzip >/dev/null 2>&1; then
  unzip -l "$OUT_DIR/$VSIX_NAME" | grep "realm\.node" || {
    echo "✗ realm.node not inside VSIX"
    exit 1
  }
  echo "✓ realm.node present inside VSIX"
fi
