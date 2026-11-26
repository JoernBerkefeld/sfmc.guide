'use strict';

// Structure of the code persistence matrix: every result list has one entry per snippet and only
// known values, and the page is reachable. It does not pin individual results.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.resolve(__dirname, '..');
const DATA = fs.readFileSync(path.join(SITE, '_data', 'code_persistence.yml'), 'utf8');
const ALLOWED = new Set(['kept', 'escaped', 'changed', 'removed', 'rejected', 'open']);

const snippetIds = [...DATA.matchAll(/^ {2}- id: (\S+)$/gm)].map((m) => m[1]);
const resultLists = [...DATA.matchAll(/^\s+(api|results): \[([^\]]*)\]$/gm)].map((m) => ({
  key: m[1],
  values: m[2].split(',').map((v) => v.trim()),
}));

test('code persistence data: snippet ids are unique', () => {
  assert.ok(snippetIds.length > 0);
  assert.equal(new Set(snippetIds).size, snippetIds.length);
});

test('code persistence data: every result list has one known value per snippet', () => {
  assert.ok(resultLists.length > 0);
  for (const list of resultLists) {
    assert.equal(list.values.length, snippetIds.length, `${list.key}: ${list.values.join(', ')}`);
    for (const v of list.values) assert.ok(ALLOWED.has(v), `unknown result "${v}"`);
  }
});

test('code persistence data: every type has an API list and at least one editor', () => {
  const types = DATA.split(/^ {6}- name: /m).slice(1);
  assert.ok(types.length > 0);
  for (const t of types) {
    const name = t.split('\n')[0];
    assert.match(t, /^ {8}api: \[/m, `${name}: api`);
    assert.match(t, /^ {10}- editor: /m, `${name}: ui editor`);
  }
});

test('code persistence page: chip include covers every allowed result and the page is linked', () => {
  const chip = fs.readFileSync(path.join(SITE, '_includes', 'code-persistence-chip.html'), 'utf8');
  for (const v of ALLOWED) if (v !== 'open') assert.ok(chip.includes(`"${v}"`), v);
  const page = fs.readFileSync(
    path.join(SITE, 'engagement', 'code-persistence', 'index.md'),
    'utf8',
  );
  assert.match(page, /^permalink: \/engagement\/code-persistence\/$/m);
  assert.ok(page.includes('site.data.code_persistence'));
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  assert.ok(nav.includes('url: /engagement/code-persistence/'));
  const hub = fs.readFileSync(path.join(SITE, 'engagement', 'index.md'), 'utf8');
  assert.ok(hub.includes('(/engagement/code-persistence/)'));
});
