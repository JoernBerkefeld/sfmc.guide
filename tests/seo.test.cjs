'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..');
const FUNCTIONS = 'engagement/ampscript/functions';
const SAMPLES = ['lookup', 'lookuprows', 'concat', 'redirectto'];
const read = (file) => fs.readFileSync(path.join(SITE, file), 'utf8').replaceAll('\r\n', '\n');
const pages = fs
  .readdirSync(path.join(SITE, FUNCTIONS))
  .filter((file) => file.endsWith('.md') && file !== 'index.md');
const frontmatter = (raw) => {
  const block = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  assert.ok(block, `Closed LF frontmatter: ${JSON.stringify(raw.slice(0, 100))}`);
  return Object.fromEntries(
    [...block.matchAll(/^(\w+):[ \t]*(.*)$/gm)].map((match) => [
      match[1],
      match[2].replaceAll(/^"|"$/g, ''),
    ]),
  );
};

test('source: SEO plugin alone owns title, description and canonical metadata', () => {
  const head = read('_includes/head.html');
  assert.equal([...head.matchAll(/\{%\s*seo\s*%\}/g)].length, 1);
  assert.doesNotMatch(
    head,
    /<title\b|<meta\b[^>]*name=["']description["']|<link\b[^>]*rel=["']canonical["']/i,
  );
  assert.match(head, /page\.discoverable == false/);
  assert.match(head, /unless page\.robots/);
  assert.match(head, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(head, /assets\/css\/main\.css/);
  assert.match(read('_config.yml'), /jekyll-seo-tag/);
});

test('source: every individual function has a contextual title and stable catalog identity', () => {
  const catalog = new Map(
    [
      ...read('_data/ampscript_functions.yml').matchAll(
        /^- name: "([^"]+)"\n {2}slug: "([^"]+)"/gm,
      ),
    ].map((match) => [match[2], match[1]]),
  );
  assert.ok(pages.length > 0);
  for (const file of pages) {
    const raw = read(`${FUNCTIONS}/${file}`);
    const fm = frontmatter(raw);
    const slug = file.slice(0, -3);
    const name = catalog.get(slug);
    assert.ok(name, `${file}: catalog identity exists`);
    assert.equal(fm.title, `AMPscript ${name}`, file);
    assert.equal(fm.permalink, `/${FUNCTIONS}/${slug}/`, file);
    assert.equal(fm.parent_url, `/${FUNCTIONS}/`, file);
    assert.equal(fm.verification, 'verified', file);
    assert.ok(fm.syntax.startsWith(`${name}(`), `${file}: signature retains function name`);
    assert.match(raw, /\{% include verification-status\.html %\}/);
    assert.match(raw, /\{% include function-signature\.html %\}/);
  }
});

test('source: representative descriptions identify AMPscript and the function', () => {
  for (const slug of SAMPLES) {
    const fm = frontmatter(read(`${FUNCTIONS}/${slug}.md`));
    assert.ok(fm.description.includes(fm.title), slug);
    assert.ok(fm.description.length <= 160, `${slug}: concise description`);
  }
});

test('source: SEO contracts receive explicit lint coverage', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  for (const name of ['lint', 'lint:fix']) {
    assert.ok(scripts[name].includes('"tests/seo.test.cjs"'), name);
  }
  assert.match(read('eslint.config.js'), /const TEST_FILES = \[[\s\S]*?'tests\/seo\.test\.cjs'/);
});

const HUB = 'engagement/ampscript';
const ENTRY_PAGES = ['index.md', 'engagement/index.md', `${HUB}/index.md`, `${FUNCTIONS}/index.md`];
const OLD_HEADINGS = [
  'Hide your code',
  'Data Extension lookups',
  'Dynamic trackable links',
  'Other resources',
];

test('source: crawlable entry routes preserve the hub and its original headings', () => {
  assert.match(read('index.md'), /<a href="\/engagement\/ampscript\/"[^>]*class="home-card"/);
  const hub = read(`${HUB}/index.md`);
  assert.equal(frontmatter(hub).permalink, `/${HUB}/`);
  for (const heading of OLD_HEADINGS) {
    assert.ok(hub.includes(`\n## ${heading}\n`), heading);
  }
  assert.ok(hub.includes(`](/${FUNCTIONS}/)`));
  assert.ok(hub.includes('](/next/ampscript/functions/)'));
  assert.ok(hub.indexOf('## A beginner learning path') < hub.indexOf('## Hide your code'));
  const index = read(`${FUNCTIONS}/index.md`);
  assert.ok(index.indexOf('## Start with a task') > 0);
  assert.ok(
    index.indexOf('## Start with a task') <
      index.indexOf('{% include ampscript-function-index.html'),
  );
});

test('source: owned SEO inputs use LF without a BOM', () => {
  for (const file of [
    ...ENTRY_PAGES,
    ...pages.map((file) => `${FUNCTIONS}/${file}`),
    '_includes/head.html',
    'eslint.config.js',
    'package.json',
    'tests/seo.test.cjs',
  ]) {
    const bytes = fs.readFileSync(path.join(SITE, file));
    assert.ok(!bytes.includes(13), `${file}: LF only`);
    assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf', `${file}: no BOM`);
  }
});

test('rendered: entry links and fragments resolve without JavaScript', () => {
  for (const file of ENTRY_PAGES) {
    const url = file === 'index.md' ? '/' : `/${file.slice(0, -8)}`;
    const html = read(`_site${url}index.html`);
    for (const match of read(file).matchAll(/\]\(([/#][^)]*)\)|href="(\/[^"{]*)"/g)) {
      const target = new URL(match[1] || match[2], `https://sfmc.guide${url}`);
      const targetHtml = read(`_site${target.pathname}index.html`);
      assert.ok(
        html.includes(`href="${match[1] || match[2]}"`),
        `${file}: crawlable ${target.href}`,
      );
      if (target.hash) {
        assert.ok(targetHtml.includes(`id="${target.hash.slice(1)}"`), target.href);
      }
    }
  }
});

test('rendered: entry and unrelated pages retain single metadata and sitemap membership', () => {
  const sitemap = read('_site/sitemap.xml');
  for (const url of ['/', '/engagement/', `/${HUB}/`, `/${FUNCTIONS}/`, '/tools/']) {
    const html = read(`_site${url}index.html`);
    assert.equal([...html.matchAll(/<title\b[^>]*>/gi)].length, 1, url);
    assert.equal([...html.matchAll(/<meta\b[^>]*name="description"[^>]*>/gi)].length, 1, url);
    const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)];
    assert.equal(canonical.length, 1, url);
    assert.ok(canonical[0][0].includes(`href="https://sfmc.guide${url}"`), url);
    assert.ok(sitemap.includes(`<loc>https://sfmc.guide${url}</loc>`), url);
    assert.doesNotMatch(html, /name="robots" content="noindex/);
  }
  for (const file of pages) {
    assert.ok(
      sitemap.includes(`<loc>https://sfmc.guide/${FUNCTIONS}/${file.slice(0, -3)}/</loc>`),
      file,
    );
  }
  const hidden = '/engagement/ampscript/differs-from-ampscript-guide/';
  assert.match(
    read(`_site${hidden}index.html`),
    /<meta name="robots" content="noindex, nofollow">/,
  );
  assert.ok(!sitemap.includes(`<loc>https://sfmc.guide${hidden}</loc>`));
  const search = JSON.parse(read('site-index.json'));
  assert.ok(!search.some((entry) => entry.url === hidden));
  for (const file of pages) {
    const fm = frontmatter(read(`${FUNCTIONS}/${file}`));
    const entries = search.filter((entry) => entry.url === fm.permalink);
    assert.equal(entries.length, 1, file);
    assert.equal(entries[0].name, fm.title, file);
    assert.equal(entries[0].description, fm.description, file);
  }
});

// These assertions intentionally require a fresh coordinator-owned Jekyll build.
// Workers can run only source contracts with --test-name-pattern='^source:'.
test('rendered: representative functions have single metadata and unchanged canonical URLs', () => {
  for (const slug of SAMPLES) {
    const fm = frontmatter(read(`${FUNCTIONS}/${slug}.md`));
    const html = read(`_site/${FUNCTIONS}/${slug}/index.html`);
    assert.equal([...html.matchAll(/<title\b[^>]*>/gi)].length, 1, slug);
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    assert.ok(title.startsWith(`${fm.title} | `), `${slug}: contextual document title`);
    assert.equal(title.split('sfmc.guide').length - 1, 1, `${slug}: site suffix once`);
    const descriptions = [...html.matchAll(/<meta\b[^>]*name="description"[^>]*>/gi)];
    assert.equal(descriptions.length, 1, slug);
    assert.ok(descriptions[0][0].includes(`content="${fm.description}"`), slug);
    const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)];
    assert.equal(canonicals.length, 1, slug);
    assert.ok(canonicals[0][0].includes(`href="https://sfmc.guide${fm.permalink}"`), slug);
    assert.equal(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].trim(), fm.title, slug);
    assert.match(html, /Runtime verified/);
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta\b[^>]*property="og:description"/);
  }
});
