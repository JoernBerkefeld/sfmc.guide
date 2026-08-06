---
layout: page
title: "AMPscript Function Reference"
description: "Per-function AMPscript reference pages for Marketing Cloud Engagement. Every page is proven by running the function on a live Engagement CloudPage — signature, argument handling, edge cases, and the test script that produced the evidence."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript/functions/
platforms:
  - engagement
  - next
---

This is the runtime-proven half of the AMPscript reference. Every function in the language catalog is listed below, but only the ones marked **Verified** have a page. Each of those pages documents one function as it actually behaves on a live Marketing Cloud Engagement CloudPage — what the signature really accepts, what happens on the edges, and the AMPscript that produced the evidence. Nothing on those pages is inferred from reading a doc page.

{% include callout.html type="note" title="Coverage grows one verification sweep at a time" content="Rows marked **Catalogued** are listed from the language catalog so the full surface is browsable and the sweep has a visible progress surface — their runtime behaviour has **not** been proven here, and they have no page yet. Use the [AMPscript guidance page](/engagement/ampscript/) and [ampscript.guide](https://ampscript.guide/) for those in the meantime." %}

## All functions

{% include ampscript-function-index.html entries=site.data.ampscript_functions
   empty="No functions catalogued yet." %}

## Shared runtime behaviour

These rules hold across the functions proven so far, and are worth internalising before reading an individual page.

**A bad argument does not fail locally — it kills the page.** An invalid argument count, a non-numeric string, a boolean-like string, an empty string, or a date value does not return an error value. It aborts the whole CloudPage with HTTP 422 and discards every line rendered before the failing call. There is no partial output to inspect, which is why the test scripts on these pages isolate each risky case behind its own request-parameter branch.

**Numeric strings are accepted by the Math functions, everything else is not.** A string that parses cleanly as a number — `"15"`, `"3.14"`, `"-5"` — is accepted exactly like the numeric literal. That is why the parameter tables list `string | number` rather than `number`. A string that does not parse as a number is rejected outright; it is never coerced to zero.

**The String functions swallow booleans silently.** The page returns HTTP 200 and the value simply disappears, so a stray boolean produces a sentence with a hole in it rather than an error. Numbers and date values are accepted and processed by their string form, which is why those parameter tables list `string | number | date`.

## Related

- [Differs from official docs (Engagement)](/engagement/differs-from-docs/) — the findings where runtime behaviour contradicts or outruns the official reference
- [AMPscript guidance](/engagement/ampscript/) — patterns and snippets rather than per-function reference
- [ssjs.guide](https://ssjs.guide) — the equivalent runtime-verified reference for Server-Side JavaScript
