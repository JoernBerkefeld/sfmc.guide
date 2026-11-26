---
layout: page
title: "Marketing Cloud Engagement"
description: "Technical guides for Salesforce Marketing Cloud Engagement — AMPscript learning paths and runtime-tested function reference, patterns, FAQ, Einstein, and encryption."
permalink: /engagement/
platforms:
  - engagement
---

Start with the [AMPscript guide](/engagement/ampscript/) for syntax, a beginner learning path, and task-based examples. The [AMPscript function reference](/engagement/ampscript/functions/) adds per-function signatures and observed behavior from live Engagement CloudPage tests, distinguishing verified pages from catalog-only entries.

The broader Engagement guides include practical material ported from the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/), plus pointers to deeper language references.

{% include callout.html type="tip" title="SSJS lives on ssjs.guide" content="The Cookbook SSJS chapter is **not** duplicated here. Use [ssjs.guide](https://ssjs.guide) for Platform functions, Core Library, WSProxy, engine limits, and recipes." %}

## Guides

| Topic | What you will find |
|---|---|
| [General coding guidelines](/engagement/general/) | Environment, project layout, Data Extensions, business units |
| [AMPscript guide](/engagement/ampscript/) | Syntax learning path, function examples, personalization, lookups, date formatting, and tracked links |
| [AMPscript function reference](/engagement/ampscript/functions/) | Per-function pages proven on a live Engagement CloudPage — signature, edge cases, test script |
| [Differs from official docs](/engagement/differs-from-docs/) | AMPscript behaviour on Engagement that contradicts the official documentation |
| [FAQ](/engagement/faq/) | Automations, CloudPages, emails, Journey Builder, admin |
| [Querying Data Extensions with AMPscript](/engagement/querying-data/) | Which lookup function to use, a SQL-to-AMPscript cheat sheet and a tested example per function |
| [Where AMPscript, SSJS and JavaScript can be saved](/engagement/code-persistence/) | Which content types keep or silently remove each kind of code on save, by API and in the editor |
| [Einstein Recommendations](/engagement/einstein/recommendation/) | Recommendation scenarios |
| [Encryption](/engagement/encryption/) | Crypto patterns in Engagement |
| [MobilePush setup](/engagement/mobilepush/) | App and Marketing Cloud setup for push, contact key and device registration, consent, troubleshooting |

## Related

- [ssjs.guide](https://ssjs.guide) — Server-Side JavaScript reference
- [ampscript.guide](https://ampscript.guide) — AMPscript function reference
- [Tools](/tools/) — editor, CI, and ecosystem tooling
