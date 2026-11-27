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
  const debounced = debounce((value) => {
    calls.push(value);
  }, 300);
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
  path.join(__dirname, '..', 'assets', 'js', 'vendor', 'sfmc-sql-converter', '0.4.0', 'index.js'),
).href;

test('the UI imports the converter core only from a versioned vendor folder', () => {
  const source = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'assets', 'js', 'sql-converter-ui.js'),
    'utf8',
  );
  const imports = source
    .matchAll(/\bfrom\s+'([^']+)'/gu)

    .map((match) => match[1])
    .toArray();
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

test('describeCode names the Next outputs by their target', async () => {
  const { describeCode, CODE_KINDS } = await load();
  const cases = {
    'handlebars-query':
      '{{#each (query type="CRM" object="Contact" fields="LastName")}}\n    {{LastName}}\n{{/each}}',
    'handlebars-queryfirst':
      '{{get (queryFirst type="CRM" object="Contact" fields="LastName") "LastName"}}',
    'handlebars-query-mo':
      '{{#each (query type="MO" object="Coupon__mo" CouponCode__c="A")}}\n    {{CouponCode__c}}\n{{/each}}',
    'ampscript-rso':
      '%%[\nSET @rows = RetrieveSalesforceObjects("Contact", "LastName", "LastName", "=", "A")\n]%%',
  };
  for (const [target, code] of Object.entries(cases)) {
    assert.equal(describeCode(code, 'mcn'), CODE_KINDS[target], target);
  }
});

test('CODE_KINDS names every Next target id', async () => {
  const { CODE_KINDS } = await load();
  const nextIds = [
    'handlebars-query',
    'handlebars-queryfirst',
    'handlebars-query-mo',
    'ampscript-rso',
    'ampscript-lookuprows-mo',
    'handlebars-datagraph',
  ];
  for (const id of nextIds) {
    assert.ok(CODE_KINDS[id], id);
  }
  const { MCN_TARGETS } = await import(VENDOR_URL);
  assert.deepEqual(
    MCN_TARGETS.map((target) => target.id).toSorted((a, b) => a.localeCompare(b)),
    nextIds.toSorted((a, b) => a.localeCompare(b)),
    'the vendored core has the same Next targets',
  );
});

/**
 * The convert() options the page builds when an example is loaded.
 *
 * @param {(state: object) => object} buildOptions UI helper
 * @param {string} platform mce | mcn
 * @param {{ sql: string, dataSource?: string }} example example
 * @returns {object} options
 */
function exampleOptions(buildOptions, platform, example) {
  return buildOptions({
    platform,
    direction: 'toCode',
    settings: {
      deName: '',
      deKey: '',
      columns: '',
      dataSource: example.dataSource ?? 'CRM',
    },
  });
}

test('the examples fit the real converter core', async () => {
  const { EXAMPLES, buildOptions, collectMessages, describeCode, UNKNOWN_CODE_KIND } = await load();
  const { convert } = await import(VENDOR_URL);
  const severities = { mce: new Set(), mcn: new Set() };
  for (const platform of ['mce', 'mcn']) {
    const examples = EXAMPLES[platform];
    for (const example of examples) {
      const options = exampleOptions(buildOptions, platform, example);
      const result = convert(example.sql, options);
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
        assert.equal(hasError, /\(error\)$/u.test(example.label), `${example.label}: error label`);
        const usable = result.outputs.filter((output) => typeof output.code === 'string');
        assert.equal(usable.length > 0, !hasError, `${example.label}: Next output`);
        for (const output of usable) {
          const back = convert(output.code, { ...options, direction: 'toSql' });
          assert.ok(back.roundTrip.ok, `${example.label}: ${output.id} converts back`);
        }
      }
    }
  }
  // since 0.3.0 the SSJS outputs keep ORDER BY and TOP, so no Engagement example warns any more
  assert.ok(severities.mce.has('info') && severities.mce.has('error'), 'mce severities');
  assert.ok(severities.mcn.has('error'), 'mcn error example');
});

