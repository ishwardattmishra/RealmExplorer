/**
 * Open VSX namespace must match `publisher` in the packaged manifest.
 * VS Marketplace uses `IshwarDattMishra` in package.json; this script
 * rewrites only publisher for the ovsx publish step (CI or local).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const openVsxPublisher = process.env.OPEN_VSX_PUBLISHER || 'ishwardattmishra';
pkg.publisher = openVsxPublisher;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`package.json publisher set to "${openVsxPublisher}" for Open VSX publish.`);
