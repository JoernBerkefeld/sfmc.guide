---
layout: page
title: "AMPscript and Handlebars Differs from Official Docs (Next)"
description: "Where AMPscript functions and Handlebars helpers in Marketing Cloud Next behave differently from what the official documentation says for Next, proven by rendering them in a Next email: contradictions, unsupported helpers and behaviour the docs do not mention."
parent: Next
parent_url: /next/
permalink: /next/differs-from-docs/
platforms:
  - next
---

The official AMPscript reference and the Handlebars reference for Marketing Cloud Next are not always right. For Next, "what the docs say" is the generic AMPscript reference page together with its Next-specific parts: the Availability row for Next, the sections on differences between Engagement and Next, and any sentence that starts with "In Marketing Cloud Next". This page collects every case where a **Marketing Cloud Next** email rendered something else, or where it showed notable behaviour the docs do not mention. Each finding was proven by rendering the call in a Next email through the preview API. How Next compares with Engagement is not listed here; each function page covers that in its own Engagement section.

{% include callout.html type="note" title="No SSJS on Next" content="Server-Side JavaScript is not an authoring language on Marketing Cloud Next, so SSJS runtime quirks are out of scope for this page and for the Next platform in general." %}

{% include callout.html type="tip" title="Function and helper pages" content="The [AMPscript function reference (Next)](/next/ampscript/functions/) and the [Handlebars helper reference](/next/handlebars/helpers/) list every function and helper, each with its own page. Engagement-specific findings live on [AMPscript Differs from Official Docs (Engagement)](/engagement/differs-from-docs/)." %}

## How to read an entry

Each finding is a card with a severity (high / medium / low), a discrepancy-type code, the affected function category, a description of what the docs claim versus what actually happens, and — where one exists — a snippet that reproduces it, plus a link to the official page the finding is measured against.

| Code | Discrepancy type |
|---|---|
| A1 | Wrong return type |
| A2 | Null / empty result on absence |
| A3 | Wrong argument count or optionality |
| A4 | Wrong, renamed, or relocated members |
| A5 | Notable behaviour the docs do not mention |
| A6 | Availability differs (documented but rejected, or documented as unavailable but works) |
| A7 | Encoding, format, or validation semantics |

## Findings

{% include differs-from-docs-list.html entries=site.data.differs_from_docs_next empty="No Marketing Cloud Next discrepancies have been recorded yet. Findings are added here as they are documented for Next." %}