test('every example has a label and SQL, four per platform', async () => {
  const { EXAMPLES } = await load();
  for (const platform of ['mce', 'mcn']) {
    const examples = EXAMPLES[platform];
    assert.equal(examples.length, 4, platform);
    for (const example of examples) {
      assert.ok(example.label && /^SELECT\b/.test(example.sql), example.label);
    }
  }
});

test('withAllNextTargets lists every Next target, the other data source unavailable', async () => {
  const { withAllNextTargets, buildOptions } = await load();
  const { convert, MCN_TARGETS } = await import(VENDOR_URL);
  const sql = "SELECT Label__c FROM Coupon__mo WHERE Code__c = 'A'";
  for (const dataSource of ['CRM', 'MO', 'DG']) {
    const options = buildOptions({
      platform: 'mcn',
      direction: 'toCode',
      settings: { deName: '', deKey: '', columns: '', dataSource },
    });
    const { outputs } = convert(sql, options);
    const all = withAllNextTargets(outputs);
    assert.deepEqual(
      all.map((output) => output.id),
      MCN_TARGETS.map((target) => target.id),
      `${dataSource}: every Next target, in a fixed order`,
    );
    for (const target of MCN_TARGETS) {
      const output = all.find((item) => item.id === target.id);
      assert.equal(output.label, `${target.label} (${target.dataSource})`, target.id);
      if (target.dataSource === dataSource) {
        const original = outputs.find((item) => item.id === target.id);
        assert.equal(output.code, original.code, `${target.id}: output kept`);
        assert.equal(output.unavailable, original.unavailable, `${target.id}: reason kept`);
      } else {
        assert.equal(typeof output.code, 'undefined', `${target.id}: no code`);
        assert.match(
          output.unavailable,
          new RegExp(`choose ${target.dataSource} as data source`, 'u'),
        );
      }
    }
  }
  assert.deepEqual(withAllNextTargets().length, MCN_TARGETS.length);
});

test('restoreSettings keeps stored settings and falls back on bad values', async () => {
  const { restoreSettings } = await load();
  const defaults = { deName: '', deKey: '', columns: '', dataSource: 'CRM' };
  assert.deepEqual(restoreSettings(null), defaults);
  assert.deepEqual(restoreSettings('broken'), defaults);
  assert.deepEqual(
    restoreSettings({
      deName: 'Orders',
      deKey: 'orders_key',
      columns: 'Id, Email',
      dataSource: 'MO',
    }),
    {
      deName: 'Orders',
      deKey: 'orders_key',
      columns: 'Id, Email',
      dataSource: 'MO',
    },
  );
  assert.deepEqual(restoreSettings({ deName: 42, dataSource: 'DMO', extra: 'x' }), defaults);
  assert.equal(restoreSettings({ dataSource: 'DG' }).dataSource, 'DG');
});

test('restoreSelected keeps a string id per platform and direction only', async () => {
  const { restoreSelected } = await load();
  assert.deepEqual(restoreSelected(null), {});
  assert.deepEqual(restoreSelected('broken'), {});
  assert.deepEqual(
    restoreSelected({
      'mcn:toCode': 'handlebars-queryfirst',
      'mce:toSql': 'sql',
      'mce:toCode': 42,
      'xyz:toCode': 'ssjs-wsproxy',
    }),
    { 'mcn:toCode': 'handlebars-queryfirst', 'mce:toSql': 'sql' },
  );
});

test('encodeShare and decodeShare round-trip the shown view in a URL-safe token', async () => {
  const { encodeShare, decodeShare } = await load();
  const view = {
    platform: 'mcn',
    direction: 'toCode',
    input: "SELECT TOP 5 FirstName\nFROM [Contact]\nWHERE Title LIKE '%Größe ✓%'",
    settings: { deName: '', deKey: '', columns: '', dataSource: 'DG' },
    tab: 'handlebars-queryfirst',
  };
  const token = await encodeShare({ ...view, s: '1b4e28ba-2fa1-11d2-883f-0016d3cca427' });
  assert.match(token, /^z[\w-]+$/u);
  assert.deepEqual(await decodeShare(token), {
    ...view,
    source: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  });
});

