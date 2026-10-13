'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const SITE = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(SITE, 'assets/js/mcdev-pipeline-regex-demo.js'), 'utf8');
const context = {};
vm.runInNewContext(source, context);
const api = context.mpbRegexDemo;

// Minimal event-capable DOM: no production controller or browser dependency.
class Node {
  constructor(tag, document) {
    this.tag = tag;
    this.ownerDocument = document;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.textContent = '';
    this.style = {};
    this.classList = {
      toggle: (key, enabled) => {
        this.attributes[key] = enabled;
      },
    };
  }
  getAttribute(key) {
    return this.attributes[key];
  }
  contains(node) {
    return this === node || this.children.some((child) => child.contains(node));
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  getBoundingClientRect() {
    return this.tag === 'button' ? { left: 900, bottom: 650 } : { width: 400, height: 300 };
  }
  getClientRects() {
    return this.hidden ? [] : [this.getBoundingClientRect()];
  }
  querySelectorAll() {
    const nodes = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (['input', 'summary', 'button'].includes(child.tag)) {
          nodes.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return nodes;
  }
  append(...children) {
    this.children.push(...children);
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
  addEventListener(key, handler) {
    this.listeners[key] = handler;
  }
  dispatch(key, event = {}) {
    this.listeners[key]?.(event);
  }
}
function fixture(variant) {
  const document = new Node('document');
  document.defaultView = new Node('window');
  document.defaultView.innerWidth = 1024;
  document.defaultView.innerHeight = 768;
  document.defaultView.confirm = () => {
    throw new Error('Native confirmation must not be used');
  };
  document.createElement = (tag) => new Node(tag, document);
  const root = new Node('div', document);
  root.dataset.variant = variant;
  const mounted = api.mount(root);
  const nodes = [];
  function visit(node) {
    nodes.push(node);
    for (const child of node.children) {
      visit(child);
    }
  }
  visit(root);
  return { ...mounted, nodes, document, root };
}

test('fresh fixture has independent cells, mixed modes and capture groups', () => {
  const state = api.createState();
  const fresh = api.createState();
  assert.equal(state.cells.dev.brandName.mode, 'literal');
  assert.equal(state.cells.uat.brandName.mode, 'regex');
  assert.equal(state.cells.prod.brandName.mode, 'literal');
  assert.equal(state.cells.dev.campaignCode.pattern, String.raw`(DEV|UAT|PROD)-(\d{4})`);
  assert.equal(state.cells.dev.brandName.template, '{{{brandName}}}');
  api.setMode(state, 'dev', 'brandName', 'regex');
  api.setField(state, 'dev', 'brandName', 'value', '  Keep spaces  ');
  assert.equal(state.cells.prod.brandName.value, 'Example');
  assert.equal(fresh.cells.dev.brandName.mode, 'literal');
  assert.equal(fresh.cells.dev.brandName.value, 'Example Dev');
});

test('switching modes preserves values, regex settings and suffixes', () => {
  const state = api.createState();
  const before = JSON.stringify(state.suffixes);
  api.setField(state, 'dev', 'brandName', 'pattern', '(Example)');
  api.setField(state, 'dev', 'brandName', 'template', '$1-{{{brandName}}}');
  api.setMode(state, 'dev', 'brandName', 'regex');
  api.setMode(state, 'dev', 'brandName', 'literal');
  assert.equal(state.cells.dev.brandName.value, 'Example Dev');
  assert.equal(state.cells.dev.brandName.pattern, '(Example)');
  assert.equal(state.cells.dev.brandName.template, '$1-{{{brandName}}}');
  assert.equal(JSON.stringify(state.suffixes), before);
});

test('regex validation compiles syntax only', () => {
  assert.equal(api.validatePattern(''), '');
  assert.equal(api.validatePattern('(a+)+$'), '');
  assert.match(api.validatePattern('['), /^Invalid search pattern:/);
  assert.doesNotMatch(source, /\.exec\(|\.test\(|localStorage|mpbController/);
});

test('inline controls update only their cell and keep fields stable while typing', () => {
  const { state, nodes } = fixture('inline');
  const host = nodes.find(
    (node) => node.dataset.market === 'dev' && node.dataset.variable === 'brandName',
  );
  const button = host.children[0].children[1];
  const editor = host.children[1];
  assert.equal(button.textContent, 'aA');
  assert.equal(editor.hidden, true);
  button.dispatch('click');
  assert.equal(button.textContent, '.*');
  assert.equal(editor.hidden, false);
  assert.equal(button.attributes['aria-pressed'], 'true');
  const pattern = nodes.find((node) => node.id === 'regex-demo-dev-brandName-pattern');
  pattern.value = '[';
  pattern.dispatch('input');
  assert.equal(state.cells.dev.brandName.pattern, '[');
  assert.equal(pattern.attributes['aria-invalid'], 'true');
  const error = nodes.find((node) => node.id === 'regex-demo-dev-brandName-error');
  assert.match(error.textContent, /Invalid search pattern/);
  pattern.value = '(Example)';
  pattern.dispatch('input');
  assert.equal(error.textContent, '');
  assert.equal(pattern.attributes['aria-invalid'], 'false');
  button.dispatch('click');
  button.dispatch('click');
  assert.equal(pattern.value, '(Example)');
  assert.equal(state.cells.prod.brandName.mode, 'literal');
  const template = nodes.find((node) => node.id === 'regex-demo-dev-brandName-template');
  assert.equal(template.value, '{{{brandName}}}');
  assert.equal(nodes.find((node) => node.tag === 'details').open, undefined);
});

for (const variant of ['popover', 'panel']) {
  test(variant + ': Apply commits only valid drafts; Cancel and Escape restore state', () => {
    const { state, nodes, document } = fixture(variant);
    const host = nodes.find(
      (node) => node.dataset.market === 'dev' && node.dataset.variable === 'brandName',
    );
    const button = host.children[0].children[1];
    const edit =
      variant === 'panel' ? host.children[0].children[0].children[0] : host.children[0].children[2];
    const editor = nodes.find((node) => node.id === 'regex-demo-dev-brandName-editor');
    const pattern = nodes.find((node) => node.id === 'regex-demo-dev-brandName-pattern');
    const value = nodes.find((node) => node.id === 'regex-demo-dev-brandName-draft-value');
    const template = nodes.find((node) => node.id === 'regex-demo-dev-brandName-template');
    const [apply, cancel] = editor.children.at(-1).children;
    const before = JSON.stringify(state);
    button.dispatch('click');
    assert.equal(editor.hidden, false);
    assert.equal(document.activeElement, pattern);
    assert.match(editor.children[0].textContent, /brandName.*Brand_DEV/);
    pattern.value = '[';
    pattern.dispatch('input');
    assert.equal(apply.disabled, true);
    apply.dispatch('click');
    assert.equal(JSON.stringify(state), before);
    cancel.dispatch('click');
    assert.equal(editor.hidden, true);
    assert.equal(document.activeElement, button);
    button.dispatch('click');
    assert.notEqual(pattern.value, '[');
    pattern.value = '(Example)';
    pattern.dispatch('input');
    value.value = 'Draft brand';
    value.dispatch('input');
    template.value = '$1-{{{brandName}}}';
    template.dispatch('input');
    assert.equal(JSON.stringify(state), before);
    assert.equal(apply.disabled, false);
    apply.dispatch('click');
    assert.equal(state.cells.dev.brandName.mode, 'regex');
    assert.equal(state.cells.dev.brandName.value, 'Draft brand');
    assert.equal(state.cells.dev.brandName.template, '$1-{{{brandName}}}');
    assert.equal(state.cells.prod.brandName.mode, 'literal');
    if (variant === 'popover') {
      assert.equal(edit.hidden, false);
    }
    edit.dispatch('click');
    value.value = 'Discard me';
    value.dispatch('input');
    document.dispatch('keydown', { key: 'Escape', preventDefault() {} });
    assert.equal(state.cells.dev.brandName.value, 'Draft brand');
    assert.equal(document.activeElement, edit);
    button.dispatch('click');
    if (variant === 'panel') {
      const warning = nodes.find((node) => node.id === 'regex-demo-dev-brandName-confirmation');
      warning.children.at(-1).children[1].dispatch('click');
    }
    assert.equal(state.cells.dev.brandName.mode, 'literal');
    if (variant === 'panel') {
      assert.equal(Object.hasOwn(state.cells.dev.brandName, 'pattern'), false);
      assert.equal(Object.hasOwn(state.cells.dev.brandName, 'template'), false);
    } else {
      assert.equal(state.cells.dev.brandName.pattern, '(Example)');
    }
    const suffixRow = nodes.find((node) => node.dataset.var === 'suffix');
    assert.equal(suffixRow.children[2].children[0].className, 'mpb-suffix-input');
  });

  test(
    variant + ': switching cells and outside dismissal discard drafts; narrow fallback traps focus',
    () => {
      const { state, nodes, document, root } = fixture(variant);
      const hosts = nodes.filter((node) => node.dataset.market && node.dataset.variable);
      const first = hosts[0].children[0].children[1];
      const second =
        variant === 'panel'
          ? hosts[1].children[0].children[0].children[0]
          : hosts[1].children[0].children[2];
      const editor = nodes.find((node) => node.id === 'regex-demo-dev-brandName-editor');
      const pattern = nodes.find((node) => node.id === 'regex-demo-dev-brandName-pattern');
      first.dispatch('click');
      pattern.value = 'Unapplied';
      pattern.dispatch('input');
      second.dispatch('click');
      assert.equal(editor.hidden, true);
      assert.equal(state.cells.dev.brandName.mode, 'literal');
      document.dispatch('pointerdown', { target: root });
      first.dispatch('click');
      assert.notEqual(pattern.value, 'Unapplied');
      if (variant === 'popover') {
        assert.equal(editor.style.left, '612px');
        assert.equal(editor.style.top, '456px');
        document.defaultView.innerWidth = 800;
        document.dispatch('scroll');
        assert.equal(editor.style.left, '388px');
      }
      document.defaultView.innerWidth = 390;
      document.defaultView.dispatch('resize');
      assert.equal(editor.attributes['regex-demo-dialog'], true);
      assert.equal(editor.attributes['aria-modal'], 'true');
      assert.equal(editor.style.left, '');
      const controls = editor.querySelectorAll();
      const firstInput = controls[0];
      const lastButton = controls.at(-1);
      lastButton.focus();
      document.dispatch('keydown', { key: 'Tab', preventDefault() {} });
      assert.equal(document.activeElement, firstInput);
      document.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault() {} });
      assert.equal(document.activeElement, lastButton);
      document.dispatch('pointerdown', { target: root });
      assert.equal(editor.hidden, true);
    },
  );
}

for (const openDraft of [false, true]) {
  test(
    'panel visible switch warning preserves settings until explicit action; open draft=' +
      openDraft,
    () => {
      const { state, nodes, document } = fixture('panel');
      const host = nodes.find(
        (node) => node.dataset.market === 'uat' && node.dataset.variable === 'brandName',
      );
      const [label, button] = host.children[0].children;
      const field = label.children[0];
      const editor = nodes.find((node) => node.id === 'regex-demo-uat-brandName-editor');
      const warning = nodes.find((node) => node.id === 'regex-demo-uat-brandName-confirmation');
      const pattern = nodes.find((node) => node.id === 'regex-demo-uat-brandName-pattern');
      const template = nodes.find((node) => node.id === 'regex-demo-uat-brandName-template');
      const value = nodes.find((node) => node.id === 'regex-demo-uat-brandName-draft-value');
      const [cancel, switchText] = warning.children.at(-1).children;
      const before = JSON.stringify(state);
      if (openDraft) {
        field.dispatch('click');
        for (const [input, text] of [
          [pattern, '(Draft)'],
          [template, '$1-custom'],
          [value, 'Unsaved'],
        ]) {
          input.value = text;
          input.dispatch('input');
        }
        template.focus();
      }
      let prevented = false;
      document.dispatch('pointerdown', {
        target: button,
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true);
      button.dispatch('click');
      assert.equal(warning.hidden, false);
      assert.equal(warning.getAttribute('role'), 'alertdialog');
      assert.match(
        warning.children[1].textContent,
        /deletes the search pattern and template replacement/,
      );
      assert.equal(cancel.textContent, 'Cancel');
      assert.equal(switchText.textContent, 'Switch to text');
      assert.equal(document.activeElement, cancel);
      assert.equal(JSON.stringify(state), before);
      document.dispatch('keydown', { key: 'Tab', shiftKey: true, preventDefault() {} });
      assert.equal(document.activeElement, switchText);
      document.dispatch('keydown', { key: 'Tab', preventDefault() {} });
      assert.equal(document.activeElement, cancel);
      cancel.dispatch('click');
      assert.equal(warning.hidden, true);
      assert.equal(editor.hidden, !openDraft);
      assert.equal(JSON.stringify(state), before);
      assert.equal(document.activeElement, openDraft ? template : button);
      assert.equal(button.getAttribute('aria-expanded'), 'false');
      if (openDraft) {
        assert.equal(pattern.value, '(Draft)');
        assert.equal(template.value, '$1-custom');
        assert.equal(value.value, 'Unsaved');
        document.dispatch('pointerdown', { target: field, preventDefault() {} });
        field.dispatch('click');
        field.dispatch('keydown', { key: 'Enter', preventDefault() {} });
        assert.equal(pattern.value, '(Draft)');
        assert.equal(template.value, '$1-custom');
        assert.equal(value.value, 'Unsaved');
      }
      button.dispatch('click');
      document.dispatch('keydown', { key: 'Escape', preventDefault() {} });
      assert.equal(JSON.stringify(state), before);
      assert.equal(editor.hidden, !openDraft);
      button.dispatch('click');
      switchText.dispatch('click');
      assert.equal(editor.hidden, true);
      assert.equal(warning.hidden, true);
      assert.equal(document.activeElement, button);
      assert.equal(state.cells.uat.brandName.mode, 'literal');
      assert.equal(state.cells.uat.brandName.value, 'Example Preview');
      assert.equal(Object.hasOwn(state.cells.uat.brandName, 'pattern'), false);
      assert.equal(Object.hasOwn(state.cells.uat.brandName, 'template'), false);
      assert.equal(field.readOnly, false);
      assert.equal(field.getAttribute('aria-expanded'), 'false');
      switchText.dispatch('click');
      assert.equal(state.cells.uat.brandName.mode, 'literal');
    },
  );
}

test('panel regex fields are focusable read-only triggers; literal values edit directly', () => {
  const { state, nodes, document } = fixture('panel');
  assert.equal(
    nodes.some((node) => node.className?.split(' ').includes('regex-demo-edit')),
    false,
  );
  const field = nodes.find((node) => node.id === 'regex-demo-uat-brandName-value');
  const literal = nodes.find((node) => node.id === 'regex-demo-dev-brandName-value');
  const editor = nodes.find((node) => node.id === 'regex-demo-uat-brandName-editor');
  const pattern = nodes.find((node) => node.id === 'regex-demo-uat-brandName-pattern');
  assert.equal(field.readOnly, true);
  assert.notEqual(field.disabled, true);
  assert.equal(literal.readOnly, false);
  literal.value = 'Direct edit';
  literal.dispatch('input');
  assert.equal(state.cells.dev.brandName.value, 'Direct edit');
  literal.dispatch('click');
  assert.equal(editor.hidden, true);
  for (const key of ['Enter', ' ']) {
    field.focus();
    field.dispatch('keydown', { key, preventDefault() {} });
    assert.equal(document.activeElement, pattern);
    assert.equal(field.getAttribute('aria-expanded'), 'true');
    document.dispatch('keydown', { key: 'Escape', preventDefault() {} });
    assert.equal(document.activeElement, field);
    assert.equal(field.getAttribute('aria-expanded'), 'false');
  }
});

test('panel templates stay visible and default templates are absent from applied cells', () => {
  const { state, nodes } = fixture('panel');
  for (const cells of Object.values(state.cells)) {
    for (const cell of Object.values(cells)) {
      assert.equal(Object.hasOwn(cell, 'template'), false);
    }
  }
  assert.equal(
    nodes.some((node) => node.tag === 'details' || node.tag === 'summary'),
    false,
  );
  const host = nodes.find(
    (node) => node.dataset.market === 'dev' && node.dataset.variable === 'brandName',
  );
  const [valueLabel, button] = host.children[0].children;
  const edit = valueLabel.children[0];
  assert.equal(valueLabel.textContent, '');
  assert.match(valueLabel.children[0].attributes['aria-label'], /Market value for brandName/);
  const editor = nodes.find((node) => node.id === 'regex-demo-dev-brandName-editor');
  assert.equal(editor.children.find((node) => node.tag === 'label').textContent, 'Market value');
  const template = nodes.find((node) => node.id === 'regex-demo-dev-brandName-template');
  const [apply] = editor.children.at(-1).children;
  button.dispatch('click');
  assert.equal(template.value, '{{{brandName}}}');
  const templateContainer = editor.children.find(
    (node) => node.className === 'regex-demo-template',
  );
  assert.equal(templateContainer.tag, 'div');
  assert.equal(templateContainer.children[0].textContent, 'Template replacement');
  apply.dispatch('click');
  assert.equal(Object.hasOwn(state.cells.dev.brandName, 'template'), false);
  edit.dispatch('click');
  assert.equal(template.value, '{{{brandName}}}');
  template.value = '$1-{{{brandName}}}';
  template.dispatch('input');
  apply.dispatch('click');
  assert.equal(state.cells.dev.brandName.template, '$1-{{{brandName}}}');
  edit.dispatch('click');
  assert.equal(template.value, '$1-{{{brandName}}}');
  template.value = '{{{brandName}}}';
  template.dispatch('input');
  apply.dispatch('click');
  assert.equal(Object.hasOwn(state.cells.dev.brandName, 'template'), false);
  edit.dispatch('click');
  assert.equal(template.value, '{{{brandName}}}');
  for (const variant of ['inline', 'popover']) {
    const other = fixture(variant);
    const otherHost = other.nodes.find(
      (node) => node.dataset.market === 'dev' && node.dataset.variable === 'brandName',
    );
    assert.equal(otherHost.children[0].children[0].textContent, 'Market value');
    assert.equal(other.state.cells.dev.brandName.template, '{{{brandName}}}');
    assert.ok(other.nodes.some((node) => node.tag === 'details'));
  }
});

test('production market variable script contains no obsolete unavailable-rule directive', () => {
  const production = fs.readFileSync(
    path.join(SITE, 'assets/js/mcdev-pipeline-step-market-vars.js'),
    'utf8',
  );
  assert.doesNotMatch(production, /eslint-disable unicorn\/name-replacements/);
});

test('demo pages are undiscoverable and load no production builder scripts or Liquid tokens', () => {
  for (const variant of ['inline', 'popover', 'panel']) {
    const page = fs.readFileSync(
      path.join(SITE, 'tools/mcdev-pipeline-builder/regex-demo', variant + '.md'),
      'utf8',
    );
    assert.match(page, /^discoverable: false$/m);
    assert.match(page, /^layout: page$/m);
    assert.match(page, new RegExp('data-variant="' + variant + '"'));
    assert.equal((page.match(/<script /g) || []).length, 1);
    assert.match(page, /mcdev-pipeline-regex-demo\.js/);
    assert.doesNotMatch(page, /\{\{\{|mcdev-pipeline-core|mcdev-pipeline-builder\.js/);
  }
  const css = fs.readFileSync(path.join(SITE, 'assets/css/mcdev-pipeline-regex-demo.scss'), 'utf8');
  assert.match(css, /\.regex-demo \{/);
  const config = fs.readFileSync(path.join(SITE, 'eslint.config.js'), 'utf8');
  assert.match(config, /tests\/mcdev-pipeline-regex-demo\.test\.cjs/);
  const scripts = JSON.parse(fs.readFileSync(path.join(SITE, 'package.json'), 'utf8')).scripts;
  assert.ok(scripts.lint.includes('tests/mcdev-pipeline-regex-demo.test.cjs'));
  assert.ok(scripts['lint:fix'].includes('tests/mcdev-pipeline-regex-demo.test.cjs'));
});
