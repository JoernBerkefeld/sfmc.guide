---
layout: page
title: "AMPscript"
description: "Engagement AMPscript guidance from the SFMC Cookbook."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript/
platforms:
  - engagement
---

{% include callout.html type="note" title="Originally published" content="First published **2019-03-03** in the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/ampscript/). Ported here for sfmc.guide." %}

{% include callout.html type="tip" title="Looking for a specific function?" content="This page collects general AMPscript authoring guidance. For per-function reference pages proven against a live CloudPage — signature, argument handling, edge cases, and the test script behind each claim — see the [AMPscript function reference](/engagement/ampscript/functions/)." %}

## Hide your code

When AMPscript is inserted into either an email or a CloudPage it usually clutters up the preview window with code. To avoid this, wrap your code in something that will not render:

```ampscript
<div style="display:none">
%%[
// your code here
]%%
</div>
```

Why not something that does not render out of the box, like `<script>...</script>` or `<style>...</style>`? SFMC strips every `<script>` tag out of emails without warning. Both tags might also trigger reformatting that silently breaks your code.

_Why?_ Non-developers just get distracted by the code.

_Why?_ Showing lots of code during a demo in the preview window distracts from the actual email content and costs you time explaining it again and again.

_Why?_ Hiding the code shrinks the content block to its minimum height, making the right block easier to select because scrolling happens less often.

## Data Extension lookups

The AMPscript `Lookup` family is documented individually, each proven against a live CloudPage:

- [Lookup](/engagement/ampscript/functions/lookup/) — single field of the first matching row, case-insensitive
- [LookupRows](/engagement/ampscript/functions/lookuprows/) — full rows, case-insensitive
- [LookupRowsCS](/engagement/ampscript/functions/lookuprowscs/) — full rows, case-sensitive
- [LookupOrderedRows](/engagement/ampscript/functions/lookuporderedrows/) — sorted full rows, case-insensitive
- [LookupOrderedRowsCS](/engagement/ampscript/functions/lookuporderedrowscs/) — sorted full rows, case-sensitive

## Dynamic trackable links

Building link URLs from variables has a tracking pitfall — use `RedirectTo` rather than a hand-built `<a>` tag. See [RedirectTo](/engagement/ampscript/functions/redirectto/#dynamic-trackable-links).

## Other resources

- [ampscript.guide](https://ampscript.guide/) — community AMPscript function reference
