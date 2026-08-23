'use strict';

/**
 * Cheap guard: serve:stop exists and is scoped to this site's port.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = 4002;
const SIBLINGS = [4000, 4001];

test('serve:stop exists and mentions only this site port', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['serve:stop'], 'node scripts/serve-stop.mjs');
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'serve-stop.mjs'), 'utf8');
  assert.match(src, new RegExp(`LocalPort \\$\\{PORT\\}|LocalPort ${PORT}`));
  assert.match(src, new RegExp(`const PORT = ${PORT}`));
  for (const other of SIBLINGS) {
    assert.doesNotMatch(src, new RegExp(`LocalPort ${other}`));
    assert.doesNotMatch(src, new RegExp(`const PORT = ${other}`));
  }
});
