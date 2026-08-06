---
layout: page
title: "AMPscript Differs from Official Docs (Next)"
description: "AMPscript functions whose real behaviour on Marketing Cloud Next contradicts the official Salesforce documentation — wrong return types, wrong argument rules, undocumented behaviour, and divergence from the same function on Engagement."
parent: Next
parent_url: /next/
permalink: /next/differs-from-docs/
platforms:
  - next
---

The official AMPscript documentation is not always right, and Marketing Cloud Next adds a second dimension: the supported function set is a subset of Engagement's, and a function that exists on both platforms does not always behave identically. This page collects the cases where **Marketing Cloud Next** behaviour contradicts the documentation, or diverges from the same function on Engagement.

{% include callout.html type="note" title="No SSJS on Next" content="Server-Side JavaScript is not an authoring language on Marketing Cloud Next, so SSJS runtime quirks are out of scope for this page and for the Next platform in general." %}

{% include callout.html type="tip" title="Check availability first" content="A quirk only matters here if the function is supported on Next at all. The [AMPscript and Handlebars](/next/ampscript-handlebars/) page lists the supported set and the API version each function arrived in. Engagement-specific findings live on [AMPscript Differs from Official Docs (Engagement)](/engagement/differs-from-docs/)." %}

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

{% include differs-from-docs-list.html entries=site.data.differs_from_docs_next empty="No Marketing Cloud Next discrepancies have been recorded yet. Findings are added here as the AMPscript verification sweep proves them on Next." %}
