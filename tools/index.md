---
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
<a class="tool-card" href="/tools/mcdev/">
  <div class="tool-card-title">SFMC DevTools (mcdev)</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">CLI to retrieve, deploy, and version Marketing Cloud Engagement metadata as code across business units.</div>

</a>
<a class="tool-card" href="/tools/vscode-sfmc-devtools/">
  <div class="tool-card-title">SFMC DevTools for VS Code</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Graphical VS Code interface for mcdev — retrieve and deploy without living in the terminal.</div>

</a>
<a class="tool-card" href="/tools/vscode-sfmc-language/">
  <div class="tool-card-title">SFMC Language Service</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">VS Code / Cursor extension for AMPscript, SSJS, Handlebars, and SFMC HTML — completions, hover, diagnostics, formatting, snippets.</div>

</a>
<a class="tool-card" href="/tools/sfmc-language-lsp/">
  <div class="tool-card-title">sfmc-language-lsp</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Language Server Protocol implementation behind the SFMC Language Service extension.</div>

</a>
<a class="tool-card" href="/tools/mcp-server-sfmc/">
  <div class="tool-card-title">MCP Server for SFMC</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Model Context Protocol server that gives AI assistants accurate AMPscript, SSJS, and Handlebars knowledge.</div>

</a>
<a class="tool-card" href="/tools/eslint-plugin-sfmc/">
  <div class="tool-card-title">eslint-plugin-sfmc</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">ESLint rules for AMPscript, SSJS, and Handlebars — shared team policy for editor and CI, including Next configs.</div>

</a>
<a class="tool-card" href="/tools/prettier-plugin-sfmc/">
  <div class="tool-card-title">prettier-plugin-sfmc</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Prettier plugin for AMPscript, SSJS, Handlebars, and SQL with SFMC-friendly defaults.</div>

</a>
<a class="tool-card" href="/tools/eslint-plugin-mcdev/">
  <div class="tool-card-title">eslint-plugin-mcdev</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Runs mcdev metadata validations as ESLint diagnostics in the editor and CI.</div>

</a>
<a class="tool-card" href="/tools/eslint-plugin-mso-email/">
  <div class="tool-card-title">eslint-plugin-mso-email</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">ESLint rules for Outlook (MSO) conditional comments, VML, and HTML email layout pitfalls.</div>

</a>
<a class="tool-card" href="/tools/vscode-mso-conditionals/">
  <div class="tool-card-title">MSO Conditionals (VS Code)</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Hover translations and snippets for Outlook MSO conditional comments in HTML email.</div>

</a>
<a class="tool-card" href="/tools/vscode-sfmc-extension-pack/">
  <div class="tool-card-title">SFMC Extension Pack</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Essential SFMC VS Code extensions bundled for a ready-to-go setup.</div>

</a>
<a class="tool-card" href="/tools/vscode-sfmc-extension-pack-expanded/">
  <div class="tool-card-title">SFMC Extension Pack (Expanded)</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Full SFMC toolset plus complementary editor tooling for power users.</div>

</a>
<a class="tool-card" href="/tools/sfmc-dataloader/">
  <div class="tool-card-title">sfmc-dataloader</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">CLI for bulk import and export of Data Extension rows — built for automation.</div>

</a>
<a class="tool-card" href="/tools/vscode-sfmc-dataloader/">
  <div class="tool-card-title">SFMC Data Loader for VS Code</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Load and export Data Extension records from the VS Code editor.</div>

</a>
<a class="tool-card" href="/tools/sfmc-dataloader-app/">
  <div class="tool-card-title">SFMC Data Loader App</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Cross-platform desktop app for bulk Data Extension imports and exports.</div>

</a>
<a class="tool-card" href="/tools/sfmc-boilerplate/">
  <div class="tool-card-title">SFMC Boilerplate</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Bundle SSJS, AMPscript, and front-end sources into deployable CloudPages and emails.</div>

</a>
<a class="tool-card" href="/tools/sfmc-numbertolocalestring/">
  <div class="tool-card-title">SFMC numberToLocaleString</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">SSJS polyfill for locale-aware number formatting in Engagement.</div>

</a>
<a class="tool-card" href="/tools/eslint-config-ssjs/">
  <div class="tool-card-title">eslint-config-ssjs</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Legacy SSJS ESLint config — superseded by eslint-plugin-sfmc.</div>
  <div class="tool-card-meta">Deprecated</div>
</a>
<a class="tool-card" href="/tools/sf-plugin-mcnext/">
  <div class="tool-card-title">sf-plugin-mcnext</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Salesforce CLI plugin for Marketing Cloud Next (in development).</div>
  <div class="tool-card-meta">WIP</div>
</a>
</div>

## Community and ecosystem

Third-party tools that help Engagement teams. None of these are Marketing Cloud Next tools.

<div class="tool-grid">
<a class="tool-card" href="https://dataviews.io/" target="_blank" rel="noopener">
  <div class="tool-card-title">dataviews.io</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Community reference for Engagement Data Views — schemas and relationships.</div>
</a>
<a class="tool-card" href="https://diagramforce.com/" target="_blank" rel="noopener">
  <div class="tool-card-title">Diagramforce</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
    <span class="platform-badge platform-badge--next">Next</span>
  </div>
  <div class="tool-card-desc">Free browser-based diagram editor for architecture, data models, BPMN, Flows, and more.</div>
</a>
<a class="tool-card" href="https://marketplace.visualstudio.com/items?itemName=FiB.ssjs-vsc" target="_blank" rel="noopener">
  <div class="tool-card-title">SSJS Manager</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">VS Code extension for SSJS/AMPscript development with Cloud Page preview and linting (FiB).</div>
</a>
<a class="tool-card" href="https://marketplace.visualstudio.com/items?itemName=sergey-agadzhanov.AMPscript" target="_blank" rel="noopener">
  <div class="tool-card-title">MCFS [AMPScript]</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">VS Code virtual filesystem into Engagement Content Builder with AMPscript highlighting and snippets.</div>
</a>
<a class="tool-card" href="https://chromewebstore.google.com/detail/sfmc-companion/kllkonffdjfimimaellfmgnakhlbeicg" target="_blank" rel="noopener">
  <div class="tool-card-title">SFMC Companion</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">Chrome extension that maps relationships between Engagement objects (Automations, Queries, DEs, and more).</div>
</a>
<a class="tool-card" href="https://www.ampscript.io/" target="_blank" rel="noopener">
  <div class="tool-card-title">ampscript.io</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">AMPscript syntax validation and highlighting in the browser.</div>
</a>
<a class="tool-card" href="https://github.com/adessoSE/ssjs-webpack" target="_blank" rel="noopener">
  <div class="tool-card-title">SSJS Framework</div>
  <div class="platform-badges">
    <span class="platform-badge platform-badge--engagement">Engagement</span>
  </div>
  <div class="tool-card-desc">It creates sfmc compatible SSJS from modern Javascript.</div>
</a>
</div>

## Articles

- [Why the SFMC Language Service Is Great on Its Own, and Even Better With ESLint and Prettier](/tools/language-service-eslint-prettier/)
