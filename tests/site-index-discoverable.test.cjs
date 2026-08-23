'use strict';

/**
 * Skip predicates for discoverable / sitemap hiding on sfmc.guide.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  shouldIndexPage,
  shouldListOnToolsIndex,
  navPathFromUrl,
  isNavUrlDiscoverable,
} = require('../scripts/lib/discoverable.cjs');

const SITE = path.join(__dirname, '..');

test('shouldIndexPage omits discoverable: false even when titled', () => {
  assert.equal(
    shouldIndexPage({
      title: 'Hidden draft',
      discoverable: 'false',
      permalink: '/drafts/hidden/',
    }),
    false,
  );
  assert.equal(
    shouldIndexPage({
      title: 'Hidden draft',
      discoverable: false,
    }),
    false,
  );
});

test('shouldIndexPage still omits sitemap: false', () => {
  assert.equal(
    shouldIndexPage({
      title: 'Privacy',
      sitemap: 'false',
      permalink: '/privacy/',
    }),
    false,
  );
});

test('shouldIndexPage includes a normal titled page', () => {
  assert.equal(
    shouldIndexPage({
      title: 'SFMC DevTools (mcdev)',
      permalink: '/tools/mcdev/',
    }),
    true,
  );
});

test('shouldIndexPage omits untitled pages', () => {
  assert.equal(shouldIndexPage({ permalink: '/no-title/' }), false);
  assert.equal(shouldIndexPage({}), false);
  assert.equal(shouldIndexPage(null), false);
});

test('privacy.md (sitemap: false) is omitted from the search index', () => {
  const raw = fs.readFileSync(path.join(SITE, 'privacy.md'), 'utf8');
  assert.match(raw, /^sitemap: false\s*$/m);
  assert.equal(shouldIndexPage({ title: 'Privacy & Cookie Policy', sitemap: 'false' }), false);
});

test('shouldListOnToolsIndex skips discoverable: false and keeps listed tools', () => {
  assert.equal(shouldListOnToolsIndex({ slug: 'hidden', discoverable: false }), false);
  assert.equal(shouldListOnToolsIndex({ slug: 'hidden', discoverable: 'false' }), false);
  assert.equal(shouldListOnToolsIndex({ slug: 'mcdev' }), true);
  assert.equal(
    shouldListOnToolsIndex({ slug: 'mcdev-pipeline-builder', discoverable: false }),
    false,
  );
  assert.equal(shouldListOnToolsIndex(null), false);
});

test('nav helper strips hash and hides only mapped paths', () => {
  assert.equal(navPathFromUrl('/tools/#own-tools'), '/tools/');
  assert.equal(isNavUrlDiscoverable('/drafts/hidden/', { '/drafts/hidden/': true }), false);
  assert.equal(isNavUrlDiscoverable('/tools/mcdev-pipeline-builder/', {}), true);
  assert.equal(isNavUrlDiscoverable('https://diagramforce.com/', { '/x/': true }), true);
  assert.equal(isNavUrlDiscoverable('/tools/mcdev-pipeline-builder/', null), true);
});

test('pipeline builder page is undiscoverable and omitted from nav and Lunr', () => {
  const page = fs.readFileSync(
    path.join(SITE, 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  assert.match(page, /^discoverable:\s*false\s*$/m);
  assert.doesNotMatch(page, /^robots:/m);
  assert.doesNotMatch(page, /^sitemap:/m);
  assert.doesNotMatch(page, /^published:/m);
  assert.doesNotMatch(page, /^status:/m);
  assert.equal(
    shouldIndexPage({
      title: 'SFMC DevTools Pipeline Builder',
      permalink: '/tools/mcdev-pipeline-builder/',
      discoverable: false,
    }),
    false,
  );
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  assert.doesNotMatch(nav, /\/tools\/mcdev-pipeline-builder\//);
  const lunr = fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8');
  assert.doesNotMatch(lunr, /\/tools\/mcdev-pipeline-builder\//);
});

test('tools index omits the pipeline builder card', () => {
  const index = fs.readFileSync(path.join(SITE, 'tools', 'index.md'), 'utf8');
  assert.doesNotMatch(index, /href="\/tools\/mcdev-pipeline-builder\/"/);
  assert.doesNotMatch(index, /SFMC DevTools Pipeline Builder/);
});

test('sidebar and plugin honor the undiscoverable lookup', () => {
  const sidebar = fs.readFileSync(path.join(SITE, '_includes', 'sidebar.html'), 'utf8');
  assert.match(sidebar, /site\.data\.undiscoverable_urls/);
  const plugin = fs.readFileSync(path.join(SITE, '_plugins', 'discoverable.rb'), 'utf8');
  assert.match(plugin, /item\.data\['sitemap'\] = false/);
  assert.match(plugin, /:post_read/);
});
