'use strict';

/**
 * Pure helpers of the SQL Converter page UI (assets/js/sql-converter-ui.js). The module only
 * touches the DOM when `document` exists, so Node can import it directly.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(
  path.join(__dirname, '..', 'assets', 'js', 'sql-converter-ui.js'),
).href;

const load = () => import(MODULE_URL);

test('groupOutputsByLanguage keeps first-seen language and output order', async () => {
  const { groupOutputsByLanguage } = await load();
  const groups = groupOutputsByLanguage([
    { id: 'ssjs-wsproxy', language: 'ssjs', label: 'WSProxy' },
    { id: 'ampscript-lookuprows', language: 'ampscript', label: 'LookupRows' },
    { id: 'ssjs-lookuprows', language: 'ssjs', label: 'LookupRows' },
  ]);
  assert.deepEqual(
    groups.map((group) => [group.label, group.outputs.map((output) => output.id)]),
    [
      ['SSJS', ['ssjs-wsproxy', 'ssjs-lookuprows']],
      ['AMPscript', ['ampscript-lookuprows']],
    ],
  );
  assert.deepEqual(groupOutputsByLanguage(), []);
});

test('pickOutput prefers the wanted output and skips unavailable ones', async () => {
  const { pickOutput } = await load();
  const outputs = [
    { id: 'a', unavailable: 'no' },
    { id: 'b', code: 'x' },
    { id: 'c', code: 'y' },
  ];
  assert.equal(pickOutput(outputs, 'c').id, 'c');
  assert.equal(pickOutput(outputs, 'a').id, 'b');
  assert.equal(pickOutput(outputs, null).id, 'b');
  assert.equal(pickOutput([{ id: 'a', unavailable: 'no' }], 'a'), null);
});

test('lineColumnToOffset and messageRange map 1-based positions to offsets', async () => {
  const { lineColumnToOffset, messageRange } = await load();
  const text = 'SELECT a\nFROM [X]\nORDER BY a';
  assert.equal(lineColumnToOffset(text, 1, 1), 0);
  assert.equal(lineColumnToOffset(text, 2, 6), 14);
  assert.equal(lineColumnToOffset(text, 2, 99), 17, 'clamped to the line end');
  assert.equal(lineColumnToOffset(text, 9, 1), text.length, 'past the last line');
  assert.deepEqual(messageRange(text, { line: 3, column: 1, endLine: 3, endColumn: 9 }), {
    start: 18,
    end: 26,
  });
  assert.deepEqual(messageRange(text, { line: 1, column: 8 }), { start: 7, end: 8 });
});

test('renderRanges escapes text and merges overlapping ranges', async () => {
  const { renderRanges } = await load();
  assert.equal(renderRanges('a<b', []), 'a&lt;b');
  assert.equal(
    renderRanges('abcd', [
      { start: 0, end: 2, className: 'tok-k' },
      { start: 1, end: 4, className: 'sqlc-clause', clauseId: 'c1' },
    ]),
    '<span class="tok-k">a</span><span class="tok-k sqlc-clause" data-clause="c1">b</span><span class="sqlc-clause" data-clause="c1">cd</span>',
  );
  assert.equal(renderRanges('ab', [{ start: 5, end: 9, className: 'x' }]), 'ab');
});

test('tokenize finds keywords, strings and numbers per language', async () => {
  const { tokenize } = await load();
  const sql = "SELECT a FROM [X] WHERE b = 'it''s' AND c >= 5";
  const kinds = tokenize(sql, 'sql').map((range) => [
    sql.slice(range.start, range.end),
    range.className,
  ]);
  assert.deepEqual(kinds, [
    ['SELECT', 'tok-k'],
    ['FROM', 'tok-k'],
    ['WHERE', 'tok-k'],
    ["'it''s'", 'tok-s'],
    ['AND', 'tok-k'],
    ['5', 'tok-n'],
  ]);
  const amp = '%%[ SET @rows = LookupRows("DE", "Key", "1") ]%%';
  assert.ok(
    tokenize(amp, 'ampscript').some(
      (range) => amp.slice(range.start, range.end) === '@rows' && range.className === 'tok-v',
    ),
  );
  assert.deepEqual(tokenize('x', 'unknown'), []);
});

test('buildOptions passes only the settings of the current platform', async () => {
  const { buildOptions, parseColumns } = await load();
  const settings = {
    deName: ' Customers ',
    deKey: '',
    columns: '[Email], Points,',
    dataSource: 'MO',
  };
  assert.deepEqual(parseColumns('[Email], Points,'), ['Email', 'Points']);
  assert.deepEqual(buildOptions({ platform: 'mce', direction: 'toCode', settings }), {
    platform: 'mce',
    direction: 'toCode',
    deName: 'Customers',
    columns: ['Email', 'Points'],
  });
  assert.deepEqual(buildOptions({ platform: 'mcn', direction: 'toSql', settings }), {
    platform: 'mcn',
    direction: 'toSql',
    dataSource: 'MO',
  });
});

test('debounce runs once after the last call and can be cancelled', async (t) => {
  const { debounce } = await load();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const debounced = debounce((value) => calls.push(value), 300);
  debounced(1);
  t.mock.timers.tick(200);
  debounced(2);
  t.mock.timers.tick(299);
  assert.deepEqual(calls, []);
  t.mock.timers.tick(1);
  assert.deepEqual(calls, [2]);
  debounced(3);
  debounced.cancel();
  t.mock.timers.tick(1000);
  assert.deepEqual(calls, [2]);
});

const VENDOR_URL = pathToFileURL(
  path.join(__dirname, '..', 'assets', 'js', 'vendor', 'sfmc-sql-converter', '0.1.0', 'index.js'),
).href;

test('the UI imports the converter core only from a versioned vendor folder', () => {
  const source = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'assets', 'js', 'sql-converter-ui.js'),
    'utf8',
  );
  const imports = [...source.matchAll(/\bfrom\s+'([^']+)'/gu)].map((match) => match[1]);
  assert.ok(imports.length > 0);
  for (const specifier of imports) {
    assert.match(specifier, /^\.\/vendor\/sfmc-sql-converter\/\d+\.\d+\.\d+\//u, specifier);
  }
});

test('collectMessages merges input and output messages without duplicates', async () => {
  const { collectMessages } = await load();
  const info = { severity: 'info', code: 'DE_KEY_ASSUMED', line: 2, column: 6 };
  const warning = { severity: 'warning', code: 'ORDER_BY_DROPPED', line: 4, column: 10 };
  assert.deepEqual(collectMessages({ messages: [info] }, { messages: [warning, { ...info }] }), [
    info,
    warning,
  ]);
  assert.deepEqual(collectMessages({ messages: [info] }, null), [info]);
});

test('clausesFor keeps only the clause map entries of the shown output', async () => {
  const { clausesFor } = await load();
  const result = {
    clauseMap: [
      { outputId: 'a', clauseId: 'w1' },
      { outputId: 'b', clauseId: 'w1' },
    ],
  };
  assert.deepEqual(clausesFor(result, { id: 'b' }), [{ outputId: 'b', clauseId: 'w1' }]);
  assert.deepEqual(clausesFor(result, null), []);
});

test('describeRoundTrip names the dropped clauses and puts the SQL in the tooltip', async () => {
  const { describeRoundTrip } = await load();
  assert.equal(describeRoundTrip(null), null);
  assert.deepEqual(describeRoundTrip({ ok: true, sql: 'SELECT a FROM X' }), {
    ok: true,
    text: '✓ Converts back to the same SQL',
    title: 'SELECT a FROM X',
  });
  const withNote = {
    ok: true,
    sql: 'S',
    note: 'Same query without TOP and ORDER BY, which WSProxy leaves out.',
  };
  assert.equal(
    describeRoundTrip(withNote, ['top', 'order-0']).text,
    '✓ Converts back to the same SQL, without TOP and ORDER BY',
  );
  assert.equal(
    describeRoundTrip(withNote).text,
    '✓ Converts back to the same SQL, without TOP and ORDER BY, which WSProxy leaves out',
  );
  assert.deepEqual(describeRoundTrip({ ok: false, sql: 'SELECT b FROM Y', note: 'x' }), {
    ok: false,
    text: '✗ Doesn’t convert back to the same SQL',
    title: 'SELECT b FROM Y',
  });
});

test('describeCode names the recognised lookup code', async () => {
  const { describeCode, UNKNOWN_CODE_KIND } = await load();
  assert.equal(
    describeCode('var rows = Platform.Function.LookupRows("DE", "A", "b");'),
    'LookupRows (SSJS)',
  );
  assert.equal(
    describeCode('%%[ SET @rows = LookupRows("DE", "A", "b") ]%%'),
    'LookupRows (AMPscript)',
  );
  assert.equal(describeCode('{{#query "x"}}{{/query}}'), 'Handlebars query');
  assert.equal(describeCode('hello ('), UNKNOWN_CODE_KIND);
  assert.equal(describeCode(''), UNKNOWN_CODE_KIND);
});

test('the examples fit the real converter core', async () => {
  const { EXAMPLES, collectMessages, describeCode, UNKNOWN_CODE_KIND } = await load();
  const { convert } = await import(VENDOR_URL);
  const severities = { mce: new Set(), mcn: new Set() };
  for (const platform of ['mce', 'mcn']) {
    for (const example of EXAMPLES[platform]) {
      const result = convert(example.sql, { platform, direction: 'toCode' });
      const wsproxy = result.outputs.find((output) => output.id === 'ssjs-wsproxy');
      for (const message of collectMessages(result, wsproxy)) {
        severities[platform].add(message.severity);
      }
      const hasError = result.messages.some((message) => message.severity === 'error');
      if (platform === 'mce' && !hasError) {
        assert.equal(typeof wsproxy?.code, 'string', `${example.label}: WSProxy output`);
        assert.notEqual(describeCode(wsproxy.code), UNKNOWN_CODE_KIND, example.label);
        const back = convert(wsproxy.code, { platform, direction: 'toSql' });
        assert.ok(back.roundTrip.ok, `${example.label}: converts back`);
      }
      if (platform === 'mcn') {
        // Next targets stay unavailable until their live tests are done.
        assert.ok(
          result.outputs.every((output) => output.unavailable),
          example.label,
        );
      }
    }
  }
  assert.ok(severities.mce.has('warning') && severities.mce.has('error'), 'mce severities');
  assert.ok(severities.mcn.has('error'), 'mcn error example');
});

test('every example has a label and SQL, four per platform', async () => {
  const { EXAMPLES } = await load();
  for (const platform of ['mce', 'mcn']) {
    assert.equal(EXAMPLES[platform].length, 4, platform);
    for (const example of EXAMPLES[platform]) {
      assert.ok(example.label && /^SELECT\b/.test(example.sql), example.label);
    }
  }
});