test('encodeShare compresses, so long SQL gives a shorter link than plain base64', async () => {
  const { encodeShare } = await load();
  const input = Array.from({ length: 20 }, (_, index) => `  AND Field${index} = 'value'`).join(
    '\n',
  );
  const view = { platform: 'mce', direction: 'toCode', input, settings: {}, tab: null };
  const plain = Buffer.from(JSON.stringify(view)).toString('base64url');
  const token = await encodeShare(view);
  assert.ok(token.length < plain.length / 2);
});

const plainToken = (value) => `j${Buffer.from(JSON.stringify(value)).toString('base64url')}`;

test('decodeShare reads plain tokens and rejects broken ones, falling back per field', async () => {
  const { decodeShare } = await load();
  assert.deepEqual(
    await decodeShare(
      plainToken({
        platform: 'evil',
        direction: 'x',
        input: 'SELECT 1',
        settings: 5,
        tab: 7,
        s: '../x',
      }),
    ),
    {
      platform: 'mce',
      direction: 'toCode',
      input: 'SELECT 1',
      settings: { deName: '', deKey: '', columns: '', dataSource: 'CRM' },
      tab: null,
      source: null,
    },
  );
  assert.equal(await decodeShare(plainToken({ platform: 'mce' })), null);
  assert.equal(await decodeShare('z!!!'), null);
  assert.equal(await decodeShare('zAAAA'), null);
  assert.equal(await decodeShare('qabc'), null);
  assert.equal(await decodeShare(''), null);
});

test('the converter page has the share button, a wrapping input and no second copy button', () => {
  const page = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'tools', 'sql-converter', 'index.md'),
    'utf8',
  );
  assert.match(
    page,
    /id="sqlc-share"[^>]*title="[^"]*co-worker[^"]*bookmark[^"]*"[^>]*>[\s\S]*?Share<\/button>/u,
  );
  assert.doesNotMatch(page, /sqlc-paging/u);
  assert.match(page, /id="sqlc-input"[^>]*wrap="soft"/u);
  assert.doesNotMatch(page, /id="sqlc-copy"/u);
});

test('the converter page has a read-only bar with a Take over button', () => {
  const page = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'tools', 'sql-converter', 'index.md'),
    'utf8',
  );
  assert.match(
    page,
    /id="sqlc-lock"[^>]*hidden[\s\S]*?id="sqlc-take-over"[^>]*>Take over<\/button>/u,
  );
});

test('parseHash tells share links, session ids and anything else apart', async () => {
  const { parseHash } = await load();
  assert.deepEqual(parseHash('#share=zABC'), { kind: 'share', token: 'zABC' });
  assert.deepEqual(parseHash('#s=1b4e28ba-2fa1-11d2'), {
    kind: 'session',
    id: '1b4e28ba-2fa1-11d2',
  });
  assert.deepEqual(parseHash('#s=../../x'), { kind: 'none' });
  assert.deepEqual(parseHash('#s=short'), { kind: 'none' });
  assert.deepEqual(parseHash(''), { kind: 'none' });
  assert.deepEqual(parseHash('#top'), { kind: 'none' });
});

test('newSessionId gives distinct ids that parseHash accepts', async () => {
  const { newSessionId, parseHash } = await load();
  const first = newSessionId();
  assert.notEqual(first, newSessionId());
  assert.equal(parseHash(`#s=${first}`).id, first);
});

