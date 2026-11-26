// SQL Converter page UI (/tools/sql-converter/). Loaded as <script type="module">.
// The converter core is the sfmc-sql-converter package, vendored into ./vendor/ by its sync script.
// Pure helpers are exported for tests/sql-converter-ui.test.cjs; the DOM part only runs in a browser.
// Always import from the versioned folder: the service worker serves cached files first.
import {
  MCN_TARGETS,
  convert,
  parseAmpscript,
  parseSsjs,
} from './vendor/sfmc-sql-converter/0.3.0/index.js';

export const CONVERT_DELAY_MS = 300;
export const MESSAGE_DELAY_MS = 1000;
const STORAGE_PREFIX = 'sfmc-guide:sql-converter:';

export const LANGUAGE_LABELS = {
  ssjs: 'SSJS',
  ampscript: 'AMPscript',
  handlebars: 'Handlebars',
  sql: 'SQL',
};

const SEVERITY_LABELS = { error: 'Error', warning: 'Warning', info: 'Note' };

export const EXAMPLES = {
  mce: [
    {
      label: 'IN, OR and ORDER BY',
      sql: "SELECT SubscriberKey, Email, Points\nFROM [Customers]\nWHERE Country IN ('DE', 'ES')\n  AND (Points >= 500 OR Tier = 'Gold')\nORDER BY Points DESC",
    },
    {
      label: 'Equals joined with AND',
      sql: "SELECT SubscriberKey, Email\nFROM [Customers]\nWHERE Country = 'DE'\n  AND Tier = 'Gold'",
    },
    {
      label: 'TOP, LIKE and a range',
      sql: "SELECT TOP 10 SubscriberKey, Email, Points\nFROM [Customers]\nWHERE Points > 100\n  AND Email LIKE '%@example.com'\nORDER BY Points DESC",
    },
    {
      label: 'JOIN (not supported)',
      sql: 'SELECT SubscriberKey, OrderId\nFROM [Customers]\nJOIN [Orders] ON Orders.SubscriberKey = Customers.SubscriberKey',
    },
  ],
  mcn: [
    {
      label: 'OR, LIKE, TOP and ORDER BY',
      sql: "SELECT TOP 5 FirstName, Email\nFROM [Contact]\nWHERE (MailingCountry = 'DE' OR MailingCountry = 'ES')\n  AND Title LIKE '%Manager%'\nORDER BY LastName DESC",
    },
    {
      label: 'Key lookup on a marketing object',
      sql: "SELECT CouponCode__c, Discount__c\nFROM [Coupon__mo]\nWHERE CouponCode__c = 'WELCOME10'",
      dataSource: 'MO',
    },
    {
      label: 'Related DMO rows of the bound data graph',
      sql: 'SELECT TOP 3 ssot__EmailAddress__c\nFROM [ssot__ContactPointEmail__dlm]\nORDER BY ssot__EmailAddress__c',
      dataSource: 'DG',
    },
    {
      label: '= NULL instead of IS NULL (error)',
      sql: 'SELECT Email\nFROM [Lead]\nWHERE Phone = NULL',
    },
  ],
};

