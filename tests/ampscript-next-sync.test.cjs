'use strict';
/**
 * Every AMPscript function that Marketing Cloud Next supports has two hand-written pages:
 *   engagement/ampscript/functions/<slug>.md  (Engagement behaviour, front matter `mcn`)
 *   next/ampscript/functions/<slug>.md        (Next behaviour, front matter `engagement`)
 * This test keeps the pair consistent: both exist, their comparison labels agree, and the parts
 * that must be identical (signature, parameters) are identical unless the page says otherwise.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.resolve(__dirname, '..');
const ENG = path.join(SITE, 'engagement/ampscript/functions');
const NEXT = path.join(SITE, 'next/ampscript/functions');

/** Top-level scalar front matter keys and the body of a page. */
function readPage(file) {
    const text = fs.readFileSync(file, 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
    assert.ok(m, `${file}: no front matter`);
    const fm = {};
    for (const line of m[1].split('\n')) {
        const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
        if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
    }
    return { fm, body: m[2], text };
}

/** The Markdown of one `## Heading` section, without the heading. */
function section(body, heading) {
    const m = new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |^\\{% include platform-compare|$(?![\\s\\S]))`, 'm').exec(body);
    return m ? m[1].trim() : null;
}

/** The parameter table rows only (prose around the table may differ per platform). */
function paramRows(body) {
    const s = section(body, 'Parameters');
    return s === null ? null : s.split('\n').filter((l) => l.startsWith('|')).join('\n');
}

const slugsIn = (dir) =>
    fs.existsSync(dir)
        ? fs
              .readdirSync(dir)
              .filter((n) => n.endsWith('.md') && n !== 'index.md')
              .map((n) => n.slice(0, -3))
        : [];

// mcn label on the Engagement page → engagement label on the Next page
const LABEL_PAIR = { same: 'same', differs: 'differs', unsupported: 'differs', untested: 'untested' };
const SIGNATURE_KEYS = ['syntax', 'return_type', 'min_args', 'max_args'];

const engPages = new Map(slugsIn(ENG).map((s) => [s, readPage(path.join(ENG, `${s}.md`))]));
const nextPages = new Map(slugsIn(NEXT).map((s) => [s, readPage(path.join(NEXT, `${s}.md`))]));
const paired = [...engPages].filter(([, p]) => p.fm.mcn).map(([s]) => s);

test('every Next-supported Engagement page has a Next twin, and every Next page an Engagement twin', () => {
    const missingNext = paired.filter((s) => !nextPages.has(s));
    const missingEng = [...nextPages.keys()].filter((s) => !engPages.get(s)?.fm.mcn);
    assert.deepEqual(missingNext, [], 'Engagement pages with `mcn` but no Next page');
    assert.deepEqual(missingEng, [], 'Next pages without an Engagement page carrying `mcn`');
});

// ---- Next "differs from official docs": page flag ⇔ page section ⇔ card in _data/differs_from_docs_next.yml ----
// The cards compare Next probe results with the official docs for Next, never with Engagement.
const HB = path.join(SITE, 'next/handlebars/helpers');
const hbPages = new Map(slugsIn(HB).map((s) => [s, readPage(path.join(HB, `${s}.md`))]));
const cards = fs
    .readFileSync(path.join(SITE, '_data/differs_from_docs_next.yml'), 'utf8')
    .replace(/\r\n/g, '\n')
    .split(/^- name:/m)
    .slice(1)
    .map((row) => ({ url: /^ {2}url: "?([^"\n]+)"?$/m.exec(row)?.[1], anchor: /^ {2}anchor: "?([^"\n]+)"?$/m.exec(row)?.[1] }));
const cardUrls = new Set(cards.map((c) => c.url));
const flagged = [
    ...[...nextPages].filter(([, p]) => p.fm.differs_from_docs === 'true').map(([s, p]) => [`/next/ampscript/functions/${s}/`, p]),
    ...[...hbPages].filter(([, p]) => ['differs-from-docs', 'unsupported'].includes(p.fm.mcn)).map(([s, p]) => [`/next/handlebars/helpers/${s}/`, p]),
];

test('differs-from-docs cards: unique anchors, each pointing at a flagged Next page', () => {
    const anchors = cards.map((c) => c.anchor);
    assert.ok(anchors.every(Boolean), 'every card needs an anchor');
    assert.equal(new Set(anchors).size, anchors.length, 'duplicate card anchors');
    const flaggedUrls = new Set(flagged.map(([u]) => u));
    assert.deepEqual(cards.filter((c) => !flaggedUrls.has(c.url)).map((c) => c.url), [], 'cards whose page is not flagged');
});

for (const [url, page] of flagged) {
    test(`${url}: flagged page has a card and a Differs from official docs section linking to it`, () => {
        assert.ok(cardUrls.has(url), 'no card in differs_from_docs_next.yml');
        assert.match(page.body, /^## Differs from official docs$/m, 'missing section');
        const own = cards.filter((c) => c.url === url).map((c) => c.anchor);
        assert.ok(own.some((a) => page.body.includes(`/next/differs-from-docs/#${a}`)), 'section links none of its cards');
    });
}

