/**
 * Regenerates next/ampscript-handlebars/index.md from ampscript-data + handlebars-data.
 * Run from monorepo root:
 *   node sfmc.guide/scripts/generate-mcn-ampscript-table.mjs
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
const hb = require(path.join(ROOT, 'handlebars-data/src/index.js'));

function esc(s) {
  return String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

const supported = amp.FUNCTIONS.filter((f) => amp.isMcnSupported(f.name)).sort((a, b) =>
  a.name.localeCompare(b.name),
);

const mappedHb = new Set(
  supported.map((f) => f.handlebarsEquivalent).filter((x) => typeof x === 'string' && x.length),
);

const hbOnly = hb.HELPERS.filter((h) => !mappedHb.has(h.name)).sort((a, b) =>
  a.name.localeCompare(b.name),
);

const today = new Date().toISOString().slice(0, 10);

let md = `---
layout: page
title: "AMPscript and Handlebars on Marketing Cloud Next"
description: "Which AMPscript functions are supported in Marketing Cloud Next, how they map to Handlebars helpers, and which helpers have no AMPscript counterpart."
parent: Next
parent_url: /next/
permalink: /next/ampscript-handlebars/
platforms:
  - next
---

<!-- AUTO-GENERATED tables below — regenerate with: node scripts/generate-mcn-ampscript-table.mjs -->

Marketing Cloud Next supports a **subset** of Engagement AMPscript and a parallel **Handlebars** helper surface. This page is an architect-oriented overview generated from the same catalogs that power the SFMC Language Service and ESLint rules.

{% include callout.html type="note" title="Source of truth" content="AMPscript support and \`handlebarsEquivalent\` come from \`ampscript-data\`. Handlebars helpers come from \`handlebars-data\`. Regenerate this page when those packages change." %}

## Syntax at a glance

Handlebars helpers, Marketing Cloud Next bindings and AMPscript can all appear in the same template. Documented helpers and functions are highlighted differently from names the catalogs do not know:

{% raw %}

\`\`\`sfmc
{{#if isMember}}
  {{formatCurrency total "EUR"}} — {{myUnknownHelper total}}
{{else}}
  {{fallback firstName "there"}}
{{/if}}

<a href="{!$link.PreferenceCenterUrl}">Manage preferences</a>

%%[ SET @greeting = Concat("Hello ", @firstName) ]%%
%%=v(@greeting)=%%
\`\`\`

{% endraw %}

## AMPscript supported in Marketing Cloud Next

Functions where \`isMcnSupported\` is true. **API version** is the Marketing Cloud Next API version from \`mcnSince\` / \`getMcnApiVersion\`.

| AMPscript | API version | Handlebars equivalent | Notes |
|---|---:|---|---|
`;

for (const f of supported) {
  const ver = amp.getMcnApiVersion(f.name) ?? f.mcnSince ?? '—';
  const hbEq = f.handlebarsEquivalent ? `\`${esc(f.handlebarsEquivalent)}\`` : '—';
  const notes = [f.mcnNotes, f.mcnHandlebarsGap].filter(Boolean).map(esc).join(' ');
  md += `| \`${esc(f.name)}\` | ${ver} | ${hbEq} | ${notes || '—'} |\n`;
}

md += `
## Handlebars helpers without an AMPscript counterpart

Helpers that are not referenced by any AMPscript \`handlebarsEquivalent\`.

| Helper | API version | Category | Description |
|---|---:|---|---|
`;

for (const h of hbOnly) {
  md += `| \`${esc(h.name)}\` | ${h.mcnSince ?? '—'} | ${esc(h.category || '—')} | ${esc(h.description || '—')} |\n`;
}

md += `
_Last regenerated ${today}. ${supported.length} AMPscript rows · ${hbOnly.length} Handlebars-only helpers._

## See also

- [Next overview](/next/)
- [ampscript.guide](https://ampscript.guide)
- [SFMC Language Service](/tools/vscode-sfmc-language/)
`;

const out = path.join(SITE, 'next/ampscript-handlebars/index.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md.replace(/\r\n/g, '\n'), 'utf8');
console.log('wrote next/ampscript-handlebars/index.md', {
  amp: supported.length,
  hbOnly: hbOnly.length,
});
