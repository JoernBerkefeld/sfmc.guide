/**
 * Strips a UTF-8 byte-order mark from the commit message file.
 *
 * PowerShell's `Set-Content -Encoding UTF8` writes a BOM, so a message authored that
 * way and passed to `git commit -F` lands an invisible U+FEFF at the start of the
 * commit subject. Git keeps it verbatim, which breaks conventional-commit tooling,
 * changelog generation and plain `git log` greps for the `chore:` / `feat:` prefix.
 *
 * The pre-commit hook only inspects staged files, so it cannot catch this — hence a
 * separate commit-msg hook. Stripping is lossless, so it is fixed silently rather
 * than rejecting the commit.
 *
 * Invoked by .husky/commit-msg with the message file path as the only argument:
 *   node scripts/strip-commit-msg-bom.mjs .git/COMMIT_EDITMSG
 */
import fs from 'node:fs';

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const target = process.argv[2];

if (!target) {
  console.error('[COMMIT-MSG] ❌ No commit message file was passed to the hook.');
  process.exit(1);
}

let buf;
try {
  buf = fs.readFileSync(target);
} catch (ex) {
  console.error(`[COMMIT-MSG] ❌ Could not read the commit message file: ${ex.message}`);
  process.exit(1);
}

if (buf.length < 3 || !buf.subarray(0, 3).equals(BOM)) process.exit(0);

try {
  fs.writeFileSync(target, buf.subarray(3));
} catch (ex) {
  console.error(`[COMMIT-MSG] ❌ Commit message starts with a UTF-8 BOM and could not be fixed:`);
  console.error(`[COMMIT-MSG]    ${ex.message}`);
  console.error('[COMMIT-MSG]    Re-save the message file as UTF-8 without BOM and commit again.');
  process.exit(1);
}

console.log('[COMMIT-MSG] 🧹 stripped a UTF-8 BOM from the commit message.');
