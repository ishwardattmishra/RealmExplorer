# Multi-Platform Publishing CI/CD

## Overview

The publish workflow builds and publishes platform-specific VSIXs for:
- **Windows**: win32-x64
- **Linux**: linux-x64  
- **macOS Intel**: darwin-x64
- **macOS Apple Silicon**: darwin-arm64

## How It Works

### 1. Platform-Specific Builds

Each platform runs on its native OS:
```yaml
- os: windows-latest → win32-x64
- os: ubuntu-latest → linux-x64
- os: macos-latest → darwin-x64 & darwin-arm64
```

### 2. Realm Native Module Handling

**Problem:** Realm includes platform-specific native binaries (`.node` files)

**Solution:**
1. `npm ci` installs realm with correct platform binary automatically
2. `.vscodeignore` selectively includes only Node.js files:
   ```
   !node_modules/realm/package.json
   !node_modules/realm/dist/**
   !node_modules/realm/prebuilds/node/**
   ```
3. iOS/Android builds excluded (saves 655MB)

### 3. Verification Steps

Before publishing, workflow verifies:

**Step 1: Check realm binary exists**
```bash
if [ -f "node_modules/realm/prebuilds/node/realm.node" ]; then
  file realm.node  # Shows platform (Mach-O, ELF, PE32, etc.)
fi
```

**Step 2: Preview VSIX contents**
```bash
npx @vscode/vsce ls | grep "realm.node"
# Ensures binary will be packaged
```

### 4. Publishing

**Do not use `--no-dependencies`.** With that flag, vsce sets dependency mode to `none` and only globs the extension root while ignoring `node_modules/**`, so **no** `node_modules` paths (including `realm`) are ever candidates for packaging. Default behavior runs `npm list --production` and collects each production dependency folder; `.vscodeignore` then keeps only the `realm` slices you whitelist.

```bash
vsce publish --target "$TARGET"
ovsx publish --target "$TARGET"
```

## Workflow Steps

```
1. Checkout code
2. Setup Node.js 24
3. npm ci (installs platform-specific realm)
4. ✓ Verify realm binary
5. Lint
6. Tests
7. Build (compile TypeScript + Vite)
8. ✓ Preview package contents
9. Publish to VS Marketplace
10. Publish to Open VSX
```

## Expected Output Per Platform

### Windows (win32-x64)
```
realm.node: PE32+ executable (DLL) x86-64, for MS Windows
Size: ~6MB
```

### Linux (linux-x64)
```
realm.node: ELF 64-bit LSB shared object, x86-64
Size: ~7MB
```

### macOS Intel (darwin-x64)
```
realm.node: Mach-O 64-bit dynamically linked shared library x86_64
Size: ~6MB
```

### macOS ARM (darwin-arm64)
```
realm.node: Mach-O 64-bit dynamically linked shared library arm64
Size: ~6MB
```

## VSIX Size

- **Before optimization**: ~660MB (included iOS/Android)
- **After optimization**: ~4.6MB per platform
- **Savings**: 655MB (99.3% reduction)

## Troubleshooting

### Issue: realm.node not found

**Cause:** npm didn't install realm correctly

**Fix:**
```bash
rm -rf node_modules
npm install
```

### Issue: Wrong platform binary

**Cause:** Build ran on wrong OS for target

**Fix:** Ensure matrix maps correctly:
```yaml
- os: macos-latest  # Must use macOS
  target: darwin-arm64
```

### Issue: VSIX too large

**Cause:** .vscodeignore not excluding iOS/Android

**Verify:**
```bash
npx @vscode/vsce ls | grep -E "android|apple"
# Should return nothing
```

## Secrets Required

### VS Code Marketplace
- `VSCE_PAT`: Personal Access Token
- Publisher: `IshwarDattMishra` (from package.json)

### Open VSX
- `OVSX_PAT`: Personal Access Token  
- `OPEN_VSX_PUBLISHER`: Repository variable (overrides default)

## Local Testing

Test packaging before pushing:

```bash
# Build
npm run compile

# Check realm binary
file node_modules/realm/prebuilds/node/realm.node

# Preview what will be packaged
npx @vscode/vsce ls | grep realm

# Package (don't publish)
npx @vscode/vsce package --target darwin-arm64

# Verify binary in VSIX
unzip -l *.vsix | grep realm.node
```

## Platform Matrix Strategy

Why we build on native OS instead of cross-compilation:

1. **Reliability**: Native builds ensure correct binaries
2. **Testing**: Can run tests on actual platform
3. **Simplicity**: No cross-compilation toolchains needed
4. **npm behavior**: `npm install realm` downloads correct binary automatically

## Changes from Original Workflow

### Added:
1. ✅ Realm binary verification step
2. ✅ Package contents preview
3. ✅ Comments explaining why `--no-dependencies` must **not** be used when shipping `node_modules/realm`
4. ✅ Platform-specific binary checks

### Kept:
- ✅ Multi-platform matrix
- ✅ Default vsce/ovsx dependency detection (`npm list` production tree)
- ✅ Separate Open VSX publisher handling
- ✅ Lint + test before publish

### Result:
Platform-specific VSIXs with correct native binaries, verified before publishing.

## Related Files

- `.vscodeignore` - Controls what's packaged
- `src/services/realm-session.ts` - Fixed import
- `src/services/realm-installer.ts` - Auto-installer (fallback)
- `docs/NATIVE_MODULES.md` - Technical details
- `docs/AUTO_INSTALL.md` - Alternative approach

## References

- [VSCE Platform-Specific Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)
- [Realm JS Native Modules](https://www.mongodb.com/docs/realm/sdk/node/)
- [prebuild-install](https://github.com/prebuild/prebuild-install)
