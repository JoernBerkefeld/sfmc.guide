---
layout: page
title: "AMPscript Function Reference"
description: "Per-function AMPscript reference pages for Marketing Cloud Engagement. Every page is proven by running the function on a live Engagement CloudPage — signature, argument handling, edge cases, and the test script that produced the evidence."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript/functions/
platforms:
  - engagement
---

This is the runtime-proven half of the AMPscript reference. Every function in the language catalog is listed below, but only the ones marked **Verified** have a page. Each of those pages documents one function as it actually behaves on a live Marketing Cloud Engagement CloudPage — what the signature really accepts, what happens on the edges, and the AMPscript that produced the evidence. Nothing on those pages is inferred from reading a doc page.

{% include callout.html type="note" title="Coverage grows one verification sweep at a time" content="The **Verified** badge marks a function that has completed a runtime sweep and has a reference page — its name links there. A name **without** the badge is listed from the language catalog so the full surface stays browsable, but its runtime behaviour has **not** been proven here and it has no page yet. Use the [AMPscript guidance page](/engagement/ampscript/) and [ampscript.guide](https://ampscript.guide/) for those in the meantime." %}

## All functions

{% include ampscript-function-index.html entries=site.data.ampscript_functions
   empty="No functions catalogued yet." %}

## Related

- [Differs from official docs (Engagement)](/engagement/differs-from-docs/) — the findings where runtime behaviour contradicts or outruns the official reference
- [AMPscript guidance](/engagement/ampscript/) — patterns and snippets rather than per-function reference
- [ampscript.guide](https://ampscript.guide/) — the community AMPscript reference, useful for functions not yet verified here
- [ssjs.guide](https://ssjs.guide) — the equivalent runtime-verified reference for Server-Side JavaScript
