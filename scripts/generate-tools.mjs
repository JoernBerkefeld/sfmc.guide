/**
 * Generates /tools/ index and per-tool pages from the catalog below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');

function write(rel, content) {
  const full = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const body = content.replace(/\r\n/g, '\n');
  fs.writeFileSync(full, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  console.log('wrote', rel);
}

function platformsYaml(platforms) {
  return platforms.map((p) => `  - ${p}`).join('\n');
}

function badgeHtml(platforms) {
  return platforms
    .map((p) =>
      p === 'engagement'
        ? '<span class="platform-badge platform-badge--engagement">Engagement</span>'
        : '<span class="platform-badge platform-badge--next">Next</span>',
    )
    .join('\n    ');
}

/** @type {Array<{
 *  slug: string,
 *  title: string,
 *  group: 'own'|'community',
 *  platforms: ('engagement'|'next')[],
 *  summary: string,
 *  body: string,
 *  links?: {label: string, url: string}[],
 *  deprecated?: boolean,
 *  wip?: boolean,
 *  externalOnly?: boolean
 * }>} */
const tools = [
  {
    slug: 'mcdev',
    title: 'SFMC DevTools (mcdev)',
    group: 'own',
    platforms: ['engagement'],
    summary:
      'CLI to retrieve, deploy, and version Marketing Cloud Engagement metadata as code across business units.',
    body: `\`mcdev\` (Accenture open source, maintained with community contributions) is the de-facto CI/CD toolchain for Engagement metadata: retrieve, deploy, clone, and document business-unit configuration from the command line.

Pair it with [SFMC DevTools for VS Code](/tools/vscode-sfmc-devtools/) for a graphical workflow and [eslint-plugin-mcdev](/tools/eslint-plugin-mcdev/) to surface \`.mcdev-validations.js\` rules in the editor and CI.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/mcdev' },
      { label: 'GitHub', url: 'https://github.com/Accenture/sfmc-devtools' },
    ],
  },
  {
    slug: 'vscode-sfmc-devtools',
    title: 'SFMC DevTools for VS Code',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'Graphical VS Code interface for mcdev — retrieve and deploy without living in the terminal.',
    body: `VS Code extension that wraps SFMC DevTools for day-to-day retrieve and deploy flows. Useful when architects and developers share the same Git-backed metadata repo.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=Accenture-oss.sfmc-devtools-vscode',
      },
      { label: 'GitHub', url: 'https://github.com/Accenture/sfmc-devtools-vscode' },
    ],
  },
  {
    slug: 'vscode-sfmc-language',
    title: 'SFMC Language Service',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'VS Code / Cursor extension for AMPscript, SSJS, Handlebars, and SFMC HTML — completions, hover, diagnostics, snippets.',
    body: `Brings language intelligence to Engagement and Marketing Cloud Next content: syntax highlighting, completions, hover docs, diagnostics, and MCP wiring via [mcp-server-sfmc](/tools/mcp-server-sfmc/).

Powered by the same catalogs behind [ssjs.guide](https://ssjs.guide) and the ESLint/Prettier plugins.

Read the deep-dive: [Why the SFMC Language Service Is Great on Its Own…](/tools/language-service-eslint-prettier/).`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language',
      },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/vscode-sfmc-language' },
    ],
  },
  {
    slug: 'sfmc-language-lsp',
    title: 'sfmc-language-lsp',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary: 'Language Server Protocol implementation behind the SFMC Language Service extension.',
    body: `Reusable LSP package for AMPscript, SSJS, and Handlebars. Consumed by the VS Code extension; useful if you embed the same intelligence elsewhere.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/sfmc-language-lsp' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/sfmc-language-lsp' },
    ],
  },
  {
    slug: 'mcp-server-sfmc',
    title: 'MCP Server for SFMC',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'Model Context Protocol server that gives AI assistants accurate AMPscript, SSJS, and Handlebars knowledge.',
    body: `Exposes validation and conversion-aware tools to MCP clients (including Copilot agent mode when registered from the Language Service). Same language catalogs as the editor and ESLint.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/mcp-server-sfmc' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/mcp-server-sfmc' },
    ],
  },
  {
    slug: 'eslint-plugin-sfmc',
    title: 'eslint-plugin-sfmc',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'ESLint rules for AMPscript, SSJS, and Handlebars — shared team policy for editor and CI, including Next configs.',
    body: `Policy engine for SFMC code: unknown APIs, arity, Platform.Load order, ES3 limits, deprecated APIs, and \`*-next\` configs for Marketing Cloud Next migrations.

Pair with the Language Service and [prettier-plugin-sfmc](/tools/prettier-plugin-sfmc/). See the [toolchain article](/tools/language-service-eslint-prettier/).`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/eslint-plugin-sfmc' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/eslint-plugin-sfmc' },
    ],
  },
  {
    slug: 'prettier-plugin-sfmc',
    title: 'prettier-plugin-sfmc',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'Prettier plugin for AMPscript, SSJS, Handlebars, and SQL with SFMC-friendly defaults.',
    body: `Formats AMPscript (casing, quotes, embedded HTML) and SSJS with Engagement-safe defaults (indent, print width, no trailing commas that can break some SFMC contexts).`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/prettier-plugin-sfmc' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/prettier-plugin-sfmc' },
    ],
  },
  {
    slug: 'eslint-plugin-mcdev',
    title: 'eslint-plugin-mcdev',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary: 'Runs mcdev metadata validations as ESLint diagnostics in the editor and CI.',
    body: `Bridges \`.mcdev-validations.js\` into ESLint so retrieve/deploy quality rules show up next to language linting.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/eslint-plugin-mcdev' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/eslint-plugin-mcdev' },
    ],
  },
  {
    slug: 'eslint-plugin-mso-email',
    title: 'eslint-plugin-mso-email',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary:
      'ESLint rules for Outlook (MSO) conditional comments, VML, and HTML email layout pitfalls.',
    body: `Catches common HTML email mistakes around Microsoft Outlook conditional comments and related markup.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/eslint-plugin-mso-email' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/eslint-plugin-mso-email' },
    ],
  },
  {
    slug: 'vscode-mso-conditionals',
    title: 'MSO Conditionals (VS Code)',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary: 'Hover translations and snippets for Outlook MSO conditional comments in HTML email.',
    body: `Lightweight editor aid for reading and writing \`<!--[if mso]>\` style conditionals.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=joernberkefeld.mso-conditionals',
      },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/vscode-mso-conditionals' },
    ],
  },
  {
    slug: 'vscode-sfmc-extension-pack',
    title: 'SFMC Extension Pack',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary: 'Essential SFMC VS Code extensions bundled for a ready-to-go setup.',
    body: `One-click install of the core SFMC editor stack.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack',
      },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/vscode-sfmc-extension-pack' },
    ],
  },
  {
    slug: 'vscode-sfmc-extension-pack-expanded',
    title: 'SFMC Extension Pack (Expanded)',
    group: 'own',
    platforms: ['engagement', 'next'],
    summary: 'Full SFMC toolset plus complementary editor tooling for power users.',
    body: `Expanded bundle for teams that want the full stack in one Marketplace install.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-extension-pack-expanded',
      },
      {
        label: 'GitHub',
        url: 'https://github.com/JoernBerkefeld/vscode-sfmc-extension-pack-expanded',
      },
    ],
  },
  {
    slug: 'sfmc-dataloader',
    title: 'sfmc-dataloader',
    group: 'own',
    platforms: ['engagement'],
    summary: 'CLI for bulk import and export of Data Extension rows — built for automation.',
    body: `Command-line Data Extension load/extract for Engagement. See also the [VS Code](/tools/vscode-sfmc-dataloader/) and [desktop app](/tools/sfmc-dataloader-app/) variants.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/sfmc-dataloader' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/sfmc-dataloader' },
    ],
  },
  {
    slug: 'vscode-sfmc-dataloader',
    title: 'SFMC Data Loader for VS Code',
    group: 'own',
    platforms: ['engagement'],
    summary: 'Load and export Data Extension records from the VS Code editor.',
    body: `Editor-integrated Data Extension import/export for Engagement teams.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-data',
      },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/vscode-sfmc-dataloader' },
    ],
  },
  {
    slug: 'sfmc-dataloader-app',
    title: 'SFMC Data Loader App',
    group: 'own',
    platforms: ['engagement'],
    summary: 'Cross-platform desktop app for bulk Data Extension imports and exports.',
    body: `Desktop UI when a CLI or VS Code flow is not the right fit.`,
    links: [{ label: 'GitHub', url: 'https://github.com/JoernBerkefeld/sfmc-dataloader-app' }],
  },
  {
    slug: 'sfmc-boilerplate',
    title: 'SFMC Boilerplate',
    group: 'own',
    platforms: ['engagement'],
    summary: 'Bundle SSJS, AMPscript, and front-end sources into deployable CloudPages and emails.',
    body: `Build pipeline helper for Engagement CloudPages and email assets.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/sfmc-boilerplate' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/SFMC-boilerplate' },
    ],
  },
  {
    slug: 'sfmc-numbertolocalestring',
    title: 'SFMC numberToLocaleString',
    group: 'own',
    platforms: ['engagement'],
    summary: 'SSJS polyfill for locale-aware number formatting in Engagement.',
    body: `Polyfill for localized thousand/decimal separators in the Engagement SSJS engine. See also [ssjs.guide](https://ssjs.guide) for engine limits.`,
    links: [
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/SFMC-numberToLocaleString' },
    ],
  },
  {
    slug: 'eslint-config-ssjs',
    title: 'eslint-config-ssjs',
    group: 'own',
    platforms: ['engagement'],
    deprecated: true,
    summary: 'Legacy SSJS ESLint config — superseded by eslint-plugin-sfmc.',
    body: `{% include callout.html type="warning" title="Deprecated" content="Use [eslint-plugin-sfmc](/tools/eslint-plugin-sfmc/) instead." %}

The original shareable ESLint config for SSJS. Kept here for historical reference only.`,
    links: [
      { label: 'npm', url: 'https://www.npmjs.com/package/eslint-config-ssjs' },
      { label: 'GitHub', url: 'https://github.com/JoernBerkefeld/eslint-config-ssjs' },
    ],
  },
  {
    slug: 'sf-plugin-mcnext',
    title: 'sf-plugin-mcnext',
    group: 'own',
    platforms: ['next'],
    wip: true,
    summary: 'Salesforce CLI plugin for Marketing Cloud Next (in development).',
    body: `{% include callout.html type="note" title="Work in progress" content="This plugin is still being built. Expect APIs and commands to change before a stable release." %}

Salesforce CLI (\`sf\`) plugin aimed at Marketing Cloud Next developer workflows. Tracked in the monorepo as it matures.`,
    links: [{ label: 'GitHub', url: 'https://github.com/JoernBerkefeld/sf-plugin-mcnext' }],
  },
  // Community
  {
    slug: 'dataviews-io',
    title: 'dataviews.io',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary: 'Community reference for Engagement Data Views — schemas and relationships.',
    body: `{% include callout.html type="note" title="Third-party" content="Not affiliated with Salesforce or sfmc.guide. Listed for architects who work with Engagement data model documentation." %}

Browser-based Data View documentation for Marketing Cloud Engagement.`,
    links: [{ label: 'Website', url: 'https://dataviews.io/' }],
  },
  {
    slug: 'diagramforce',
    title: 'Diagramforce',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary:
      'Free browser-based diagram editor for architecture, data models, BPMN, Flows, and more.',
    body: `{% include callout.html type="note" title="Third-party" content="Not affiliated with Salesforce or sfmc.guide." %}

Diagramforce runs in the browser (optionally with your own Google Drive). Useful for Engagement solution architecture sketches, data mapping, and Salesforce Flow diagrams.`,
    links: [{ label: 'Website', url: 'https://diagramforce.com/' }],
  },
  {
    slug: 'ssjs-manager',
    title: 'SSJS Manager',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary:
      'VS Code extension for SSJS/AMPscript development with Cloud Page preview and linting (FiB).',
    body: `{% include callout.html type="note" title="Third-party" content="Published by FiB. Not affiliated with sfmc.guide. Complements — does not replace — the [SFMC Language Service](/tools/vscode-sfmc-language/)." %}

Focuses on rapid Cloud Page / script iteration, preview, and project setup against an Engagement business unit.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=FiB.ssjs-vsc',
      },
    ],
  },
  {
    slug: 'mcfs-ampscript',
    title: 'MCFS [AMPScript]',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary:
      'VS Code virtual filesystem into Engagement Content Builder with AMPscript highlighting and snippets.',
    body: `{% include callout.html type="note" title="Third-party" content="Published by Sergey Agadzhanov. Not affiliated with sfmc.guide." %}

Connects the editor to Marketing Cloud assets for edit-in-place workflows, plus AMPscript language aids.`,
    links: [
      {
        label: 'Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=sergey-agadzhanov.AMPscript',
      },
    ],
  },
  {
    slug: 'sfmc-companion',
    title: 'SFMC Companion',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary:
      'Chrome extension that maps relationships between Engagement objects (Automations, Queries, DEs, and more).',
    body: `{% include callout.html type="note" title="Third-party" content="Published by Cameron Robert. Not affiliated with sfmc.guide. Alpha-stage tooling — verify against your org permissions." %}

In-browser navigation and discovery across Marketing Cloud Engagement objects.`,
    links: [
      {
        label: 'Chrome Web Store',
        url: 'https://chromewebstore.google.com/detail/sfmc-companion/kllkonffdjfimimaellfmgnakhlbeicg',
      },
    ],
  },
  {
    slug: 'ampscript-io',
    title: 'ampscript.io',
    group: 'community',
    platforms: ['engagement'],
    externalOnly: true,
    summary: 'AMPscript syntax validation and highlighting in the browser.',
    body: `{% include callout.html type="note" title="Third-party" content="Not affiliated with Salesforce or sfmc.guide." %}

Quick online check for AMPscript syntax when you are away from the full editor toolchain.`,
    links: [{ label: 'Website', url: 'https://www.ampscript.io/' }],
  },
];

function card(t) {
  const flags = [];
  if (t.deprecated) flags.push('Deprecated');
  if (t.wip) flags.push('WIP');
  const meta = flags.length ? `<div class="tool-card-meta">${flags.join(' · ')}</div>` : '';
  return `<a class="tool-card" href="/tools/${t.slug}/">
  <div class="tool-card-title">${t.title}</div>
  <div class="platform-badges">
    ${badgeHtml(t.platforms)}
  </div>
  <div class="tool-card-desc">${t.summary}</div>
  ${meta}
</a>`;
}

const own = tools.filter((t) => t.group === 'own');
const community = tools.filter((t) => t.group === 'community');

write(
  'tools/index.md',
  `---
layout: page
title: "Tools"
description: "Editor, CI, CLI, and ecosystem tooling for Marketing Cloud Engagement and Marketing Cloud Next."
permalink: /tools/
---

Architect-oriented catalog of tooling. Every entry shows whether it targets **Engagement**, **Next**, or both.

<div class="tools-legend">
  <span><span class="platform-badge platform-badge--engagement">Engagement</span> Marketing Cloud Engagement</span>
  <span><span class="platform-badge platform-badge--next">Next</span> Marketing Cloud Next</span>
</div>

{% include callout.html type="tip" title="Language reference" content="SSJS API docs stay on [ssjs.guide](https://ssjs.guide). This section is about the toolchain around the platforms." %}

## Own tools

<div class="tool-grid">
${own.map(card).join('\n')}
</div>

## Community and ecosystem

Third-party tools that help Engagement teams. None of these are Marketing Cloud Next tools.

<div class="tool-grid">
${community.map(card).join('\n')}
</div>

## Articles

- [Why the SFMC Language Service Is Great on Its Own, and Even Better With ESLint and Prettier](/tools/language-service-eslint-prettier/)
`,
);

for (const t of tools) {
  const links = (t.links || []).map((l) => `- [${l.label}](${l.url})`).join('\n');
  write(
    `tools/${t.slug}/index.md`,
    `---
layout: page
title: "${t.title.replace(/"/g, '\\"')}"
description: "${t.summary.replace(/"/g, '\\"')}"
parent: Tools
parent_url: /tools/
permalink: /tools/${t.slug}/
platforms:
${platformsYaml(t.platforms)}
---

${t.body}

## Links

${links || '_No external links._'}

[← All tools](/tools/)
`,
  );
}

console.log(`tools: ${tools.length} pages`);

const x = 1;
