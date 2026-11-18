'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const childProcess = require('node:child_process');
const SITE = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(SITE, 'assets/js/operation-tabs.js'), 'utf8');

class Element {
  constructor(document, attributes = {}) {
    this.document = document;
    this.attributes = attributes;
    this.id = attributes.id;
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.classList = {
      add: (name) => {
        this.className = name;
      },
    };
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0];
  }
  querySelectorAll(selector) {
    const key = {
      '[data-tab-list]': 'list',
      '[data-method]': 'method',
      '[data-method-panel]': 'methodPanel',
    }[selector];
    return this.children.flatMap((child) => [
      ...(Object.hasOwn(child.dataset, key) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  contains(target) {
    return this.children.some((child) => child === target || child.contains(target));
  }
  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }
  fire(name, event = {}) {
    this.listeners[name]?.(event);
  }
  focus() {
    this.document.activeElement = this;
  }
  scrollIntoView() {
    this.scrolled = true;
  }
}

function fixture(states = [['available', 'available', 'unknown']], hash = '') {
  const document = { activeElement: undefined };
  const ids = new Map();
  const roots = states.map((group, index) => {
    const root = new Element(document);
    const list = new Element(document);
    list.dataset.list = '';
    list.hidden = true;
    root.children.push(list);
    for (const [position, method] of ['cli', 'api', 'plugin'].entries()) {
      const tab = new Element(document, { id: `g${index}-tab-${method}` });
      tab.dataset.method = method;
      tab.dataset.available = String(group[position] === 'available');
      list.children.push(tab);
      {
        const panel = new Element(document, { id: `g${index}-panel-${method}` });
        panel.dataset.methodPanel = method;
        const prose = new Element(document, { id: `g${index}-${method}-heading` });
        const code = new Element(document);
        code.textContent = 'sf api request rest';
        code.copyButton = { preserved: true };
        panel.children.push(prose, code);
        ids.set(prose.id, prose);
        ids.set(panel.id, panel);
        root.children.push(panel);
      }
    }
    return root;
  });
  document.querySelectorAll = () => roots;
  document.getElementById = (id) => ids.get(id);
  const window = {
    location: { hash },
    listeners: {},
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
  };
  return {
    document,
    window,
    roots,
    ids,
    mount() {
      vm.runInNewContext(source, { document, window, globalThis: window });
    },
  };
}

function tabs(root) {
  return root.querySelectorAll('[data-method]');
}
function panels(root) {
  return root.querySelectorAll('[data-method-panel]');
}

test('no JS leaves labeled server content readable; default CLI and switching preserve complete panel nodes', () => {
  const page = fixture();
  const root = page.roots[0];
  const original = panels(root);
  assert.equal(root.children[0].hidden, true);
  assert.ok(original.every((panel) => !panel.hidden));
  page.mount();
  assert.equal(root.children[0].attributes.role, 'tablist');
  assert.equal(root.children[0].hidden, false);
  assert.equal(tabs(root)[0].attributes['aria-selected'], 'true');
  assert.equal(original[1].hidden, true);
  tabs(root)[1].fire('click');
  assert.equal(original[0].hidden, true);
  assert.equal(original[1].hidden, false);
  assert.equal(panels(root)[1], original[1]);
  assert.equal(original[1].children[1].copyButton.preserved, true);
  assert.equal(tabs(root)[1].attributes['aria-controls'], original[1].id);
  assert.equal(original[1].attributes['aria-labelledby'], tabs(root)[1].id);
  assert.equal(original[1].attributes.role, 'tabpanel');
});

test('groups are independent, every method is selectable and explains itself', () => {
  const page = fixture([
    ['available', 'available', 'unknown'],
    ['blocked', 'available', 'unknown'],
  ]);
  page.mount();
  const [first, second] = page.roots;
  tabs(first)[1].fire('click');
  assert.equal(tabs(second)[1].attributes['aria-selected'], 'true');
  tabs(first)[2].fire('click');
  assert.equal(tabs(first)[2].attributes['aria-selected'], 'true');
  assert.equal(tabs(first)[1].attributes['aria-selected'], 'false');
  tabs(first)[2].fire('keydown', { key: 'Home', preventDefault() {} });
  assert.equal(tabs(first)[0].attributes['aria-selected'], 'true');
  assert.equal(tabs(first)[2].tabIndex, -1);
  assert.equal(tabs(second)[0].attributes['aria-selected'], 'false');
});

test('arrow keys wrap, Home/End focus and select every method', () => {
  const page = fixture();
  page.mount();
  const choices = tabs(page.roots[0]);
  let prevented = 0;
  const press = (tab, key) =>
    tab.fire('keydown', {
      key,
      preventDefault() {
        prevented++;
      },
    });
  press(choices[0], 'ArrowLeft');
  assert.equal(page.document.activeElement, choices[2]);
  press(choices[2], 'ArrowRight');
  assert.equal(page.document.activeElement, choices[0]);
  press(choices[0], 'End');
  assert.equal(page.document.activeElement, choices[2]);
  press(choices[2], 'Home');
  assert.equal(page.document.activeElement, choices[0]);
  press(choices[0], 'Tab');
  assert.equal(prevented, 4);
});

test('all unavailable: every method is selectable, the first one opens and explains itself', () => {
  const page = fixture([['unknown', 'blocked', 'unknown']]);
  page.mount();
  const root = page.roots[0];
  assert.equal(root.children[0].attributes.role, 'tablist');
  assert.equal(tabs(root)[0].attributes['aria-selected'], 'true');
  assert.equal(panels(root).length, 3);
  assert.equal(panels(root).filter((panel) => !panel.hidden).length, 1);
  assert.equal(root.children[0].hidden, false);
});

test('initial and changed fragments reveal hidden content before scrolling without stealing focus', () => {
  const page = fixture(undefined, '#g0-api-heading');
  page.mount();
  assert.equal(panels(page.roots[0])[1].hidden, false);
  assert.equal(page.ids.get('g0-api-heading').scrolled, true);
  assert.equal(page.document.activeElement, undefined);
  page.window.location.hash = '#g0-panel-cli';
  page.window.listeners.hashchange();
  assert.equal(panels(page.roots[0])[0].hidden, false);
  assert.equal(page.ids.get('g0-panel-cli').scrolled, true);
  page.window.location.hash = '#%broken';
  assert.doesNotThrow(() => page.window.listeners.hashchange());
  page.window.location.hash = '#missing';
  assert.doesNotThrow(() => page.window.listeners.hashchange());
});

test('human workflows default to readable output with exactly eight explicit REST envelope exceptions', () => {
  const names = [
    'index',
    'segment-members',
    'segments',
    'calculated-insights',
    'dlo-dmo-mapping',
    'data-model-object',
    'data-lake-object',
    'data-stream-definition',
    'field-source-target-relationship',
    'data-source-object',
    'data-package-kit-object',
    'data-package-kit-definition',
    'data-kit-object-template',
    'identity-resolution',
    'data-graphs',
  ];
  const envelopePaths = [
    "'/services/data/v67.0/ssot/segments/ActiveCustomers'",
    "'/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0'",
    "'/services/data/v67.0/ssot/metadata'",
    "'/services/data/v67.0/ssot/query-sql'",
    "'/services/data/v67.0/ssot/query-sql'",
    "'/services/data/v67.0/ssot/query-sql/QUERY_ID'",
    "'/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=1&rowLimit=1'",
    "'/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=0&rowLimit=1'",
  ];
  for (const name of names) {
    const page = fs.readFileSync(path.join(SITE, `next/data-cloud-devops/${name}.md`), 'utf8');
    const commands = page.split('\n').filter((line) => /^(?:sf |Get-Content .*\| sf )/u.test(line));
    const structured = commands.filter((line) => / --json(?:\s|$)/u.test(line));
    if (name === 'segment-members') {
      assert.deepEqual(
        structured.map((line) => line.split('sf api request rest ')[1].split(' --target-org')[0]),
        envelopePaths,
      );
      assert.match(page, /Deliberate CLI-envelope inspection/);
      assert.match(page, /Optional structured output \(`--json`\) for the SOQL/);
      assert.match(page, /Get-Content .*--body - --json/);
      assert.match(page, /--stream-to-file/);
    } else {
      assert.equal(structured.length, 0, `${name}: no human command forces JSON`);
    }
    const addedIncludes = commands.filter((line) => line.includes('--include'));
    if (name === 'segments' || name === 'calculated-insights' || name === 'identity-resolution') {
      assert.equal(
        addedIncludes.length,
        name === 'identity-resolution' ? 6 : 2,
        `${name}: HTTP status remains visible`,
      );
      assert.match(page, /status and headers/);
    }
    if (name === 'data-graphs' || name === 'identity-resolution') {
      assert.doesNotMatch(page, /mcp\/execute|v6[57]\.0/);
    }
  }
});

test('template renders each body once and plugin support is explicit, unknown by default', () => {
  const include = fs.readFileSync(path.join(SITE, '_includes/operation-tabs.html'), 'utf8');
  assert.equal((include.match(/include\.cli_body \| markdownify/g) || []).length, 1);
  assert.equal((include.match(/include\.api_body \| markdownify/g) || []).length, 1);
  assert.equal((include.match(/include\.plugin_body \| markdownify/g) || []).length, 1);
  assert.match(include, /include\.plugin_state \| default: 'unknown'/);
  assert.match(include, /include\.plugin_state == 'available'/);
  assert.match(include, /include\.plugin_reason/);
  assert.match(include, /state == 'blocked'/);
  assert.match(include, /aria-describedby=/);
  assert.match(include, /operation-tabs__fallback-label/);
  const layout = fs.readFileSync(path.join(SITE, '_layouts/default.html'), 'utf8');
  assert.match(layout, /if page.operation_tabs/);
  assert.equal((layout.match(/operation-tabs\.js/g) || []).length, 1);
});

test('panel inline code wraps without changing fenced code whitespace or scrolling', () => {
  const stylesheet = fs.readFileSync(path.join(SITE, '_sass/_operation-tabs.scss'), 'utf8');
  const panelCodeRules = [...stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) =>
    selector.includes('code'),
  );
  assert.equal(panelCodeRules.length, 1, 'Only inline panel code needs a code-specific rule');
  const [, selector, declarations] = panelCodeRules[0];
  assert.equal(selector.trim(), '[data-method-panel] :not(pre) > code');
  assert.match(declarations, /overflow-wrap:\s*anywhere\s*;/);
  assert.doesNotMatch(declarations, /white-space|overflow-x|word-break/);
  assert.doesNotMatch(stylesheet, /(?:^|[\s,])pre\s*\{/);
});

test('dark reasons have an explicit padded surface with at least 4.5:1 text contrast', () => {
  const stylesheet = fs.readFileSync(path.join(SITE, '_sass/_operation-tabs.scss'), 'utf8');
  const darkStyles = stylesheet.split(/\[data-theme=['"]dark['"]\] \.operation-tabs\s*\{/)[1];
  assert.ok(darkStyles, 'Component has a dark theme rule');
  const reasons = darkStyles.match(/&__reasons\s*\{([^}]+)\}/)?.[1];
  assert.ok(reasons, 'Dark reasons have their own rule');
  const foreground = reasons.match(/(?:^|;)\s*color:\s*(#[\da-f]{6})\s*;/i)?.[1];
  const background = reasons.match(/(?:^|;)\s*background:\s*(#[\da-f]{6})\s*;/i)?.[1];
  assert.ok(foreground, 'Reason text color is explicit');
  assert.ok(background, 'Reason background does not depend on the site theme');
  assert.match(reasons, /padding:\s*\$space-3\s*;/);
  const luminances = [foreground, background].map((hex) => {
    const channels = hex
      .slice(1)
      .match(/../g)
      .map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  });
  const light = Math.max(...luminances);
  const dark = Math.min(...luminances);
  assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, 'WCAG AA normal text contrast');
});

// Plugin grades: partial only where the plugin itself refuses or lacks part of the operation
// (data graphs: root/node identity changes and omitted fields kept on update, delete while
// dependencies are reported). Limits Salesforce imposes and verification breadth do not make an
// operation partial; bare -m data-graph retrieves every graph, so read is yes.
const PLUGIN_GRADES = {
  'data-graphs': { read: 'yes', create: 'yes', update: 'partial', delete: 'yes' },
  'calculated-insights': { read: 'yes', create: 'yes', update: 'yes', delete: 'yes' },
};

for (const name of ['data-graphs', 'calculated-insights']) {
  test(`${name}: all plugin recipes are operation-local and narrowly qualified`, () => {
    const source = fs.readFileSync(path.join(SITE, `next/data-cloud-devops/${name}.md`), 'utf8');
    const captures = [...source.matchAll(/{% capture (\w+)_plugin %}([\s\S]*?){% endcapture %}/g)];
    assert.equal(captures.length, 4);
    const withoutPlugin = source.replaceAll(
      /{% capture \w+_plugin %}[\s\S]*?{% endcapture %}/g,
      '',
    );
    assert.doesNotMatch(withoutPlugin, /^sf data360 /m);
    assert.doesNotMatch(source, /^### Optional sf-plugin-data/m);
    for (const [, operation, body] of captures) {
      assert.match(
        source,
        new RegExp(String.raw`plugin_state="available"[^\n]*plugin_body=${operation}_plugin`),
      );
      assert.match(body, /^sf data360 /m);
      assert.doesNotMatch(body, /^sf data360 .*--json/m);
      const key = operation;
      assert.match(
        source,
        new RegExp(String.raw`${key}: \{[^\n]*plugin: "${PLUGIN_GRADES[name][key]}"`),
      );
    }
    if (name === 'data-graphs') {
      const update = captures.find((capture) => capture[1] === 'update')[2];
      assert.match(update, /Native API68 — existing-target UPDATE/);
      assert.match(
        update,
        /ExampleGraph\.native-dataGraph\.json --api-version 68\.0 --preview --wait-timeout 1800/,
      );
      assert.match(
        update,
        /ExampleGraph\.native-dataGraph\.json --api-version 68\.0 --allow-processing --wait-timeout 1800/,
      );
      assert.match(
        update,
        /ExampleGraph\.native-dataGraph\.json --api-version 68\.0 --wait-timeout 1800/,
      );
      assert.doesNotMatch(update, /API67 facade|ExampleGraph\.dataGraph\.json/);
      assert.match(
        update,
        /Omitting retained\s+fields or branches preserves them rather than removing them/,
      );
      assert.match(update, /both join endpoints, generated bindings/);
      assert.match(update, /`ready`, metadata `Ready`.*`READY` \/ `ACTIVE`/s);
      assert.match(update, /positive integer in seconds, default `1800`/);
      assert.match(update, /at least 20 seconds, subject to the remaining deadline/);
      assert.match(update, /warns upfront on stderr.*seconds to many minutes,\s+up to 30 minutes/s);
      assert.match(update, /clean structured stdout/);
      assert.match(update, /429 or 503 means Salesforce did not process the PUT/);
      assert.match(update, /Timeouts and other uncertain outcomes are not resent/);
      assert.match(update, /one description-only PUT/);
      assert.match(update, /final fresh archive.*zero-write checks, not another PUT/s);
      assert.doesNotMatch(source, /does not enable recursive CREATE/);
      assert.match(source, /Create sends the\s+file as written/);
      assert.doesNotMatch(update, /PUT \/services|Native API68 UPDATE is not implemented/);
      const api = source.split('{% capture update_connect %}')[1].split('{% endcapture %}')[0];
      assert.match(api, /PUT \/services\/data\/v68\.0\/ssot\/data-graphs/);
      assert.match(api, /not a claim of a documented or supported API contract/);
      assert.match(api, /version\s+`"0"` unchanged/);
      assert.match(api, /HTTP 405/);
      for (const operation of ['create', 'update']) {
        const connect = source
          .split(`{% capture ${operation}_connect %}`)[1]
          .split('{% endcapture %}')[0];
        const body = JSON.parse(connect.match(/```json\n([\s\S]*?)\n```/)[1]);
        assert.equal(body.name, 'CustomerGraph');
        assert.equal(body.primaryObjectName, 'UnifiedssotIndividualMkt__dlm');
        const fields = body.sourceObject.fields.map((field) => field.sourceFieldName);
        assert.deepEqual(
          fields,
          operation === 'create'
            ? ['ssot__Id__c', 'ssot__FirstName__c']
            : ['ssot__Id__c', 'ssot__FirstName__c', 'ssot__LastName__c'],
        );
        assert.equal(Object.hasOwn(body, 'dayZeroTransformDevName'), operation === 'update');
        assert.doesNotMatch(connect, /### API 67/);
      }
      assert.match(source, /Exhaustive external\s+consumer exclusion remains unverified/);
      assert.match(source, /stale copy of the graph for about 11 to 12 minutes/);
      assert.match(source, /The DELETE answer decides/);
    }
  });

  test(
    `${name}: rendered plugin panels contain their own commands`,
    { skip: !process.env.OPERATION_TABS_RENDERED },
    () => {
      const html = fs.readFileSync(
        path.join(SITE, `_site/next/data-cloud-devops/${name}/index.html`),
        'utf8',
      );
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(new Set(ids).size, ids.length);
      // Split API tabs: CLI, Metadata API, Connect API and plugin for each of 4 operations.
      assert.equal((html.match(/data-method-panel=/g) || []).length, 16);
      const panels = [
        ...html.matchAll(/<section\b[^>]*data-method-panel="plugin"[^>]*>([\s\S]*?)<\/section>/g),
      ];
      assert.equal(panels.length, 4);
      for (const panel of panels) {
        assert.match(panel[1], /sf data360/);
      }
    },
  );
}

for (const name of ['calculated-insights', 'segment-members']) {
  test(
    `${name}: fresh rendered markup, unique IDs, complete panels and preserved legacy anchors`,
    { skip: !process.env.OPERATION_TABS_RENDERED },
    () => {
      const html = fs.readFileSync(
        path.join(SITE, `_site/next/data-cloud-devops/${name}/index.html`),
        'utf8',
      );
      assert.doesNotMatch(html, /{%|```|{% endcapture/);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(new Set(ids).size, ids.length, 'All rendered IDs unique');
      for (const operation of ['read', 'create', 'update', 'delete']) {
        assert.ok(ids.includes(operation), `Legacy operation anchor ${operation}`);
      }
      const before = childProcess.execFileSync(
        'git',
        ['show', `HEAD:next/data-cloud-devops/${name}.md`],
        { cwd: SITE, encoding: 'utf8' },
      );
      for (const heading of before.matchAll(/^#{3,6} (.+)$/gm)) {
        const slug = heading[1]
          .toLowerCase()
          .replaceAll(/[^\w\s-]/g, '')
          .replaceAll(' ', '-');
        assert.ok(ids.includes(slug), `Legacy method heading ${slug}`);
      }
      assert.equal((html.match(/data-operation-tabs/g) || []).length, 4);
      const pluginButtons = [...html.matchAll(/<button\b[^>]*data-method="plugin"[^>]*>/g)].map(
        (match) => match[0],
      );
      assert.equal(pluginButtons.length, 4);
      for (const [index, button] of pluginButtons.entries()) {
        // segment-members: Read (member export) and Update (segment publish) plugin tabs are available.
        assert.equal(
          /data-available="false"/.test(button),
          name === 'segment-members' && index !== 0 && index !== 2,
        );
      }
      assert.equal((html.match(/operation-tabs\.js/g) || []).length, 1);
      assert.match(html, /language-sh highlighter-rouge/);
      assert.match(html, /sf api request rest/);
      if (name === 'segment-members') {
        assert.ok(ids.includes('segment-members-runtime-data-not-metadata'));
        // B2 sweep: members have no Metadata type, so the CLI tabs are Not supported.
        assert.match(html, /CLI<span class="visually-hidden"> — Not supported<\/span>/);
      }
      assert.equal((html.match(/data-method-panel=/g) || []).length, 16);
    },
  );
}

const METADATA_API_STATES = {
  'calculated-insights': ['ci', 'available', 'MktCalcInsightObjectDef'],
  'data-lake-object': ['dlo', 'available', 'CustomObject'],
  'data-model-object': ['dmo', 'available', 'CustomObject'],
  'data-stream-definition': ['stream-definition', 'available', 'DataStreamDefinition'],
  'dlo-dmo-mapping': ['mapping', 'available', 'ObjectSourceTargetMap'],
  segments: ['segments', 'available', 'MarketSegmentDefinition'],
  'data-graphs': ['graphs', 'blocked', 'DataGraph'],
  'identity-resolution': ['ir', 'blocked', 'IdentityResolution'],
  'field-source-target-relationship': ['relationship', 'available', 'FieldSrcTrgtRelationship'],
};

// Pages whose Metadata API create, update and delete tabs are live-proven at API 68.0
// (createMetadata / updateMetadata / deleteMetadata on a definition-only probe).
const METADATA_API_WRITES_PROVEN = new Set([
  'calculated-insights',
  'segments',
  'field-source-target-relationship',
  'data-lake-object',
  'data-model-object',
  // B3 sweep (2026-11-16): createMetadata / updateMetadata / deleteMetadata on Cli… mappings.
  'dlo-dmo-mapping',
]);

// B3 sweep (2026-11-16): updateMetadata changes a stream's label; create and delete stay blocked.
const METADATA_API_UPDATE_ONLY = new Set(['data-stream-definition']);

for (const [name, [prefix, readState, type]] of Object.entries(METADATA_API_STATES)) {
  test(`${name}: Metadata API read tab matches the API 68 readMetadata evidence`, () => {
    const page = fs.readFileSync(path.join(SITE, `next/data-cloud-devops/${name}.md`), 'utf8');
    const include = page.match(
      new RegExp(String.raw`{% include operation-tabs\.html id="${prefix}-read"[^\n]*%}`),
    )[0];
    assert.match(include, new RegExp(`metadata_state="${readState}"`));
    assert.match(include, /API 68\.0/);
    if (readState === 'available') {
      assert.match(include, /metadata_body=read_metadata/);
      const body = page.split('{% capture read_metadata %}')[1].split('{% endcapture %}')[0];
      assert.match(body, new RegExp(`<met:type>${type}</met:type>`));
      assert.match(body, /\/services\/Soap\/m\/68\.0/);
    } else {
      assert.doesNotMatch(page, /read_metadata/);
      assert.match(include, new RegExp(`listMetadata on ${type}`));
    }
    const writesProven = METADATA_API_WRITES_PROVEN.has(name);
    for (const operation of writesProven ? ['create', 'update', 'delete'] : ['create', 'update']) {
      const write = page.match(
        new RegExp(String.raw`{% include operation-tabs\.html id="${prefix}-${operation}"[^\n]*%}`),
      )[0];
      if (writesProven) {
        assert.match(write, /metadata_state="available"/);
        assert.match(write, /API 68\.0/);
        assert.match(write, new RegExp(`metadata_body=${operation}_metadata`));
        const body = page
          .split(`{% capture ${operation}_metadata %}`)[1]
          .split('{% endcapture %}')[0];
        assert.match(body, new RegExp(`<met:${operation}Metadata>`));
        assert.match(body, new RegExp(type));
      } else if (!(METADATA_API_UPDATE_ONLY.has(name) && operation === 'update')) {
        assert.doesNotMatch(write, /metadata_state="available"/);
      }
    }
  });
}

// B4 sweep (2026-11-16): graph and IR CLI/Metadata API writes were tested on existing Cli… objects.
for (const [name, prefix] of [
  ['data-graphs', 'graphs'],
  ['identity-resolution', 'ir'],
]) {
  test(`${name}: CLI and Metadata API write tabs are graded from live tests, none unknown`, () => {
    const page = fs.readFileSync(path.join(SITE, `next/data-cloud-devops/${name}.md`), 'utf8');
    for (const operation of ['create', 'update', 'delete']) {
      const include = page.match(
        new RegExp(String.raw`{% include operation-tabs\.html id="${prefix}-${operation}"[^\n]*%}`),
      )[0];
      assert.match(include, /cli_state="blocked"/);
      assert.match(include, /metadata_state="blocked"/);
      assert.doesNotMatch(include, /not tried/);
    }
    assert.match(page, /delete: \{[^\n]*cli: "no"/);
    assert.doesNotMatch(page, /cli: "unknown"/);
    assert.match(page, /is standard and cannot be deleted/);
  });
}
