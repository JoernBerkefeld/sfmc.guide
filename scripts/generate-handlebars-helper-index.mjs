/**
 * Regenerates _data/handlebars_helpers.yml from handlebars-data + ampscript-data.
 *
 * The file backs the searchable/filterable catalog table rendered by
 * _includes/handlebars-helper-index.html on /next/handlebars/helpers/ and, in
 * its unmapped-only form, on /next/ampscript-handlebars/.
 *
 * handlebars-data holds no back-reference to AMPscript — the mapping lives in
 * ampscript-data as `handlebarsEquivalent`. This script inverts it so a page can
 * answer "which helpers have no AMPscript counterpart?" from one data file.
 *
 * Run from the monorepo root:
 *   node sfmc.guide/scripts/generate-handlebars-helper-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');

const hb = require(path.join(ROOT, 'handlebars-data/src/index.js'));
const amp = require(path.join(ROOT, 'ampscript-data/src/index.js'));

/** Quote a value for safe single-line YAML output. */
function q(value) {
  return `"${String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\s*\n\s*/g, ' ')
    .trim()}"`;
}

/**
 * Renders the call form of a helper: block helpers get the `{{#name}}…{{/name}}`
 * shape, subexpression-only helpers the parenthesised one, everything else the
 * plain inline form. Optional parameters are bracketed, variadic ones prefixed.
 */
function syntax(helper) {
  const args = (helper.params || [])
    .map((p) => {
      const name = p.variadic ? `...${p.name}` : p.name;
      return p.optional ? `[${name}]` : name;
    })
    .join(' ');
  const call = args ? `${helper.name} ${args}` : helper.name;
  if (helper.subexpressionOnly) return `(${call})`;
  if (helper.helperType === 'block') return `{{#${call}}}…{{/${helper.name}}}`;
  return `{{${call}}}`;
}

/**
 * AMPscript counterpart per Handlebars helper, inverted from ampscript-data.
 * Sources are, in priority order, FUNCTIONS then AMPSCRIPT_KEYWORDS then
 * AMPSCRIPT_OPERATORS. Only the first counterpart seen for a helper is recorded
 * (functions win, and within a source, catalog order wins), so a helper that
 * inverts to several AMPscript entries (e.g. getContentBlock ← ContentBlockByID
 * and ContentBlockByKey) shows one representative counterpart.
 * Each record carries the counterpart kind and, for functions, its exactness.
 */
const ampByHelper = new Map();
function recordEquivalent(helperName, ampName, kind, exact) {
  if (!helperName || ampByHelper.has(helperName)) return;
  ampByHelper.set(helperName, { name: ampName, kind, exact });
}
for (const f of amp.FUNCTIONS) {
  if (f.handlebarsEquivalent) {
    recordEquivalent(f.handlebarsEquivalent, f.name, 'function', f.handlebarsExact !== false);
  }
}
for (const k of amp.AMPSCRIPT_KEYWORDS) {
  if (k.handlebarsEquivalent) recordEquivalent(k.handlebarsEquivalent, k.name, 'keyword', true);
}
for (const op of amp.AMPSCRIPT_OPERATORS) {
  if (op.handlebarsEquivalent) recordEquivalent(op.handlebarsEquivalent, op.name, 'operator', true);
}

const helpers = [...hb.HELPERS].sort((a, b) => a.name.localeCompare(b.name));
const helperNames = new Set(helpers.map((h) => h.name));

const dangling = [...ampByHelper.keys()].filter((name) => !helperNames.has(name));
if (dangling.length > 0) {
  console.error(
    `ERROR: ampscript-data handlebarsEquivalent names no such helper: ${dangling.join(', ')}`,
  );
  process.exit(1);
}

let mapped = 0;
let out = `# Handlebars helper catalog for /next/handlebars/helpers/ and, filtered to
# rows with an empty ampscriptEquivalent, /next/ampscript-handlebars/.
#
# AUTO-GENERATED — do not edit by hand.
# Regenerate with: node sfmc.guide/scripts/generate-handlebars-helper-index.mjs
#
# Source of truth: handlebars-data/src/index.js for the helpers themselves, and
# ampscript-data/src/index.js for ampscriptEquivalent — that mapping is stored
# on the AMPscript side as handlebarsEquivalent and inverted here.
#
# mcn is the Marketing Cloud Next API version the helper became available in.
# ampscriptEquivalent is "" when no AMPscript function covers the same job.

`;

for (const h of helpers) {
  const equiv = ampByHelper.get(h.name) || null;
  const ampName = equiv ? equiv.name : '';
  if (ampName) mapped += 1;

  out += `- name: ${q(h.name)}\n`;
  out += `  slug: ${q(h.name.toLowerCase())}\n`;
  out += `  category: ${q(h.category)}\n`;
  out += `  origin: ${q(h.origin)}\n`;
  out += `  helperType: ${q(h.helperType)}\n`;
  out += `  syntax: ${q(syntax(h))}\n`;
  out += `  returnType: ${q(h.returnType || '—')}\n`;
  out += `  mcn: ${h.mcnSince ? q(String(h.mcnSince)) : '""'}\n`;
  out += `  ampscriptEquivalent: ${q(ampName)}\n`;
  out += `  ampscriptEquivalentKind: ${q(equiv ? equiv.kind : '')}\n`;
  if (equiv) out += `  ampscriptExact: ${equiv.exact}\n`;
  out += `  subexpressionOnly: ${Boolean(h.subexpressionOnly)}\n`;
  out += `  description: ${q(h.description)}\n`;
  if (h.docUrl) out += `  docUrl: ${q(h.docUrl)}\n`;
}

const target = path.join(SITE, '_data/handlebars_helpers.yml');
fs.writeFileSync(target, out.replace(/\r\n/g, '\n'), 'utf8');
console.log(
  `wrote _data/handlebars_helpers.yml (${helpers.length} helpers, ${mapped} with an AMPscript equivalent)`,
);
