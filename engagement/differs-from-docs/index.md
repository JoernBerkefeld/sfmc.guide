---
layout: page
title: "AMPscript Differs from Official Docs (Engagement)"
description: "AMPscript functions whose real behaviour on Marketing Cloud Engagement contradicts the official Salesforce documentation — wrong return types, wrong argument rules, undocumented behaviour. Every entry is proven on a live Engagement CloudPage."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/differs-from-docs/
platforms:
  - engagement
---

The official AMPscript documentation is not always right. Return types can be wrong, arguments described as optional turn out to be mandatory, and some functions behave differently than the reference page claims. This page collects those cases for **Marketing Cloud Engagement** — every entry here is proven by running the function on a live Engagement CloudPage, not inferred from reading the docs.

{% include callout.html type="note" title="AMPscript only — SSJS quirks live elsewhere" content="This page tracks **AMPscript** discrepancies. Server-Side JavaScript engine and runtime quirks are documented separately at [ssjs.guide/engine-limitations/differs-from-docs](https://ssjs.guide/engine-limitations/differs-from-docs/)." %}

{% include callout.html type="tip" title="Looking for Marketing Cloud Next?" content="Function availability and behaviour diverge between the two platforms — `Char` and `RegExMatch`, for example, are Engagement-only. Next findings are tracked on [AMPscript Differs from Official Docs (Next)](/next/differs-from-docs/)." %}

## How to read an entry

Each finding is a card with a severity (high / medium / low), a discrepancy-type code, the affected function category, a description of what the docs claim versus what actually happens, and — where one exists — a copy-paste AMPscript snippet that reproduces it plus a link to the official page that is inaccurate.

| Code | Discrepancy type |
|---|---|
| A1 | Wrong return type |
| A2 | Null / empty result on absence |
| A3 | Wrong argument count or optionality |
| A4 | Wrong, renamed, or relocated members |
| A5 | Undocumented but real behaviour |
| A6 | Context or availability differs |
| A7 | Encoding, format, or validation semantics |

## Findings

{% include differs-from-docs-list.html entries=site.data.differs_from_docs_engagement empty="No Engagement discrepancies have been recorded yet. Findings are added here as the AMPscript verification sweep proves them against a live CloudPage." %}
