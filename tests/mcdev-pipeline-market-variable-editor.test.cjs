'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const helperContext = {};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../assets/js/mcdev-pipeline-config-builder.js'), 'utf8'),
  helperContext,
);
const helpers = helperContext.mpbConfigBuilder;
const source = fs.readFileSync(
  path.join(__dirname, '../assets/js/mcdev-pipeline-market-variable-editor.js'),
  'utf8',
);

// Event-capable DOM fixture; dispatch follows document capture before the target.
class Node {
  constructor(tag, document) {
    this.tag = tag;
    this.ownerDocument = document;
    this.children = [];
    this.attributes = {};
    this.listeners = new Map();
    this.hidden = false;
  }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  remove() {
    this.parent.children = this.parent.children.filter((node) => node !== this);
  }
  contains(node) {
    return this === node || this.children.some((child) => child.contains(node));
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
  focus() {
    this.ownerDocument.activeElement = this;
    this.dispatch('focus');
  }
  getClientRects() {
    return this.hidden ? [] : [{}];
  }
  querySelectorAll() {
    return this.children.flatMap((node) => [
      ...(['input', 'button'].includes(node.tag) ? [node] : []),
      ...node.querySelectorAll(),
    ]);
  }
  addEventListener(type, callback) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(callback);
    this.listeners.set(type, handlers);
  }
  removeEventListener(type, callback) {
    this.listeners.set(
      type,
      this.listeners.get(type).filter((handler) => handler !== callback),
    );
  }
  dispatch(type, properties = {}) {
    const event = properties.target
      ? properties
      : {
          target: this,
          prevented: false,
          stopped: false,
          preventDefault() {
            this.prevented = true;
          },
          stopPropagation() {
            this.stopped = true;
          },
          stopImmediatePropagation() {
            this.stopped = true;
          },
          ...properties,
        };
    if (this !== this.ownerDocument) {
      this.ownerDocument.dispatch(type, event);
    }
    if (!event.stopped) {
      for (const handler of this.listeners.get(type) || []) {
        handler(event);
      }
    }
    return event;
  }
}
function edit(input, text) {
  input.value = text;
  input.dispatch('input');
}
function fixture(value) {
  value ??= { search: '(saved)', replace: 'Saved', template: '$1-original' };
  const context = { mpbConfigBuilder: helpers };
  vm.runInNewContext(source, context);
  const document = new Node('document');
  document.ownerDocument = document;
  document.createElement = (tag) => new Node(tag, document);
  const root = new Node('div', document);
  const trigger = new Node('button', document);
  let locked = false;
  const commits = [];
  const cell = { key: 'bu/name', name: 'name', marketLabel: 'Brand DEV', value, trigger };
  const editor = context.mpbMarketVariableEditor.create(root, {
    readOnly: () => locked,
    onApply: (target, next) => commits.push({ kind: 'apply', target, value: next }),
    onSwitch: (target, next) => commits.push({ kind: 'switch', target, value: next }),
  });
  const [backdrop, panel, warningBackdrop, warning] = root.children;
  const [replace, search, template, apply, panelSwitch, cancel] = panel.querySelectorAll();
  const [keep, switchText] = warning.querySelectorAll();
  function drafts() {
    return [replace.value, search.value, template.value];
  }
  return {
    document,
    root,
    cell,
    editor,
    commits,
    panel,
    backdrop,
    warning,
    warningBackdrop,
    replace,
    search,
    template,
    apply,
    panelSwitch,
    cancel,
    keep,
    switchText,
    edit,
    drafts,
    lock: () => {
      locked = true;
    },
  };
}

test('search errors stay directly between Search pattern and Template replacement through correction', () => {
  const f = fixture();
  f.editor.open(f.cell);
  const error = f.panel.children[4];
  const siblings = [f.replace.parent, f.search.parent, error, f.template.parent];
  assert.deepEqual(f.panel.children.slice(2, 6), siblings);
  assert.deepEqual(
    siblings.map((node) => node.textContent),
    ['Market value', 'Search pattern', '', 'Template replacement'],
  );
  assert.equal(error.tag, 'p');
  assert.equal(error.parent, f.panel);
  assert.equal(error.className, 'mpb-mv-editor-error mpb-field-error');
  assert.equal(error.attributes['aria-live'], 'polite');
  assert.equal(f.search.attributes['aria-describedby'], error.id);
  assert.equal(f.search.className, 'mpb-mv-input');
  f.edit(f.search, '');
  assert.equal(error.textContent, 'Enter a non-empty regex search pattern.');
  assert.equal(f.search.attributes['aria-invalid'], 'true');
  assert.equal(f.apply.disabled, true);
  f.apply.dispatch('click');
  assert.equal(f.commits.length, 0);
  assert.deepEqual(f.panel.children.slice(2, 6), siblings);
  f.edit(f.search, '(corrected)');
  assert.equal(error.textContent, '');
  assert.equal(f.search.attributes['aria-invalid'], 'false');
  assert.equal(f.apply.disabled, false);
  assert.deepEqual(f.panel.children.slice(2, 6), siblings);
  assert.equal(error.className, 'mpb-mv-editor-error mpb-field-error');
  assert.equal(error.attributes['aria-live'], 'polite');
  assert.equal(f.search.attributes['aria-describedby'], error.id);
  assert.equal(f.search.className, 'mpb-mv-input');
});

