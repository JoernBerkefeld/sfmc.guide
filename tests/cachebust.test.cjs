'use strict';

// The cache-busting token of main.css must change when only a Sass partial changes:
// the service worker serves the cached copy of an unchanged URL first, so a token that
// hashed main.scss alone kept serving stale styles after partial-only edits.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..');

/**
 * Lists all files below a directory, sorted like Ruby's Array#sort on full paths.
 * @param {string} dir directory
 * @returns {string[]} absolute file paths
 */
function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Recomputes the token the cache_bust filter gives /assets/css/main.css.
 * @param {(file: string) => Buffer} read file reader (lets a test change one partial)
 * @returns {string} token
 */
function mainCssToken(read) {
  const toPosix = (p) => p.split(path.sep).join('/');
  const source = toPosix(SITE);
  const entry = toPosix(path.join(SITE, 'assets/css/main.scss'));
  const partials = listFiles(path.join(SITE, '_sass')).map(toPosix).sort();
  const md5 = crypto.createHash('md5');
  for (const file of [entry, ...partials]) {
    md5.update(file.slice(source.length));
    md5.update(read(file));
  }
  return md5.digest('hex').slice(0, 10);
}

test('cachebust plugin hashes the Sass partials together with main.scss', () => {
  const plugin = fs.readFileSync(path.join(SITE, '_plugins/cachebust.rb'), 'utf8');
  assert.match(plugin, /def sass_token/);
  assert.match(plugin, /Dir\.glob\(File\.join\(sass_dir, '\*\*', '\*'\)\)/);
});

test('a change in a partial alone changes the token', () => {
  const real = (f) => fs.readFileSync(f);
  const changed = (f) =>
    f.endsWith('_crud-status.scss') ? Buffer.concat([real(f), Buffer.from('\n')]) : real(f);
  assert.notEqual(mainCssToken(real), mainCssToken(changed));
});

test(
  'rendered pages reference main.css with the partial-aware token',
  { skip: !fs.existsSync(path.join(SITE, '_site/index.html')) },
  () => {
    const html = fs.readFileSync(path.join(SITE, '_site/index.html'), 'utf8');
    const token = /main\.css\?v=([0-9a-f]{10})/.exec(html)?.[1];
    assert.equal(
      token,
      mainCssToken((f) => fs.readFileSync(f)),
    );
  },
);