const TOKEN_PATTERNS = {
  sql: /(?<c>--[^\n]*)|(?<s>'(?:[^']|'')*')|(?<k>\b(?:SELECT|TOP|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|ORDER|BY|ASC|DESC|JOIN|ON)\b)|(?<n>\b\d+(?:\.\d+)?\b)/giu,
  ssjs: /(?<c>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<s>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(?<k>\b(?:var|new|for|if|else|return|function|true|false|null)\b)|(?<n>\b\d+(?:\.\d+)?\b)|(?<f>\b[A-Za-z_]\w*(?=\())/gu,
  ampscript:
    /(?<c>\/\*[\s\S]*?\*\/)|(?<s>"[^"\n]*"|'[^'\n]*')|(?<k>%%\[|\]%%|\b(?:VAR|SET|IF|THEN|ELSE|ELSEIF|ENDIF|FOR|TO|DO|NEXT|AND|OR|NOT)\b)|(?<v>@\w+)|(?<n>\b\d+(?:\.\d+)?\b)|(?<f>\b[A-Za-z_]\w*(?=\())/giu,
  handlebars:
    /(?<c>\{\{!--[\s\S]*?--\}\}|\{\{![\s\S]*?\}\})|(?<s>"[^"\n]*"|'[^'\n]*')|(?<k>\{\{[#/]?|\}\})|(?<f>\b(?:each|if|else|unless|with|query|queryFirst|hash|get|compare|and|or|sort|slice)\b)|(?<n>\b\d+(?:\.\d+)?\b)/gu,
};

/**
 * Debounce a function: it runs once, `wait` ms after the last call.
 *
 * @param {(...args: unknown[]) => void} callback function to call
 * @param {number} wait delay in ms
 * @returns {((...args: unknown[]) => void) & { cancel: () => void }} debounced function with a cancel method
 */
export function debounce(callback, wait) {
  let timer;
  const debounced = (...arguments_) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...arguments_), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Group convert() outputs by language, keeping first-seen order of languages and outputs.
 *
 * @param {Array<{ id: string, language: string }>} outputs convert() outputs
 * @returns {Array<{ language: string, label: string, outputs: object[] }>} groups
 */
export function groupOutputsByLanguage(outputs) {
  const groups = [];
  const list = outputs ?? [];
  for (const output of list) {
    let group = groups.find((entry) => entry.language === output.language);
    if (!group) {
      group = {
        language: output.language,
        label: LANGUAGE_LABELS[output.language] ?? output.language,
        outputs: [],
      };
      groups.push(group);
    }
    group.outputs.push(output);
  }
  return groups;
}

const DATA_SOURCE_REASONS = {
  CRM: 'Only for Sales Cloud objects: choose CRM as data source.',
  MO: 'Only for marketing objects: choose MO as data source.',
  DG: 'Only for DMOs of the data graph bound to the email: choose DG as data source.',
};

/**
 * Turns stored settings back into a full settings object; anything missing or of the wrong
 * type falls back to the default, so old or edited storage can never break the page.
 *
 * @param {unknown} stored value read from storage
 * @returns {{deName: string, deKey: string, columns: string, dataSource: 'CRM' | 'MO' | 'DG'}} settings
 */
export function restoreSettings(stored) {
  const settings = { deName: '', deKey: '', columns: '', dataSource: 'CRM' };
  if (!stored || typeof stored !== 'object') {
    return settings;
  }
  for (const name of ['deName', 'deKey', 'columns']) {
    if (typeof stored[name] === 'string') {
      settings[name] = stored[name];
    }
  }
  if (stored.dataSource === 'MO' || stored.dataSource === 'DG') {
    settings.dataSource = stored.dataSource;
  }
  return settings;
}

/**
 * Lists every Next target in a fixed order, so switching the data source never makes a tab
 * vanish: targets of the other data source come back unavailable with the reason. Each label
 * names its data source, because CRM and MO both have a Handlebars `query`.
 *
 * @param {object[]} outputs outputs of a Next conversion (toCode)
 * @returns {object[]} one output per Next target
 */
export function withAllNextTargets(outputs) {
  const list = outputs ?? [];
  const known = new Set(MCN_TARGETS.map((target) => target.id));
  const all = MCN_TARGETS.map((target) => {
    const found = list.find((output) => output.id === target.id);
    const label = `${target.label} (${target.dataSource})`;
    return found
      ? { ...found, label }
      : {
          id: target.id,
          language: target.language,
          label,
          unavailable: DATA_SOURCE_REASONS[target.dataSource],
        };
  });
  return [...all, ...list.filter((output) => !known.has(output.id))];
}

/**
 * Pick the output to show: the wanted one if it has code, else the first one with code.
 *
 * @param {Array<{ id: string, code?: string }>} outputs convert() outputs
 * @param {string|null} wantedId previously selected output id
 * @returns {object|null} the output to show, or null when none has code
 */
export function pickOutput(outputs, wantedId) {
  const usable = (outputs ?? []).filter((output) => typeof output.code === 'string');
  return usable.find((output) => output.id === wantedId) ?? usable[0] ?? null;
}

/**
 * Messages to show: those about the input plus those of the shown output, without duplicates
 * (same code at the same position).
 *
 * @param {{ messages?: object[] }} result convert() result
 * @param {{ messages?: object[] }|null} output shown output
 * @returns {object[]} messages
 */
export function collectMessages(result, output) {
  const seen = new Set();
  const list = [];
  for (const message of [...(result?.messages ?? []), ...(output?.messages ?? [])]) {
    const key = `${message.code}@${message.line ?? ''}:${message.column ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push(message);
    }
  }
  return list;
}

/**
 * Clause map entries of the shown output.
 *
 * @param {{ clauseMap?: object[] }} result convert() result
 * @param {{ id: string }|null} output shown output
 * @returns {object[]} entries
 */
export function clausesFor(result, output) {
  if (!output) {
    return [];
  }
  return (result?.clauseMap ?? []).filter((entry) => entry.outputId === output.id);
}

/**
 * Chip text and tooltip for a round trip.
 *
 * @param {{ ok: boolean, sql?: string, note?: string }|null} roundTrip round trip
 * @param {string[]} [dropped] clause ids the output leaves out
 * @returns {{ ok: boolean, text: string, title: string }|null} chip content, null to hide it
 */
export function describeRoundTrip(roundTrip, dropped = []) {
  if (!roundTrip) {
    return null;
  }
  if (!roundTrip.ok) {
    return {
      ok: false,
      text: '✗ Doesn’t convert back to the same SQL',
      title: roundTrip.sql || roundTrip.note || '',
    };
  }
  let suffix = '';
  const left = [
    dropped.includes('top') && 'TOP',
    dropped.some((clauseId) => clauseId.startsWith('order-')) && 'ORDER BY',
  ].filter(Boolean);
  if (left.length > 0) {
    suffix = `, without ${left.join(' and ')}`;
  } else if (roundTrip.note) {
    const note = roundTrip.note.replace(/^same query\s*/iu, '').replace(/\.$/u, '');
    suffix = note ? `, ${note.charAt(0).toLowerCase()}${note.slice(1)}` : '';
  }
  return { ok: true, text: `✓ Converts back to the same SQL${suffix}`, title: roundTrip.sql ?? '' };
}

export const CODE_KINDS = {
  'ssjs-wsproxy': 'WSProxy retrieve (SSJS)',
  'ssjs-rows-retrieve': 'Rows.Retrieve (SSJS)',
  'ssjs-lookuprows': 'LookupRows (SSJS)',
  'ssjs-lookuporderedrows': 'LookupOrderedRows (SSJS)',
  'ssjs-filter': 'Filter object (SSJS)',
  'ampscript-lookuprows': 'LookupRows (AMPscript)',
  'ampscript-lookuporderedrows': 'LookupOrderedRows (AMPscript)',
  'ampscript-lookup': 'Lookup (AMPscript)',
  'handlebars-query': 'Handlebars query',
  'handlebars-queryfirst': 'Handlebars queryFirst',
  'handlebars-query-mo': 'Handlebars query (marketing object)',
  'ampscript-rso': 'RetrieveSalesforceObjects (AMPscript)',
  'ampscript-lookuprows-mo': 'LookupRows (AMPscript, marketing object)',
  'handlebars-datagraph': 'Handlebars loop over the bound data graph',
};

export const UNKNOWN_CODE_KIND = 'SSJS, AMPscript or Handlebars code';

const parseNextAmpscript = (code) => parseAmpscript(code, { platform: 'mcn' });

function safeParse(parse, text) {
  try {
    return parse(text) ?? {};
  } catch {
    return {};
  }
}

/**
 * Name the kind of lookup code, for the input pane title in the code → SQL direction.
 * Uses the same parser order as the converter core.
 *
 * @param {string} text code
 * @param {string} [platform] mce | mcn; Next reads AMPscript as Next lookup code and no SSJS
 * @returns {string} e.g. "LookupRows (AMPscript)"
 */
export function describeCode(text, platform = 'mce') {
  const value = String(text ?? '');
  // Direct calls ({{#query …}}) and subexpressions ({{#each (query …)}}, {{get (queryFirst …)}}).
  if (/(?:\{\{#?|\()\s*queryFirst\b/u.test(value)) {
    return CODE_KINDS['handlebars-queryfirst'];
  }
  if (/(?:\{\{#?|\()\s*query\b/u.test(value)) {
    return CODE_KINDS[
      /\btype\s*=\s*["']MO["']/u.test(value) ? 'handlebars-query-mo' : 'handlebars-query'
    ];
  }
  if (/\$dataGraph/u.test(value)) {
    return CODE_KINDS['handlebars-datagraph'];
  }
  if (/\bRetrieveSalesforceObjects\s*\(/iu.test(value)) {
    return CODE_KINDS['ampscript-rso'];
  }
  let parsers;
  if (platform === 'mcn') {
    parsers = [parseNextAmpscript];
  } else if (/%%\[|%%=|\bSET\s+@/iu.test(value)) {
    parsers = [parseAmpscript, parseSsjs];
  } else {
    parsers = [parseSsjs, parseAmpscript];
  }
  const results = parsers.map((parse) => safeParse(parse, value));
  const chosen =
    results.find((result) => result.ast) ?? results.find((result) => result.meta?.target);
  return CODE_KINDS[chosen?.meta?.target] ?? UNKNOWN_CODE_KIND;
}

/**
 * Convert a 1-based line and column to a 0-based offset, clamped to the line's end.
 *
 * @param {string} text source text
 * @param {number} line 1-based line
 * @param {number} column 1-based column
 * @returns {number} 0-based offset
 */
export function lineColumnToOffset(text, line, column) {
  let offset = 0;
  for (let current = 1; current < line; current++) {
    const next = text.indexOf('\n', offset);
    if (next === -1) {
      return text.length;
    }
    offset = next + 1;
  }
  const lineEnd = text.indexOf('\n', offset);
  const max = lineEnd === -1 ? text.length : lineEnd;
  return Math.min(offset + Math.max((column ?? 1) - 1, 0), max);
}

/**
 * Text range a message points at; endColumn is exclusive. At least one character wide.
 *
 * @param {string} text source text
 * @param {{ line: number, column: number, endLine?: number, endColumn?: number }} message message
 * @returns {{ start: number, end: number }} offsets
 */
export function messageRange(text, message) {
  const start = lineColumnToOffset(text, message.line, message.column);
  const end = message.endLine
    ? lineColumnToOffset(text, message.endLine, message.endColumn)
    : start;
  return { start, end: Math.max(end, start + 1) };
}

/**
 * Escape text for HTML.
 *
 * @param {string} value text
 * @returns {string} escaped text
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Syntax token ranges for the small highlighter.
 *
 * @param {string} text code
 * @param {string} language ssjs | ampscript | handlebars | sql
 * @returns {Array<{ start: number, end: number, className: string }>} token ranges
 */
export function tokenize(text, language) {
  const pattern = TOKEN_PATTERNS[language];
  if (!pattern) {
    return [];
  }
  const ranges = [];
  for (const match of text.matchAll(pattern)) {
    const kind = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);
    if (kind && match[0].length > 0) {
      ranges.push({ start: match.index, end: match.index + match[0].length, className: `tok-${kind}` });
    }
  }
  return ranges;
}

/**
 * Render text as HTML with overlapping ranges: the text is cut at every range boundary and each
 * piece gets the classes (and the last clause id) of the ranges that cover it.
 *
 * @param {string} text text
 * @param {Array<{ start: number, end: number, className?: string, clauseId?: string }>} ranges ranges
 * @returns {string} HTML
 */
export function renderRanges(text, ranges) {
  const valid = ranges
    .filter((range) => range && range.end > range.start && range.start < text.length)
    .map((range) => ({
      ...range,
      start: Math.max(0, range.start),
      end: Math.min(text.length, range.end),
    }));
  const cuts = new Set([0, text.length]);
  for (const range of valid) {
    cuts.add(range.start);
    cuts.add(range.end);
  }
  const points = [...cuts].toSorted((a, b) => a - b);
  let html = '';
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    const piece = escapeHtml(text.slice(from, to));
    const covering = valid.filter((range) => range.start <= from && range.end >= to);
    if (covering.length === 0) {
      html += piece;
      continue;
    }
    const classes = covering.map((range) => range.className).filter(Boolean);
    const clauseId = covering.findLast((range) => range.clauseId)?.clauseId;
    const classAttribute = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
    const clauseAttribute = clauseId ? ` data-clause="${escapeHtml(clauseId)}"` : '';
    html += `<span${classAttribute}${clauseAttribute}>${piece}</span>`;
  }
  return html;
}

/**
 * Turn the comma list from the settings field into column names.
 *
 * @param {string} value comma-separated list
 * @returns {string[]} column names
 */
export function parseColumns(value) {
  return String(value ?? '')
    .split(',')
    .map((column) => column.trim().replace(/^\[(.*)\]$/u, '$1'))
    .filter(Boolean);
}

/**
 * Build the convert() options from the UI state.
 *
 * @param {{ platform: string, direction: string, settings: object }} state UI state
 * @returns {object} convert() options
 */
export function buildOptions(state) {
  const options = { platform: state.platform, direction: state.direction };
  if (state.platform === 'mce') {
    const { deName, deKey, columns } = state.settings;
    if (deName.trim()) {
      options.deName = deName.trim();
    }
    if (deKey.trim()) {
      options.deKey = deKey.trim();
    }
    const list = parseColumns(columns);
    if (list.length > 0) {
      options.columns = list;
    }
  } else {
    options.dataSource = state.settings.dataSource;
  }
  return options;
}

// ── Browser part ──────────────────────────────────────────────────────────────

function readStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: the page works without it.
  }
}

function emptyResult() {
  return { outputs: [], messages: [], clauseMap: [], roundTrip: null };
}

function safeConvert(text, options) {
  try {
    const result = convert(text, options) ?? {};
    return {
      outputs: Array.isArray(result.outputs) ? result.outputs : [],
      messages: Array.isArray(result.messages) ? result.messages : [],
      clauseMap: Array.isArray(result.clauseMap) ? result.clauseMap : [],
      roundTrip: result.roundTrip ?? null,
    };
  } catch (ex) {
    return {
      ...emptyResult(),
      messages: [
        {
          severity: 'error',
          code: 'CONVERTER_FAILED',
          message: `The converter stopped with an error: ${ex.message}`,
          line: 1,
          column: 1,
        },
      ],
    };
  }
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The unavailable output tab an event happened on, if any.
 *
 * @param {Event} event DOM event
 * @returns {Element|null} the tab, or null
 */
function disabledTab(event) {
  return event.target.closest?.('[role="tab"][aria-disabled="true"]') ?? null;
}

function init(root) {
  const $ = (selector) => root.querySelector(selector);
  const elements = {
    platform: $('#sqlc-platform'),
    example: $('#sqlc-example'),
    settings: $('#sqlc-settings'),
    tip: $('#sqlc-tip'),
    deName: $('#sqlc-de-name'),
    deKey: $('#sqlc-de-key'),
    columns: $('#sqlc-columns'),
    dataSource: $('#sqlc-data-source'),
    messages: $('#sqlc-messages'),
    inputTitle: $('#sqlc-input-title'),
    inputSub: $('#sqlc-input-sub'),
    input: $('#sqlc-input'),
    backdrop: $('#sqlc-backdrop'),
    swap: $('#sqlc-swap'),
    tabs: $('#sqlc-tabs'),
    copy: $('#sqlc-copy'),
    copyStatus: $('#sqlc-copy-status'),
    output: $('#sqlc-output'),
    map: $('#sqlc-map'),
    mapList: $('#sqlc-map-list'),
    mapToggle: $('#sqlc-map-toggle'),
    roundTrip: $('#sqlc-roundtrip'),
    counts: $('#sqlc-counts'),
  };

  const state = {
    platform: readStorage('platform') === 'mcn' ? 'mcn' : 'mce',
    direction: 'toCode',
    selected: {},
    result: emptyResult(),
    messagesVisible: true,
    activeClause: null,
    settings: restoreSettings(readStorage('settings')),
  };

  const selectionKey = () => `${state.platform}:${state.direction}`;
  const currentOutput = () =>
    pickOutput(state.result.outputs, state.selected[selectionKey()] ?? null);

  function save() {
    writeStorage(state.platform, { direction: state.direction, input: elements.input.value });
    writeStorage('platform', state.platform);
    writeStorage('settings', state.settings);
  }

  function loadPlatformInput() {
    const stored = readStorage(state.platform);
    if (stored && typeof stored.input === 'string') {
      state.direction = stored.direction === 'toSql' ? 'toSql' : 'toCode';
      elements.input.value = stored.input;
    } else {
      state.direction = 'toCode';
      elements.input.value = EXAMPLES[state.platform][0].sql;
    }
  }

  // ── Rendering ──
  function renderChrome() {
    const isToCode = state.direction === 'toCode';
    for (const button of elements.platform.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.platform === state.platform));
    }
    elements.swap.classList.toggle('is-flipped', !isToCode);
    renderInputTitle();
    if (isToCode) {
      elements.inputSub.textContent =
        state.platform === 'mce' ? 'SELECT … FROM [DE] WHERE …' : 'SELECT … FROM [Object] WHERE …';
    } else {
      elements.inputSub.textContent =
        state.platform === 'mce'
          ? 'A WSProxy retrieve, Rows.Retrieve or Lookup call, or a filter object'
          : 'A Handlebars query or queryFirst call, or an AMPscript lookup';
    }
    elements.input.placeholder = isToCode
      ? 'Type a SELECT query, or load an example'
      : 'Paste the code to turn back into SQL';
    renderSettingsFields();
    elements.example.replaceChildren(
      new Option('Load example…', ''),
      ...EXAMPLES[state.platform].map((example, index) => new Option(example.label, String(index))),
    );
  }

  function renderSettingsFields() {
    for (const field of elements.settings.querySelectorAll('[data-only]')) {
      field.hidden = field.dataset.only !== state.platform;
    }
    // The state decides, not what the browser restored into the radios after a reload.
    for (const radio of elements.dataSource.querySelectorAll('input[type="radio"]')) {
      radio.checked = radio.value === state.settings.dataSource;
    }
  }

  function renderInputTitle() {
    elements.inputTitle.textContent =
      state.direction === 'toCode'
        ? 'SQL query'
        : describeCode(elements.input.value, state.platform);
  }

  function renderTabs() {
    hideTip();
    const shown = currentOutput();
    const groups = groupOutputsByLanguage(state.result.outputs);
    const html = groups
      .map((group) => {
        const buttons = group.outputs
          .map((output) => {
            const isSelected = shown !== null && output.id === shown.id;
            const reason = output.unavailable ?? '';
            const isDisabled = typeof output.code !== 'string';
            const name = `${group.label} ${output.label}${isDisabled ? `, not available: ${reason}` : ''}`;
            return `<button type="button" role="tab" class="sqlc-tab" id="sqlc-tab-${escapeHtml(output.id)}" data-output="${escapeHtml(output.id)}" aria-selected="${isSelected}" aria-controls="sqlc-output" tabindex="${isSelected ? 0 : -1}" aria-label="${escapeHtml(name)}"${isDisabled ? ` aria-disabled="true" data-reason="${escapeHtml(reason)}"` : ''}>${output.label === group.label ? '' : `<span class="sqlc-tab-lang">${escapeHtml(group.label)} ·</span> `}${escapeHtml(output.label)}</button>`;
          })
          .join('');
        return `<span class="sqlc-tab-group" role="presentation">${buttons}</span>`;
      })
      .join('');
    elements.tabs.innerHTML = html;
    if (shown === null && state.result.outputs.length > 0) {
      const first = elements.tabs.querySelector('[role="tab"]');
      first.tabIndex = 0;
    }
    elements.output.removeAttribute('aria-labelledby');
    if (shown) {
      elements.output.setAttribute('aria-labelledby', `sqlc-tab-${shown.id}`);
    }
  }

  function renderOutput() {
    const shown = currentOutput();
    elements.copy.disabled = shown === null;
    elements.swap.disabled = shown === null;
    elements.swap.title = shown
      ? 'Swap direction and use the output as input'
      : 'Nothing to swap: there is no output yet';
    if (!shown) {
      const isEmpty = elements.input.value.trim() === '';
      elements.output.innerHTML = `<span class="sqlc-placeholder">${
        isEmpty
          ? 'The result appears here as you type.'
          : 'No output fits this query yet. The messages above say why; point at a greyed-out tab to see its reason.'
      }</span>`;
      return;
    }
    const spans = (shown.spans ?? []).map((span) => ({
      start: span.start,
      end: span.end,
      className: 'sqlc-clause',
      clauseId: span.clauseId,
    }));
    elements.output.innerHTML = renderRanges(shown.code, [
      ...tokenize(shown.code, shown.language),
      ...spans,
    ]);
    highlightClause();
  }

  const shownMessages = () => collectMessages(state.result, currentOutput());
  const shownClauses = () => clausesFor(state.result, currentOutput());

  function visibleMessages() {
    return state.messagesVisible ? shownMessages() : [];
  }

  function renderBackdrop() {
    const text = elements.input.value;
    const ranges = visibleMessages().map((message) => ({
      ...messageRange(text, message),
      className: `sqlc-mark sqlc-mark--${Object.hasOwn(SEVERITY_LABELS, message.severity) ? message.severity : 'error'}`,
    }));
    const clause = shownClauses().find((entry) => entry.clauseId === state.activeClause);
    if (clause?.loc && clause.loc.end > clause.loc.start) {
      ranges.push({ start: clause.loc.start, end: clause.loc.end, className: 'sqlc-mark--hl' });
    }
    // The trailing space keeps a final newline and an end-of-input underline visible.
    elements.backdrop.innerHTML = renderRanges(`${text} `, ranges);
    syncScroll();
  }

  function renderMessages() {
    const messages = visibleMessages();
    elements.messages.hidden = messages.length === 0;
    elements.messages.innerHTML = messages
      .map((message, index) => {
        const severity = Object.hasOwn(SEVERITY_LABELS, message.severity) ? message.severity : 'error';
        const where = message.line
          ? `<button type="button" class="sqlc-msg-where" data-index="${index}">line ${message.line}, column ${message.column ?? 1}</button>`
          : '';
        return `<li class="sqlc-msg sqlc-msg--${severity}"><span class="sqlc-msg-sev">${SEVERITY_LABELS[severity]}</span><div class="sqlc-msg-text">${escapeHtml(message.message ?? '')} ${where}</div></li>`;
      })
      .join('');
  }

  function renderMap() {
    const clauses = shownClauses();
    elements.mapList.innerHTML = clauses
      .map(
        (entry) =>
          `<li class="sqlc-pair${entry.dropped ? ' is-dropped' : ''}" tabindex="0" data-clause="${escapeHtml(entry.clauseId)}"><span class="sqlc-pair-sql">${escapeHtml(entry.sql)}</span><span class="sqlc-pair-arrow" aria-hidden="true">→</span><span class="visually-hidden">becomes</span><span class="sqlc-pair-code">${escapeHtml(entry.code)}</span></li>`,
      )
      .join('');
    if (clauses.length === 0) {
      elements.mapList.innerHTML = '<li class="sqlc-placeholder">No clauses to map.</li>';
    }
  }

  function renderStatus() {
    const shown = currentOutput();
    const messages = shownMessages();
    // toCode: each output has its own round trip; toSql: the single SQL output uses the top-level one.
    const roundTrip = shown ? (shown.roundTrip ?? state.result.roundTrip) : null;
    const chip = describeRoundTrip(roundTrip, shown?.dropped ?? []);
    elements.roundTrip.hidden = !chip;
    if (chip) {
      elements.roundTrip.textContent = chip.text;
      elements.roundTrip.classList.toggle('is-ok', chip.ok);
      elements.roundTrip.classList.toggle('is-bad', !chip.ok);
      elements.roundTrip.title = chip.title;
    }
    const errors = messages.filter((message) => message.severity === 'error').length;
    const warnings = messages.filter((message) => message.severity === 'warning').length;
    elements.counts.textContent = [
      plural(shownClauses().length, 'clause'),
      plural(errors, 'error'),
      plural(warnings, 'warning'),
    ].join(' · ');
  }

  function renderAll() {
    if (
      state.activeClause &&
      shownClauses().every((entry) => entry.clauseId !== state.activeClause)
    ) {
      state.activeClause = null;
    }
    renderInputTitle();
    renderTabs();
    renderOutput();
    renderMap();
    renderStatus();
    renderMessages();
    renderBackdrop();
  }

  // ── Conversion ──
  function runConvert() {
    const text = elements.input.value;
    state.result = text.trim() === '' ? emptyResult() : safeConvert(text, buildOptions(state));
    if (state.platform === 'mcn' && state.direction === 'toCode' && state.result.outputs.length > 0) {
      state.result = { ...state.result, outputs: withAllNextTargets(state.result.outputs) };
    }
    renderAll();
    save();
  }

  function showMessages() {
    state.messagesVisible = true;
    renderMessages();
    renderBackdrop();
  }

  const convertSoon = debounce(runConvert, CONVERT_DELAY_MS);
  const messagesSoon = debounce(showMessages, MESSAGE_DELAY_MS);

  function convertNow() {
    convertSoon.cancel();
    messagesSoon.cancel();
    state.messagesVisible = true;
    runConvert();
  }

  function scheduleConvert() {
    // Hide messages while typing so half-typed SQL does not flash red; they return after 1 s idle.
    state.messagesVisible = false;
    renderMessages();
    renderBackdrop();
    convertSoon();
    messagesSoon();
  }

  // ── Clause highlighting ──
  function highlightClause() {
    for (const element of root.querySelectorAll('[data-clause]')) {
      element.classList.toggle(
        'is-hl',
        state.activeClause !== null && element.dataset.clause === state.activeClause,
      );
    }
  }

  function setActiveClause(clauseId) {
    if (state.activeClause === clauseId) {
      return;
    }
    state.activeClause = clauseId;
    highlightClause();
    renderBackdrop();
  }

  function onClauseOver(event) {
    const target = event.target.closest('[data-clause]');
    setActiveClause(target ? target.dataset.clause : null);
  }

  // ── Reason overlay for unavailable tabs (shows at once, unlike a title) ──
  function showTip(tab) {
    elements.tip.textContent = tab.dataset.reason ?? '';
    elements.tip.hidden = false;
    const box = tab.getBoundingClientRect();
    const width = elements.tip.offsetWidth;
    const left = Math.max(8, Math.min(box.left, innerWidth - width - 8));
    elements.tip.style.left = `${left}px`;
    elements.tip.style.top = `${box.bottom + 6}px`;
  }

  function hideTip() {
    elements.tip.hidden = true;
  }

  // ── Scroll sync between the textarea and its highlight backdrop ──
  function syncScroll() {
    elements.backdrop.scrollTop = elements.input.scrollTop;
    elements.backdrop.scrollLeft = elements.input.scrollLeft;
  }

  // ── Copy ──
  async function copyOutput() {
    const shown = currentOutput();
    if (!shown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shown.code);
      elements.copyStatus.textContent = 'Copied';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(elements.output);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      elements.output.focus();
      elements.copyStatus.textContent = 'Selected: press Ctrl+C to copy';
    }
    setTimeout(() => {
      elements.copyStatus.textContent = '';
    }, 2500);
  }

  // ── Events ──
  elements.input.addEventListener('input', scheduleConvert);
  elements.input.addEventListener('scroll', syncScroll);

  elements.platform.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-platform]');
    if (!button || button.dataset.platform === state.platform) {
      return;
    }
    save();
    state.platform = button.dataset.platform;
    state.activeClause = null;
    loadPlatformInput();
    renderChrome();
    convertNow();
  });

  elements.example.addEventListener('change', () => {
    const example = EXAMPLES[state.platform][Number(elements.example.value)];
    elements.example.value = '';
    if (!example) {
      return;
    }
    state.direction = 'toCode';
    elements.input.value = example.sql;
    if (state.platform === 'mcn') {
      // Next examples bring their data source.
      state.settings.dataSource = example.dataSource ?? 'CRM';
    }
    renderChrome();
    convertNow();
    elements.input.focus();
  });

  elements.swap.addEventListener('click', () => {
    const shown = currentOutput();
    if (!shown) {
      return;
    }
    state.direction = state.direction === 'toCode' ? 'toSql' : 'toCode';
    state.activeClause = null;
    elements.input.value = shown.code;
    renderChrome();
    convertNow();
  });

  elements.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) {
      return;
    }
    if (tab.getAttribute('aria-disabled') === 'true') {
      showTip(tab);
      return;
    }
    state.selected[selectionKey()] = tab.dataset.output;
    // Messages, counts, round trip and clause map all belong to the shown output.
    renderAll();
    elements.tabs.querySelector(`[data-output="${CSS.escape(tab.dataset.output)}"]`)?.focus();
  });

  elements.tabs.addEventListener('keydown', (event) => {
    const tabs = [...elements.tabs.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(event.target);
    if (index === -1) {
      return;
    }
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index };
    if (!Object.hasOwn(moves, event.key)) {
      return;
    }
    event.preventDefault();
    const next = tabs[(index + moves[event.key] + tabs.length) % tabs.length];
    for (const tab of tabs) {
      tab.tabIndex = tab === next ? 0 : -1;
    }
    next.focus();
    if (next.getAttribute('aria-disabled') !== 'true') {
      next.click();
    }
  });

  elements.copy.addEventListener('click', copyOutput);

  elements.mapToggle.addEventListener('click', () => {
    const isOn = elements.mapToggle.getAttribute('aria-pressed') !== 'true';
    elements.mapToggle.setAttribute('aria-pressed', String(isOn));
    elements.map.hidden = !isOn;
    if (!isOn) {
      setActiveClause(null);
    }
  });

  for (const host of [elements.mapList, elements.output]) {
    host.addEventListener('mouseover', onClauseOver);
    host.addEventListener('mouseleave', () => setActiveClause(null));
  }
  elements.mapList.addEventListener('focusin', onClauseOver);
  elements.mapList.addEventListener('focusout', () => setActiveClause(null));

  elements.messages.addEventListener('click', (event) => {
    const button = event.target.closest('.sqlc-msg-where');
    if (!button) {
      return;
    }
    const message = visibleMessages()[Number(button.dataset.index)];
    if (!message) {
      return;
    }
    const { start, end } = messageRange(elements.input.value, message);
    elements.input.focus();
    elements.input.setSelectionRange(start, Math.min(end, elements.input.value.length));
  });

  elements.tabs.addEventListener('pointerover', (event) => {
    const tab = disabledTab(event);
    if (tab) {
      showTip(tab);
    }
  });
  elements.tabs.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'mouse' && disabledTab(event)) {
      hideTip();
    }
  });
  elements.tabs.addEventListener('focusin', (event) => {
    const tab = disabledTab(event);
    if (tab) {
      showTip(tab);
    } else {
      hideTip();
    }
  });
  elements.tabs.addEventListener('focusout', hideTip);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideTip();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!disabledTab(event)) {
      hideTip();
    }
  });
  addEventListener('scroll', hideTip, { passive: true });

  const settingFields = {
    deName: elements.deName,
    deKey: elements.deKey,
    columns: elements.columns,
  };
  for (const [name, field] of Object.entries(settingFields)) {
    field.value = state.settings[name];
    field.addEventListener('input', () => {
      state.settings[name] = field.value;
      scheduleConvert();
    });
  }
  elements.dataSource.addEventListener('change', (event) => {
    state.settings.dataSource = event.target.value;
    scheduleConvert();
  });

  // ── Start ──
  loadPlatformInput();
  renderChrome();
  root.classList.add('is-ready');
  convertNow();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#sqlc-app');
  if (root) {
    init(root);
  }
}
