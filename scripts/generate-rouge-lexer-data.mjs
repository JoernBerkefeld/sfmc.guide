/**
 * Regenerates _plugins/sfmc_catalogs.rb from the central data packages.
 *
 * The Rouge lexers in _plugins/ use these lists to tell a documented SFMC
 * built-in (AMPscript function, Handlebars helper) apart from an arbitrary
 * user-defined identifier, so the two get different colours in code samples.
 *
 * Keeping the lists generated is what stops the drift seen in highlightjs-sfmc,
 * whose hand-maintained copy silently fell behind ampscript-data.
 *
 * Run from the monorepo root:
 *   node sfmc.guide/scripts/generate-rouge-lexer-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');

const amp = require(path.join(ROOT, 'ampscript-data/src/index.js'));
const hbs = require(path.join(ROOT, 'handlebars-data/src/index.js'));

/**
 * Emits a sorted, deduplicated Ruby `%w[]` word array wrapped in a frozen Set.
 *
 * Names are validated rather than escaped: `%w[]` cannot express whitespace or
 * brackets, so anything outside the identifier charset means the upstream
 * catalog changed shape and this generator needs revisiting.
 *
 * @param {string[]} names - Raw identifiers from a data package.
 * @param {string} indent - Leading whitespace for the continuation lines.
 * @returns {string} Ruby source for a frozen Set of the names.
 */
function rubySet(names, indent) {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  for (const name of unique) {
    if (!/^[A-Za-z_][\w.-]*$/.test(name)) {
      throw new Error(`unexpected characters in catalog name: ${JSON.stringify(name)}`);
    }
  }
  const lines = [];
  let current = indent;
  for (const name of unique) {
    if (current !== indent && current.length + name.length + 1 > 96) {
      lines.push(current);
      current = indent;
    }
    current += current === indent ? name : ` ${name}`;
  }
  if (current !== indent) lines.push(current);
  return `Set.new(%w[\n${lines.join('\n')}\n${indent.slice(2)}]).freeze`;
}

const ampFunctions = amp.FUNCTIONS.map((f) => f.name);
const ampKeywords = amp.AMPSCRIPT_KEYWORDS.map((k) => k.name);
const hbsHelpers = hbs.HELPERS.map((h) => h.name);
// Bindings are dotted paths (organization.Address); the lexer matches the
// namespace segment, so expose both the full path and its first segment.
const hbsBindings = hbs.BUILTIN_BINDINGS.flatMap((b) => [b.name, b.name.split('.')[0]]);

const out = `# frozen_string_literal: true
#
# Name catalogs shared by the SFMC Rouge lexers.
#
# AUTO-GENERATED — do not edit by hand.
# Regenerate with: node sfmc.guide/scripts/generate-rouge-lexer-data.mjs
#
# Sources of truth:
#   ampscript-data/src/index.js   -> FUNCTIONS, AMPSCRIPT_KEYWORDS
#   handlebars-data/src/index.js  -> HELPERS, BUILTIN_BINDINGS

require 'set'

module SfmcGuide
  module Catalogs
    # Documented AMPscript functions. AMPscript is case-insensitive, so the
    # lexer downcases before lookup and these are stored downcased.
    AMPSCRIPT_FUNCTIONS = ${rubySet(
      ampFunctions.map((n) => n.toLowerCase()),
      '      ',
    )}

    # Reserved words: control flow, declarations, logical operators, booleans.
    AMPSCRIPT_KEYWORDS = ${rubySet(
      ampKeywords.map((n) => n.toLowerCase()),
      '      ',
    )}

    # Handlebars helpers available on Marketing Cloud Next.
    HANDLEBARS_HELPERS = ${rubySet(hbsHelpers, '      ')}

    # Namespaces and full paths used by {!$binding} tokens.
    HANDLEBARS_BINDINGS = ${rubySet(hbsBindings, '      ')}
  end
end
`;

const target = path.join(SITE, '_plugins/sfmc_catalogs.rb');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out.replace(/\r\n/g, '\n'), 'utf8');
console.log(
  `wrote _plugins/sfmc_catalogs.rb (${ampFunctions.length} AMPscript functions, ` +
    `${ampKeywords.length} keywords, ${hbsHelpers.length} Handlebars helpers)`,
);
