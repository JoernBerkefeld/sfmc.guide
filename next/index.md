---
layout: page
title: "Marketing Cloud Next"
description: "Architect-oriented entry point for Marketing Cloud Next on sfmc.guide."
permalink: /next/
platforms:
  - next
---

Marketing Cloud Next changes what you can ship in content and automation compared to classic Engagement. This section grows over time; v1 focuses on the language surface that architects need when planning migrations.

## Start here

| Page | Purpose |
|---|---|
| [AMPscript and Handlebars](/next/ampscript-handlebars/) | Which AMPscript functions are supported, API version, Handlebars mapping, and helpers with no AMPscript counterpart |
| [AMPscript function reference](/next/ampscript/functions/) | The supported AMPscript subset on its own searchable page |
| [Handlebars helper reference](/next/handlebars/helpers/) | The complete Handlebars helper catalog, searchable by category and origin |
| [Differs from official docs](/next/differs-from-docs/) | AMPscript behaviour on Next that contradicts the official documentation |

## Tooling for Next

Only tools that explicitly support Next are useful in this lane. Browse the [Tools](/tools/) catalog and filter by the **Next** badge — including the [SFMC Language Service](/tools/vscode-sfmc-language/), [eslint-plugin-sfmc](/tools/eslint-plugin-sfmc/) `*-next` configs, and the WIP [sf-plugin-mcnext](/tools/sf-plugin-mcnext/).

{% include callout.html type="warning" title="SSJS is not supported on Next" content="Server-Side JavaScript is **not available** on Marketing Cloud Next — there is no SSJS runtime to author against. Any SSJS in an Engagement asset has to be replaced before that asset can move to Next. [ssjs.guide](https://ssjs.guide) remains the reference for Engagement workloads only." %}
