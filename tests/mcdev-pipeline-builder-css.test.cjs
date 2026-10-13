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
  '.mpb-mv-value-control',
  '.mpb-mv-mode',
  '.mpb-mv-legend',
  '.mpb-mv-panel',
  '.mpb-mv-panel-backdrop',
  '.mpb-mv-confirmation',
  '.mpb-mv-confirmation-backdrop',
  '.mpb-mv-editor-field',
  '.mpb-mv-editor-actions',
  '.mpb-mv-editor-error',
];

/**
 * Read declarations for an exact emitted production selector.
 *
 * @param {string} css - Compiled stylesheet.
 * @param {string} selector - Exact selector to locate.
 * @returns {string} Matching declarations, including shared selector blocks.
 */
function declarations(css, selector) {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').some((item) => item.trim() === selector))
    .map((match) => match[2]);
  assert.ok(blocks.length, `expected declaration block for ${selector}`);
  return blocks.join('\n');
}

test('compiled market-variable overlays preserve hiding, stacking and responsive layout', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  for (const selector of [
    '.mpb-mv-panel',
    '.mpb-mv-panel-backdrop',
    '.mpb-mv-confirmation',
    '.mpb-mv-confirmation-backdrop',
  ]) {
    assert.match(declarations(css, `${selector}[hidden]`), /display:\s*none/);
  }
  assert.match(declarations(css, '.mpb-mv-panel'), /position:\s*fixed/);
  assert.match(declarations(css, '.mpb-mv-panel'), /overflow-y:\s*auto/);
  assert.match(declarations(css, '.mpb-mv-panel'), /max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(declarations(css, '.mpb-mv-panel'), /width:\s*min\(34rem,\s*100vw - 24px\)/);
  assert.match(declarations(css, '.mpb-mv-confirmation'), /z-index:\s*402/);
  assert.match(declarations(css, '.mpb-mv-confirmation-backdrop'), /z-index:\s*401/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)\s*\{\s*\.mpb-mv-panel\s*\{[^}]*inset:\s*12px/);
  assert.match(
    declarations(css, '.mpb-mv-value-control .mpb-mv-input[readonly]'),
    /cursor:\s*pointer/,
  );
  assert.match(declarations(css, '.mpb-mv-panel input:focus-visible'), /outline:\s*2px solid/);
  assert.match(declarations(css, '.mpb-mv-input[aria-invalid=true]'), /border-color:\s*#b91c1c/);
});

test('compiled mode buttons use action sizing and hidden buttons override inline-flex', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  assert.match(declarations(css, '.mpb-btn'), /display:\s*inline-flex/);
  assert.match(declarations(css, '.mpb-btn[hidden]'), /display:\s*none/);
  assert.ok(css.indexOf('.mpb-btn[hidden]') > css.indexOf('.mpb-btn {'));
  const mode = declarations(css, '.mpb-mv-mode');
  assert.match(mode, /flex:\s*none/);
  assert.doesNotMatch(mode, /padding|min-width|font-family|border|font-weight/);
  assert.match(declarations(css, '.mpb-mv-action-btn'), /padding:\s*0?\.25em 0?\.55em/);
  assert.match(declarations(css, '.mpb-mv-action-btn'), /font-size:\s*0?\.875rem/);
  assert.match(declarations(css, '.mpb-btn--secondary'), /border-color:/);
});

test('compiled market-variable table scrolls all columns on phones and stays sticky on desktop', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const narrowBlocks = [
    ...css.matchAll(/@media\s*\(max-width:\s*640px\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g),
  ];
  assert.ok(narrowBlocks.length, 'expected the existing 640px responsive breakpoint');
  const narrowCss = narrowBlocks.map((match) => match[1]).join('\n');
  const desktopCss = narrowBlocks.reduce((result, match) => result.replace(match[0], ''), css);
  for (const cell of ['col-name', 'col-actions', 'name-cell', 'actions-cell']) {
    const selector = `.mpb-mv-table .mpb-mv-${cell}`;
    assert.match(declarations(narrowCss, selector), /position:\s*static/);
    assert.match(declarations(desktopCss, selector), /position:\s*sticky/);
    assert.ok(
      narrowBlocks.some(
        (match) => match[1].includes(selector) && match.index > css.indexOf('position: sticky'),
      ),
      `expected narrow override after desktop sticky declarations for ${selector}`,
    );
  }
  assert.match(declarations(css, '.mpb-mv-scroll'), /overflow-x:\s*auto/);
});

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
