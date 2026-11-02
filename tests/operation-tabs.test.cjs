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
      tab.disabled = group[position] !== 'available';
      list.children.push(tab);
      if (!tab.disabled) {
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

test('groups are independent, API is fallback, disabled clicks and keys cannot select', () => {
  const page = fixture([
    ['available', 'available', 'unknown'],
    ['blocked', 'available', 'unknown'],
  ]);
  page.mount();
  const [first, second] = page.roots;
  tabs(first)[1].fire('click');
  assert.equal(tabs(second)[1].attributes['aria-selected'], 'true');
  tabs(first)[2].fire('click');
  tabs(first)[2].fire('keydown', { key: 'Home' });
  assert.equal(tabs(first)[1].attributes['aria-selected'], 'true');
  assert.equal(tabs(first)[2].tabIndex, -1);
  assert.equal(tabs(second)[0].disabled, true);
});

test('arrow keys wrap, Home/End focus and select only enabled tabs', () => {
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
  assert.equal(page.document.activeElement, choices[1]);
  press(choices[1], 'ArrowRight');
  assert.equal(page.document.activeElement, choices[0]);
  press(choices[0], 'End');
  assert.equal(page.document.activeElement, choices[1]);
  press(choices[1], 'Home');
  assert.equal(page.document.activeElement, choices[0]);
  press(choices[0], 'Tab');
  assert.equal(prevented, 4);
});

test('all disabled has no selected tab, tablist semantics or blank panel', () => {
  const page = fixture([['unknown', 'blocked', 'unknown']]);
  page.mount();
  const root = page.roots[0];
  assert.equal(root.children[0].attributes.role, undefined);
  assert.equal(panels(root).length, 0);
  assert.ok(tabs(root).every((tab) => tab.disabled && !tab.attributes['aria-selected']));
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

for (const name of ['calculated-insights', 'segment-members']) {
  test(`${name}: pilot preserves every original fence, heading anchor and evidence paragraph`, () => {
    const relative = `next/data-cloud-cli/${name}.md`;
    const before = childProcess.execFileSync('git', ['show', `HEAD:${relative}`], {
      cwd: SITE,
      encoding: 'utf8',
    });
    const after = fs.readFileSync(path.join(SITE, relative), 'utf8');
    for (const fence of before.match(/```[\s\S]*?```/g) || []) {
      assert.ok(after.includes(fence), 'Original command/payload/output retained');
    }
    const titleReplacement = {
      'calculated-insights': [
        'title: "Calculated insights | Data Cloud with Salesforce CLI"',
        'title: "Calculated insights"',
      ],
      'segment-members': [
        'title: "Segment members | Data Cloud with Salesforce CLI"',
        'title: "Segment members"',
      ],
    }[name];
    for (const line of before.split('\n').filter((line) => line.trim())) {
      if (name === 'calculated-insights' && /^\*Last updated: .+\*$/u.test(line)) {
        continue;
      }
      const expected = line === titleReplacement[0] ? titleReplacement[1] : line;
      assert.ok(after.split('\n').includes(expected), `Original content retained: ${expected}`);
    }
    if (name === 'calculated-insights') {
      assert.equal((after.match(/^\*Last updated: .+\*$/gmu) || []).length, 1);
    }
    assert.equal((after.match(/include operation-tabs\.html/g) || []).length, 4);
  });

  test(
    `${name}: fresh rendered markup, unique IDs, complete panels and preserved legacy anchors`,
    { skip: !process.env.OPERATION_TABS_RENDERED },
    () => {
      const html = fs.readFileSync(
        path.join(SITE, `_site/next/data-cloud-cli/${name}/index.html`),
        'utf8',
      );
      assert.doesNotMatch(html, /{%|```|{% endcapture/);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(new Set(ids).size, ids.length, 'All rendered IDs unique');
      for (const operation of ['retrieve', 'create', 'update', 'delete']) {
        assert.ok(ids.includes(operation), `Legacy operation anchor ${operation}`);
      }
      const before = childProcess.execFileSync(
        'git',
        ['show', `HEAD:next/data-cloud-cli/${name}.md`],
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
      assert.equal((html.match(/data-method="plugin"[\s\S]*?disabled/g) || []).length, 4);
      assert.equal((html.match(/operation-tabs\.js/g) || []).length, 1);
      assert.match(html, /language-sh highlighter-rouge/);
      assert.match(html, /sf api request rest/);
      if (name === 'segment-members') {
        assert.ok(ids.includes('segment-members-runtime-data-not-metadata'));
        assert.equal((html.match(/data-method-panel=/g) || []).length, 1);
        assert.match(html, /CLI — Blocked/);
      } else {
        assert.equal((html.match(/data-method-panel=/g) || []).length, 8);
      }
    },
  );
}