test('restoreSession keeps valid fields and falls back for broken ones', async () => {
  const { restoreSession } = await load();
  assert.equal(restoreSession(null), null);
  assert.equal(restoreSession('x'), null);
  assert.deepEqual(
    restoreSession({
      platform: 'mcn',
      inputs: {
        mcn: { direction: 'toSql', input: '{{x}}' },
        mce: { input: 5 },
        xyz: { input: 'a' },
      },
      settings: { dataSource: 'MO' },
      selected: { 'mcn:toSql': 'sql', bad: 'x' },
      updatedAt: 12,
    }),
    {
      platform: 'mcn',
      inputs: { mcn: { direction: 'toSql', input: '{{x}}' } },
      settings: { deName: '', deKey: '', columns: '', dataSource: 'MO' },
      selected: { 'mcn:toSql': 'sql' },
      updatedAt: 12,
    },
  );
  assert.deepEqual(restoreSession({}), {
    platform: 'mce',
    inputs: {},
    settings: { deName: '', deKey: '', columns: '', dataSource: 'CRM' },
    selected: {},
    updatedAt: 0,
  });
});

test('a shared view becomes a session that shows the same view, whatever the output tab', async () => {
  const { sessionFromView, sessionView, isSameView } = await load();
  const view = {
    platform: 'mcn',
    direction: 'toCode',
    input: 'SELECT Email FROM [Lead]',
    settings: { deName: '', deKey: '', columns: '', dataSource: 'CRM' },
    tab: 'handlebars-queryfirst',
    source: null,
  };
  const session = sessionFromView(view);
  assert.deepEqual(session.selected, { 'mcn:toCode': 'handlebars-queryfirst' });
  assert.ok(isSameView(sessionView(session), view));
  assert.ok(isSameView(sessionView(session), { ...view, tab: 'other' }));
  assert.ok(!isSameView(sessionView(session), { ...view, input: 'SELECT Phone FROM [Lead]' }));
  assert.ok(!isSameView(sessionView(session), { ...view, platform: 'mce' }));
  assert.ok(!isSameView(sessionView(session), { ...view, settings: { dataSource: 'MO' } }));
  assert.deepEqual(sessionView({ ...session, platform: 'mce' }).input, '');
});

test('isLockedByOther: only a fresh lease of another tab counts', async () => {
  const { isLockedByOther, LOCK_STALE_MS } = await load();
  const now = 1_000_000;
  assert.ok(isLockedByOther({ tabId: 'other', ts: now - 1000 }, 'me', now));
  assert.ok(!isLockedByOther({ tabId: 'me', ts: now }, 'me', now));
  assert.ok(!isLockedByOther({ tabId: 'other', ts: now - LOCK_STALE_MS - 1 }, 'me', now));
  assert.ok(!isLockedByOther(null, 'me', now));
  assert.ok(!isLockedByOther({ tabId: 5, ts: now }, 'me', now));
  assert.ok(!isLockedByOther({ tabId: 'other' }, 'me', now));
});

test('sessionsToPrune drops the oldest beyond the limit but never an open one', async () => {
  const { sessionsToPrune } = await load();
  const sessions = [
    { id: 'a', updatedAt: 1 },
    { id: 'b', updatedAt: 5 },
    { id: 'c', updatedAt: 3 },
    { id: 'd', updatedAt: 4 },
  ];
  assert.deepEqual(sessionsToPrune(sessions, 2, new Set()), ['c', 'a']);
  assert.deepEqual(sessionsToPrune(sessions, 2, new Set(['a'])), ['c']);
  assert.deepEqual(sessionsToPrune(sessions, 10, new Set()), []);
});

test('legacySession carries over the saved state of earlier versions', async () => {
  const { legacySession } = await load();
  const old = {
    platform: 'mcn',
    mce: { direction: 'toCode', input: 'SELECT 1' },
    mcn: { direction: 'toSql', input: '{{x}}' },
    settings: { deKey: 'K' },
    selected: { 'mce:toCode': 'ssjs-wsproxy' },
  };
  assert.deepEqual(
    legacySession((key) => old[key] ?? null),
    {
      platform: 'mcn',
      inputs: { mce: old.mce, mcn: old.mcn },
      settings: { deName: '', deKey: 'K', columns: '', dataSource: 'CRM' },
      selected: { 'mce:toCode': 'ssjs-wsproxy' },
      updatedAt: 0,
    },
  );
  assert.equal(
    legacySession(() => null),
    null,
  );
});
