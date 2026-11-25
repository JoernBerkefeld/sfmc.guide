/**
 * Copies the sfmc-sql-converter ES modules into assets/js/vendor/sfmc-sql-converter/<version>/
 * and points the SQL Converter page's UI import at that folder.
 *
 * Why a version folder: the site's service worker serves cached files first (stale-while-
 * revalidate). A new package version gets new URLs, and rewriting the import changes the UI
 * file, whose cache_bust hash then changes too, so no visit mixes old and new modules.
 *
 * Source: node_modules/sfmc-sql-converter (the published package, the normal case), or
 * `--from <package folder>` to vendor a local checkout before a version is published.
 *
 * Usage: node scripts/sync-sql-converter.mjs [--from ../sfmc-sql-converter]
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromIndex = process.argv.indexOf('--from');
const packageDir =
  fromIndex === -1
    ? path.join(root, 'node_modules', 'sfmc-sql-converter')
    : path.resolve(process.cwd(), process.argv[fromIndex + 1]);
const source = path.join(packageDir, 'src');
const vendorRoot = path.join(root, 'assets', 'js', 'vendor', 'sfmc-sql-converter');
const uiFile = path.join(root, 'assets', 'js', 'sql-converter-ui.js');
const VERSION_FOLDER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/u;

if (!existsSync(path.join(source, 'index.js'))) {
  process.stderr.write(`sfmc-sql-converter not found at ${source}\n`);
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
if (!VERSION_FOLDER.test(version)) {
  process.stderr.write(`Unexpected package version "${version}"\n`);
  process.exit(1);
}

// Remove only what this script owns: loose .js/VERSION files and older version folders.
mkdirSync(vendorRoot, { recursive: true });
for (const entry of readdirSync(vendorRoot, { withFileTypes: true })) {
  const full = path.join(vendorRoot, entry.name);
  if (entry.isFile() && (entry.name.endsWith('.js') || entry.name === 'VERSION')) {
    rmSync(full);
  } else if (entry.isDirectory() && VERSION_FOLDER.test(entry.name) && entry.name !== version) {
    for (const file of readdirSync(full)) {
      rmSync(path.join(full, file));
    }
    rmSync(full, { recursive: false, force: true });
  }
}
const target = path.join(vendorRoot, version);
mkdirSync(target, { recursive: true });
const files = readdirSync(source).filter((name) => name.endsWith('.js'));
for (const name of files) {
  copyFileSync(path.join(source, name), path.join(target, name));
}

// Point the UI at the version folder.
const ui = readFileSync(uiFile, 'utf8');
const updated = ui.replace(
  /from '\.\/vendor\/sfmc-sql-converter\/(?:[\w.-]+\/)?index\.js';/u,
  `from './vendor/sfmc-sql-converter/${version}/index.js';`,
);
if (updated === ui && !ui.includes(`/sfmc-sql-converter/${version}/index.js'`)) {
  process.stderr.write('Could not find the converter import in sql-converter-ui.js\n');
  process.exit(1);
}
writeFileSync(uiFile, updated);
process.stdout.write(
  `Vendored ${files.length} files of sfmc-sql-converter ${version} into ${path.relative(root, target)}\n`,
);