test('literal drafts start empty, retain typed scalars until edited, normalize default template', () => {
  for (const scalar of [0, 42, false, true, 'text']) {
    const f = fixture(scalar);
    f.editor.open(f.cell);
    assert.equal(f.document.activeElement, f.replace);
    assert.equal(f.search.value, '');
    assert.equal(f.panelSwitch.hidden, false);
    assert.equal(f.template.value, '{{{name}}}');
    assert.equal(f.apply.disabled, true);
    f.edit(f.search, '(source)');
    f.apply.dispatch('click');
    assert.equal(f.commits[0].value.replace, scalar);
    assert.equal(Object.hasOwn(f.commits[0].value, 'template'), false);
    assert.equal(f.cell.value, scalar);
    f.editor.open(f.cell);
    f.edit(f.search, 'source');
    f.edit(f.replace, 'changed');
    f.edit(f.template, '$1-custom');
    f.apply.dispatch('click');
    assert.equal(f.commits[1].value.replace, 'changed');
    assert.equal(f.commits[1].value.template, '$1-custom');
  }
});

test('Switch to text discards scalar drafts without confirmation or commits and restores focus', () => {
  for (const scalar of ['text', '', 0, false]) {
    const f = fixture(scalar);
    f.editor.open(f.cell);
    assert.equal(f.panelSwitch.hidden, false);
    f.edit(f.replace, 'Unsaved');
    f.edit(f.search, '(draft)');
    f.edit(f.template, '$1-draft');
    f.panelSwitch.dispatch('click');
    assert.equal(f.panel.hidden, true);
    assert.equal(f.warning.hidden, true);
    assert.equal(f.document.activeElement, f.cell.trigger);
    assert.equal(f.cell.trigger.attributes['aria-expanded'], 'false');
    assert.equal(f.commits.length, 0);
    assert.equal(f.cell.value, scalar);
    f.editor.open(f.cell);
    assert.deepEqual(f.drafts(), [String(scalar), '', '{{{name}}}']);
    assert.equal(f.warning.hidden, true);
  }
});

test('Cancel and Escape discard every draft field and restore focus; same-cell open preserves drafts', () => {
  for (const action of ['cancel', 'escape']) {
    const f = fixture();
    const saved = JSON.stringify(f.cell.value);
    f.editor.open(f.cell);
    assert.equal(f.document.activeElement, f.replace);
    f.edit(f.replace, 'Unsaved');
    f.edit(f.search, '(draft)');
    f.edit(f.template, '$1-draft');
    f.template.focus();
    f.editor.open({ ...f.cell });
    assert.equal(f.document.activeElement, f.search);
    assert.deepEqual(f.drafts(), ['Unsaved', '(draft)', '$1-draft']);
    if (action === 'cancel') {
      f.cancel.dispatch('click');
    } else {
      f.document.dispatch('keydown', { key: 'Escape' });
    }
    assert.equal(f.panel.hidden, true);
    assert.equal(f.document.activeElement, f.cell.trigger);
    assert.equal(f.commits.length, 0);
    assert.equal(JSON.stringify(f.cell.value), saved);
    f.editor.open(f.cell);
    assert.deepEqual(f.drafts(), ['Saved', '(saved)', '$1-original']);
  }
});

for (const action of ['cancel', 'escape', 'outside']) {
  test(
    'confirmation ' + action + ' preserves all draft fields and focus; only affirmative switches',
    () => {
      const f = fixture({ search: '(saved)', replace: false, template: '$1-original' });
      const saved = JSON.stringify(f.cell.value);
      f.editor.open(f.cell);
      assert.equal(f.panelSwitch.hidden, false);
      f.edit(f.replace, 'Unsaved');
      f.edit(f.search, '(draft)');
      f.edit(f.template, '$1-draft');
      f.template.focus();
      f.panelSwitch.dispatch('pointerdown');
      f.panelSwitch.focus();
      f.panelSwitch.dispatch('click');
      assert.equal(f.warning.hidden, false);
      assert.equal(f.warning.attributes.role, 'alertdialog');
      assert.equal(f.document.activeElement, f.keep);
      assert.match(f.warning.children[1].textContent, /deletes the search pattern/);
      if (action === 'cancel') {
        f.keep.dispatch('click');
      }
      if (action === 'escape') {
        f.document.dispatch('keydown', { key: 'Escape' });
      }
      if (action === 'outside') {
        let underlying = 0;
        const outside = new Node('button', f.document);
        outside.addEventListener('pointerdown', () => underlying++);
        outside.addEventListener('click', () => underlying++);
        assert.equal(outside.dispatch('pointerdown').prevented, true);
        assert.equal(outside.dispatch('click').prevented, true);
        assert.equal(underlying, 0);
      }
      assert.equal(f.warning.hidden, true);
      assert.equal(f.panel.hidden, false);
      assert.equal(f.document.activeElement, f.template);
      assert.deepEqual(f.drafts(), ['Unsaved', '(draft)', '$1-draft']);
      assert.equal(f.commits.length, 0);
      assert.equal(JSON.stringify(f.cell.value), saved);
      f.panelSwitch.focus();
      f.panelSwitch.dispatch('click');
      f.switchText.dispatch('click');
      assert.equal(f.commits.length, 1);
      assert.equal(f.commits[0].kind, 'switch');
      assert.equal(f.commits[0].value, false);
      assert.equal(f.panel.hidden, true);
      assert.equal(f.document.activeElement, f.cell.trigger);
      f.switchText.dispatch('click');
      assert.equal(f.commits.length, 1);
    },
  );
}

