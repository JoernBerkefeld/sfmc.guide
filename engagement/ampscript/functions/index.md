---
layout: page
title: "AMPscript Function Reference"
description: "Per-function AMPscript reference pages for Marketing Cloud Engagement, covering each function's signature, argument handling and edge cases."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript/functions/
platforms:
  - engagement
---

This is the runtime-proven half of the AMPscript reference. Every function in the language catalog is listed below, but only the ones marked **Verified** have a page. Each of those pages documents one function as it actually behaves on a live Marketing Cloud Engagement CloudPage — what the signature really accepts, what happens on the edges, and the AMPscript that produced the evidence. Nothing on those pages is inferred from reading a doc page.

{% include callout.html type="note" title="Coverage grows one verification sweep at a time" content="The **Verified** badge marks a function that has completed a runtime sweep and has a reference page — its name links there. A name **without** the badge is listed from the language catalog so the full surface stays browsable, but its runtime behaviour has **not** been proven here and it has no page yet. Use the [AMPscript guidance page](/engagement/ampscript/) and [ampscript.guide](https://ampscript.guide/) for those in the meantime." %}

## Start with a task

New to the language? Follow the [AMPscript beginner path](/engagement/ampscript/#a-beginner-learning-path) first, then use these function pages for examples and tested details:

- **Personalize content:** [AttributeValue](/engagement/ampscript/functions/attributevalue/) for contextual values, [Empty](/engagement/ampscript/functions/empty/) for empty-value checks, and [v](/engagement/ampscript/functions/v/) for inline output.
- **Read Data Extension data:** choose from the [lookup family](/engagement/ampscript/#data-extension-lookups), including [LookupRows](/engagement/ampscript/functions/lookuprows/) for matching rows.
- **Format dates:** [FormatDate](/engagement/ampscript/functions/formatdate/) covers date patterns, time patterns, and locales.
- **Build tracked email links:** [RedirectTo](/engagement/ampscript/functions/redirectto/#dynamic-trackable-links) covers URLs held in variables.

## All functions

{% include ampscript-function-index.html entries=site.data.ampscript_functions
   show_ssjs_mapping=true
   empty="No functions catalogued yet." %}

## Related

- [Differs from official docs (Engagement)](/engagement/differs-from-docs/) — the findings where runtime behaviour contradicts or outruns the official reference
- [AMPscript guide](/engagement/ampscript/) — beginner learning path, task-based routes, and practical authoring tips
- [ampscript.guide](https://ampscript.guide/) — the community AMPscript reference, useful for functions not yet verified here
- [ssjs.guide](https://ssjs.guide) — the equivalent runtime-verified reference for Server-Side JavaScript
