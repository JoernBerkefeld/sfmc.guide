/**
 * Regenerates _data/ampscript_functions.yml from ampscript-data.
 *
 * The file backs the searchable/filterable catalog table rendered by
 * _includes/ampscript-function-index.html on /engagement/ampscript/functions/.
 *
 * A row is marked verified ONLY when the catalog says isConfirmed AND a flat
 * reference page exists at engagement/ampscript/functions/<lowercase-name>.md.
 * Unverified rows are emitted without a url so the include never links to a
 * page that does not exist, and never implies unproven behaviour.
 *
 * Run from the monorepo root:
 *   node sfmc.guide/scripts/generate-ampscript-function-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');
const PAGES_DIR = path.join(SITE, 'engagement/ampscript/functions');

const amp = require(path.join(ROOT, 'ampscript-data/src/index.js'));
const ssjs = require(path.join(ROOT, 'ssjs-data/src/index.js'));

/**
 * AMPscript → SSJS Platform-function map, inverted from ssjs-data's
 * PLATFORM_FUNCTIONS[].ampscriptEquivalent (SSJS → AMPscript). Every SSJS
 * platform function that names an AMPscript counterpart shares its name with a
 * documented ssjs.guide page, so the link target is always
 * https://ssjs.guide/platform-functions/<lowercase-ssjs-name>/.
 *
 * An AMPscript function can have more than one SSJS counterpart, so each key
 * maps to a list of counterparts (sorted by name) rather than a single one.
 */
function ampToSsjs() {
  const map = new Map();
  for (const fn of ssjs.PLATFORM_FUNCTIONS) {
    if (!fn.ampscriptEquivalent) continue;
    const key = String(fn.ampscriptEquivalent).toLowerCase();
    const list = map.get(key) || [];
    list.push({
      name: `Platform.Function.${fn.name}`,
      url: `https://ssjs.guide/platform-functions/${fn.name.toLowerCase()}/`,
    });
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

const AMP_TO_SSJS = ampToSsjs();

/** Quote a value for safe single-line YAML output. */
function q(value) {
  return `"${String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\s*\n\s*/g, ' ')
    .trim()}"`;
}

/**
 * Reference pages are flat files (functions/<name>.md), mirroring ssjs.guide.
 * index.md is the directory index, never a function page.
 */
function pageSlugs() {
  const slugs = new Set();
  for (const entry of fs.readdirSync(PAGES_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'index.md') continue;
    slugs.add(entry.name.slice(0, -3).toLowerCase());
  }
  return slugs;
}

const slugs = pageSlugs();
const functions = [...amp.FUNCTIONS].sort((a, b) => a.name.localeCompare(b.name));

let verified = 0;
let orphanPages = new Set(slugs);
let out = `# AMPscript function catalog for /engagement/ampscript/functions/ and,
# filtered to rows with a non-empty mcn, /next/ampscript/functions/ and
# /next/ampscript-handlebars/.
#
# AUTO-GENERATED — do not edit by hand.
# Regenerate with: node sfmc.guide/scripts/generate-ampscript-function-index.mjs
#
# Source of truth: ampscript-data/src/index.js (names, categories, arity,
# return type, MCN availability, Handlebars mapping) plus the presence of a flat
# reference page at engagement/ampscript/functions/<lowercase-name>.md, and
# ssjs-data/src/index.js (PLATFORM_FUNCTIONS[].ampscriptEquivalent, inverted)
# for the SSJS mapping.
#
# mcn is the Marketing Cloud Next API version the function became available in,
# or "" when it is Engagement-only. handlebarsEquivalent names the Handlebars
# helper in handlebars_helpers.yml that covers the same job, or "".
# ssjsEquivalents is the list of fully-qualified SSJS Platform functions that
# cover the same job (e.g. Platform.Function.Base64Encode), each with a url to
# its ssjs.guide page; [] when none.
#
# verified: true means the function completed a runtime verification sweep AND
# has a published reference page. Everything else is catalogued only — its
# behaviour has NOT been proven here.

`;

for (const f of functions) {
  const slug = f.name.toLowerCase();
  const hasPage = slugs.has(slug);
  orphanPages.delete(slug);
  const isVerified = Boolean(f.isConfirmed) && hasPage;
  if (isVerified) verified += 1;

  out += `- name: ${q(f.name)}\n`;
  out += `  slug: ${q(slug)}\n`;
  out += `  category: ${q(f.category)}\n`;
  out += `  syntax: ${q(f.syntax || `${f.name}()`)}\n`;
  out += `  returnType: ${q(f.returnType || '—')}\n`;
  out += `  verified: ${isVerified}\n`;
  if (isVerified) out += `  url: ${q(`/engagement/ampscript/functions/${slug}/`)}\n`;
  out += `  differsFromDocs: ${Boolean(f.differsFromOfficialDocs)}\n`;
  out += `  deprecated: ${Boolean(f.deprecated)}\n`;
  out += `  mcn: ${f.mcnSince ? q(String(f.mcnSince)) : '""'}\n`;
  out += `  handlebarsEquivalent: ${f.handlebarsEquivalent ? q(f.handlebarsEquivalent) : '""'}\n`;
  if (f.handlebarsEquivalent) out += `  handlebarsExact: ${f.handlebarsExact !== false}\n`;
  const ssjsList = AMP_TO_SSJS.get(slug) || [];
  if (ssjsList.length > 0) {
    out += `  ssjsEquivalents:\n`;
    for (const eq of ssjsList) {
      out += `    - name: ${q(eq.name)}\n`;
      out += `      url: ${q(eq.url)}\n`;
    }
  } else {
    out += `  ssjsEquivalents: []\n`;
  }
  out += `  mcnNotes: ${q(f.mcnNotes ?? '')}\n`;
  out += `  description: ${q(f.description)}\n`;
  if (f.guideUrl) out += `  guideUrl: ${q(f.guideUrl)}\n`;
}

if (orphanPages.size > 0) {
  console.error(
    `ERROR: reference page(s) with no matching catalog entry: ${[...orphanPages].join(', ')}`,
  );
  process.exit(1);
}

const target = path.join(SITE, '_data/ampscript_functions.yml');
fs.writeFileSync(target, out.replace(/\r\n/g, '\n'), 'utf8');
console.log(
  `wrote _data/ampscript_functions.yml (${functions.length} functions, ${verified} verified with a page)`,
);
