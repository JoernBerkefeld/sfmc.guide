'use strict';

/**
 * Compiled-CSS smoke for the mcdev Pipeline Builder stylesheet split.
 *
 * Asserts `_site/assets/css/main.css` still contains selectors that would vanish
 * if a barrel `@use` were dropped or if `.mpb-wizard-nav--top` were missing.
 *
 * Run after `npm run build --no-workspaces` (this file does not invoke Jekyll).
 * `npm test --no-workspaces` picks this file up via the package test glob.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS_PATH = path.join(__dirname, '..', '_site', 'assets', 'css', 'main.css');

const SMOKE_SELECTORS = [
  '.mpb-parent-band',
  '.mpb-stepper',
  '.mpb-seg-toggle',
  'html.mpb-builder-mode',
  '.mpb-wizard-nav--top',
  '.mpb-callout--security',
];

test('compiled main.css contains pipeline-builder smoke selectors', () => {
  assert.ok(
    fs.existsSync(CSS_PATH),
    `missing ${CSS_PATH} — run npm run build --no-workspaces first`,
  );
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  for (const selector of SMOKE_SELECTORS) {
    assert.ok(css.includes(selector), `expected compiled CSS to contain ${selector}`);
  }
});
