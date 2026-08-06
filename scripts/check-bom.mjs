/**
 * Strips UTF-8 byte-order marks from staged text files and re-stages the fixes.
 *
 * A BOM in front of a Jekyll page's opening `---` is invisible in most editors but
 * stops the frontmatter block from being recognised, so the page silently loses its
 * layout/permalink. Stripping a BOM is lossless and never undesirable in this repo,
 * so the fix is applied automatically instead of blocking the commit.
 *
 * Only the staged file list is inspected (fast, and never touches unstaged work), and
 * only extensions on the text allow-list below — a byte-prefix strip on a binary such
 * as a JPEG would corrupt it.
 *
 * Line endings are deliberately left alone: .gitattributes (`* text=auto eol=lf`)
 * already normalises CRLF to LF in the committed blob at `git add` time, so rewriting
 * working-tree files here would add churn without changing what gets committed.
 *
 * Run from the sfmc.guide repo root:
 *   node scripts/check-bom.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Extensions where a leading BOM breaks a parser. Everything else is skipped. */
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.html',
  '.yml',
  '.yaml',
  '.json',
  '.scss',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.txt',
]);

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/**
 * Lists staged files that were added, copied or modified.
 *
 * @returns {string[]} repo-relative paths
 */
function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const candidates = stagedFiles().filter((rel) =>
  TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase()),
);

const fixed = [];
const failed = [];

for (const rel of candidates) {
  // A staged deletion or a path outside the work tree has nothing to inspect.
  if (!fs.existsSync(rel)) continue;

  let buf;
  try {
    buf = fs.readFileSync(rel);
  } catch (ex) {
    failed.push(`${rel} — could not read: ${ex.message}`);
    continue;
  }

  if (buf.length < 3 || !buf.subarray(0, 3).equals(BOM)) continue;

  try {
    fs.writeFileSync(rel, buf.subarray(3));
    execFileSync('git', ['add', '--', rel], { stdio: 'ignore' });
    fixed.push(rel);
  } catch (ex) {
    failed.push(`${rel} — could not fix: ${ex.message}`);
  }
}

if (fixed.length > 0) {
  console.log(`[PRE-COMMIT] 🧹 stripped UTF-8 BOM from ${fixed.length} file(s) and re-staged:`);
  for (const rel of fixed) console.log(`[PRE-COMMIT]    ${rel}`);
}

if (failed.length > 0) {
  console.error('[PRE-COMMIT] ❌ BOM present but could not be removed:');
  for (const line of failed) console.error(`[PRE-COMMIT]    ${line}`);
  console.error('[PRE-COMMIT]    Re-save the file(s) as UTF-8 without BOM, then commit again.');
  process.exit(1);
}

if (fixed.length === 0) {
  console.log(`[PRE-COMMIT] ✅ no BOM found (checked ${candidates.length} staged text file(s)).`);
}