test('modal focus wraps in panel and confirmation, including narrow viewport', () => {
  const f = fixture();
  f.document.defaultView = { innerWidth: 390 };
  f.editor.open(f.cell);
  assert.equal(f.panel.attributes['aria-modal'], 'true');
  f.cancel.focus();
  f.document.dispatch('keydown', { key: 'Tab' });
  assert.equal(f.document.activeElement, f.replace);
  f.document.dispatch('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(f.document.activeElement, f.cancel);
  f.editor.confirmSwitch(f.cell);
  f.document.dispatch('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(f.document.activeElement, f.switchText);
  f.document.dispatch('keydown', { key: 'Tab' });
  assert.equal(f.document.activeElement, f.keep);
});

test('readonly lock transitions block draft edits, Apply and affirmative switch', () => {
  for (const confirmation of [false, true]) {
    const f = fixture();
    f.editor.open(f.cell);
    if (confirmation) {
      f.editor.confirmSwitch(f.cell);
    }
    f.lock();
    f.edit(f.replace, 'Locked edit');
    f.apply.dispatch('click');
    f.switchText.dispatch('click');
    assert.equal(f.commits.length, 0);
    assert.equal(f.panel.hidden, false);
    f.document.dispatch('keydown', { key: 'Escape' });
    if (confirmation) {
      f.document.dispatch('keydown', { key: 'Escape' });
    }
    f.editor.open(f.cell);
    assert.equal(f.panel.hidden, true);
  }
});

test('invalid imported objects cannot be silently converted; regex validation blocks Apply', () => {
  const f = fixture({ search: 'saved', replace: false, extra: 'unsupported' });
  f.editor.open(f.cell);
  assert.equal(f.panelSwitch.hidden, true);
  f.edit(f.search, 'fixed');
  f.apply.dispatch('click');
  f.editor.confirmSwitch(f.cell);
  assert.equal(f.commits.length, 0);
  assert.equal(f.warning.hidden, true);
  assert.equal(f.apply.disabled, true);
  assert.equal(f.search.attributes['aria-invalid'], 'true');
  assert.equal(f.panel.children[4].textContent, helpers.validateMarketVariable(f.cell.value));
  assert.equal(f.panel.children[3], f.search.parent);
  assert.equal(f.panel.children[5], f.template.parent);
  const valid = fixture();
  valid.editor.open(valid.cell);
  valid.edit(valid.search, '[');
  valid.apply.dispatch('click');
  assert.equal(valid.commits.length, 0);
  assert.equal(valid.search.attributes['aria-invalid'], 'true');
  assert.equal(valid.apply.disabled, true);
  assert.match(valid.panel.children[4].textContent, /^Fix the regex search pattern: /);
  assert.equal(valid.panel.children[3], valid.search.parent);
  assert.equal(valid.panel.children[5], valid.template.parent);
  valid.edit(valid.search, 'ok');
  valid.edit(valid.replace, '');
  valid.apply.dispatch('click');
  assert.equal(valid.commits[0].value.replace, '');
});

test('switch without draft preserves native replacement; changing cells isolates drafts; disposal removes listeners', () => {
  for (const scalar of [0, false]) {
    const f = fixture({ search: 'source', replace: scalar });
    f.editor.confirmSwitch(f.cell);
    f.keep.dispatch('click');
    assert.equal(f.document.activeElement, f.cell.trigger);
    f.editor.confirmSwitch(f.cell);
    f.switchText.dispatch('click');
    assert.equal(f.commits[0].value, scalar);
  }
  const f = fixture();
  f.editor.open(f.cell);
  f.edit(f.search, 'unapplied');
  f.editor.open({ ...f.cell, key: 'other/name', value: 'Other' });
  assert.equal(f.search.value, '');
  assert.equal(f.replace.value, 'Other');
  f.editor.dispose();
  f.editor.dispose();
  assert.equal(f.root.children.length, 0);
  for (const handlers of f.document.listeners.values()) {
    assert.equal(handlers.length, 0);
  }
  f.editor.open(f.cell);
  assert.equal(f.panel.hidden, true);
});