test('every Next test-script include has its generated bundle and chapter, and every bundle is used', () => {
    const TS = path.join(SITE, '_data/test_scripts');
    const used = new Set();
    const missing = [];
    for (const [dir, pages] of [['next/ampscript/functions', nextPages], ['next/handlebars/helpers', hbPages]]) {
        for (const [s, p] of pages) {
            for (const m of p.body.matchAll(/include test-script\.html bundle="([^"]+)" chapter="([^"]+)"/g)) {
                used.add(m[1]);
                const f = path.join(TS, `${m[1]}.yml`);
                if (!fs.existsSync(f) || !new RegExp(`^${m[2]}: \\|$`, 'm').test(fs.readFileSync(f, 'utf8'))) missing.push(`${dir}/${s}: ${m[1]}#${m[2]}`);
            }
        }
    }
    assert.deepEqual(missing, [], 'includes without a bundle chapter');
    // badge flag ⇔ the page shows a generated test script; every Next page shows the badge row
    const flagWrong = [];
    for (const [dir, pages] of [['next/ampscript/functions', nextPages], ['next/handlebars/helpers', hbPages]]) {
        for (const [s, p] of pages) {
            const hasScript = /include test-script\.html bundle="next-/.test(p.body);
            if ((p.fm.test_scripts === 'complete') !== hasScript) flagWrong.push(`${dir}/${s}`);
            if (!p.body.includes('{% include verification-status.html %}') || !p.fm.verification) flagWrong.push(`${dir}/${s}: no verification badge row`);
        }
    }
    assert.deepEqual(flagWrong, [], 'test_scripts: complete must match a generated test-script include; verification row required');
    const unused = fs.readdirSync(TS).filter((n) => /^next-/.test(n) && !used.has(n.slice(0, -4)));
    assert.deepEqual(unused, [], 'generated bundles no page includes');
});

test('Handlebars helper pages do not link the helper index in See also (navigation covers it)', () => {
    const bad = [...hbPages].filter(([, p]) => /\]\(\/next\/handlebars\/helpers\/\)/.test(section(p.body, 'See also') ?? '')).map(([s]) => s);
    assert.deepEqual(bad, []);
});

for (const [s, p] of nextPages) {
    if (p.fm.differs_from_docs !== 'true') {
        test(`${s}: unflagged Next page has no Differs from official docs section`, () => {
            assert.doesNotMatch(p.body, /^## Differs from official docs$/m);
        });
    }
}

// Adding a Next page requires its Engagement sibling to link it (and back), whatever the labels say.
for (const slug of nextPages.keys()) {
    test(`${slug}: Engagement sibling exists and links the new Next page`, () => {
        const eng = engPages.get(slug);
        assert.ok(eng, `engagement/ampscript/functions/${slug}.md is missing`);
        assert.ok(
            section(eng.body, 'See also')?.includes(`](/next/ampscript/functions/${slug}/)`),
            `add "- [\`Name\` in Marketing Cloud Next](/next/ampscript/functions/${slug}/)" to the See also of engagement/ampscript/functions/${slug}.md`,
        );
    });
}

// The "Availability & differences" chapter (table + comparison) comes only from platform-compare.html,
// with the table data from _data/ampscript_functions.yml and _data/ampscript_availability.yml.
test('every AMPscript page renders availability through platform-compare.html, never by hand', () => {
    const pages = [...[...engPages].map(([s, p]) => [`engagement/${s}`, p]), ...[...nextPages].map(([s, p]) => [`next/${s}`, p])];
    assert.deepEqual(pages.filter(([, p]) => !p.body.includes('{% include platform-compare.html %}')).map(([s]) => s), [], 'pages without the include');
    assert.deepEqual(pages.filter(([, p]) => /^## Availability/m.test(p.body)).map(([s]) => s), [], 'hand-written Availability sections');
});

test('catalog mcn version exists exactly for the functions with a Next page; availability overrides name real functions', () => {
    const catalog = fs.readFileSync(path.join(SITE, '_data/ampscript_functions.yml'), 'utf8').replace(/\r\n/g, '\n');
    const withMcn = new Set(
        catalog
            .split(/^- name:/m)
            .slice(1)
            .filter((row) => /^ {2}mcn: "[^"]+"$/m.test(row))
            .map((row) => /^ {2}slug: "([^"]+)"$/m.exec(row)[1]),
    );
    assert.deepEqual([...withMcn].filter((s) => !nextPages.has(s)).sort(), [], 'catalog says Next, but no Next page');
    assert.deepEqual([...nextPages.keys()].filter((s) => !withMcn.has(s)).sort(), [], 'Next page, but no catalog mcn version');
    const overrides = fs
        .readFileSync(path.join(SITE, '_data/ampscript_availability.yml'), 'utf8')
        .split('\n')
        .filter((l) => /^[a-z0-9]+:$/.test(l))
        .map((l) => l.slice(0, -1));
    assert.deepEqual(overrides.filter((s) => !engPages.has(s)), [], 'override keys without a function page');
});

for (const slug of paired.filter((s) => nextPages.has(s))) {
    test(`${slug}: Engagement and Next pages agree`, () => {
        const eng = engPages.get(slug);
        const nxt = nextPages.get(slug);
        assert.equal(nxt.fm.permalink, `/next/ampscript/functions/${slug}/`);
        assert.equal(nxt.fm.parent_url, '/next/ampscript/functions/');
        assert.ok(LABEL_PAIR[eng.fm.mcn], `unknown mcn label ${eng.fm.mcn}`);
        assert.equal(nxt.fm.engagement, LABEL_PAIR[eng.fm.mcn], 'comparison labels disagree');
        for (const p of [eng, nxt]) assert.match(p.body, /\{% include platform-compare\.html %\}/);
        // each page links its twin; the Engagement page no longer carries the Next platform badge
        assert.ok(section(eng.body, 'See also')?.includes(`](/next/ampscript/functions/${slug}/)`), 'Engagement See also must link the Next page');
        assert.ok(section(nxt.body, 'See also')?.includes(`](/engagement/ampscript/functions/${slug}/)`), 'Next See also must link the Engagement page');
        assert.doesNotMatch(eng.text, /^platforms:\n(?: {2}- \w+\n)* {2}- next\n/m, 'Engagement twin must not list `next` in platforms');
        assert.doesNotMatch(nxt.body, /\]\(\/next\/ampscript\/functions\/\)/, 'Next page must not link the function index (navigation covers it)');
        // Next pages use only the generated next-* bundles (the badge flag is checked below)
        assert.doesNotMatch(nxt.body, /include test-script\.html bundle="(?!next-)/, 'Next page may only use generated next-* bundles');
        assert.ok(['verified', 'in-progress', 'pending'].includes(nxt.fm.verification), 'Next page needs verification');
        if (eng.fm.mcn === 'untested') assert.notEqual(nxt.fm.verification, 'verified', 'untested in Next cannot be verified');

        const differs = nxt.fm.signature_differs === 'true' || eng.fm.signature_differs === 'true';
        if (differs) {
            assert.notEqual(eng.fm.mcn, 'same', 'signature_differs is only allowed when the platforms differ');
            return;
        }
        for (const k of SIGNATURE_KEYS) assert.equal(nxt.fm[k], eng.fm[k], `front matter ${k} differs`);
        assert.equal(paramRows(nxt.body), paramRows(eng.body), 'Parameters table differs');
    });
}
