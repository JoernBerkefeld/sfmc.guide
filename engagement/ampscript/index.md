---
layout: page
title: "AMPscript Guide: Syntax, Examples & Functions"
description: "Learn AMPscript for Marketing Cloud Engagement with a beginner path, function examples, Data Extension lookup guidance, date formatting, and tracked email links."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript/
platforms:
  - engagement
---

AMPscript is a server-side scripting language for personalizing content in Salesforce Marketing Cloud Engagement. Use it to work with contextual values, look up Data Extension data, and choose what content to display. This guide gives you a starting path through the language and routes to function examples and practical authoring tips.

This page focuses on **Marketing Cloud Engagement**. Working in Marketing Cloud Next? Use the separate [Next AMPscript reference](/next/ampscript/functions/) to check that platform's support rather than assuming the same functions and behavior apply.

{% include callout.html type="tip" title="Looking for a specific function?" content="This page collects general AMPscript authoring guidance. For per-function reference pages — signature, argument handling, edge cases, and the test script behind each claim — see the [AMPscript function reference](/engagement/ampscript/functions/)." %}

## A beginner learning path

Learn the building blocks in this order. The language links below lead to the existing community reference; function links lead to examples on this site.

1. **Recognize the syntax.** Start with [AMPscript syntax](https://ampscript.guide/language-syntax/), then compare [script blocks](https://ampscript.guide/ampscript-blocks/) with [inline expressions](https://ampscript.guide/inline-ampscript/). Blocks group statements; inline expressions place a function's result in the content.
2. **Store a value and display it.** Read about [declaring variables](https://ampscript.guide/declaring-variables/) and [setting variables](https://ampscript.guide/setting-variables/), then try the small example on the [v function page](/engagement/ampscript/functions/v/). This separates assigning a value from displaying it.
3. **Choose between content branches.** Follow [conditional statements](https://ampscript.guide/statements/) for `IF`, `ELSE`, and `ENDIF`. Use the [Empty reference](/engagement/ampscript/functions/empty/) to understand empty-value checks before choosing fallback content.
4. **Repeat a block.** Read [process loops](https://ampscript.guide/process-loops/) for `FOR` and `NEXT`. Then explore the [LookupRows examples](/engagement/ampscript/functions/lookuprows/) when you are ready to work with multiple matching Data Extension rows.

## Find a function for your task

- **Personalization:** begin with [AttributeValue](/engagement/ampscript/functions/attributevalue/) to read a contextual value, [Empty](/engagement/ampscript/functions/empty/) to check whether it is empty, and [v](/engagement/ampscript/functions/v/) to display a value. The AttributeValue page explains why a CloudPage and an email send do not have the same subscriber context.
- **Data Extension lookups:** use the [lookup family overview](#data-extension-lookups) below to choose a single-value, rowset, or sorted-rowset reference.
- **Date formatting:** see [FormatDate](/engagement/ampscript/functions/formatdate/) for date and time patterns and locale options.
- **Tracked email links:** follow [dynamic trackable links](#dynamic-trackable-links) and the RedirectTo reference when your destination URL comes from a variable.

## Read the runtime evidence

The [AMPscript function reference](/engagement/ampscript/functions/) distinguishes catalog entries from functions marked **Verified**. Verified pages describe observed behavior from live Engagement CloudPage tests and include the supporting examples or test scripts. A catalog entry alone is not runtime evidence; read each page's context and limitations before applying a result to your own content.

## Practical authoring tips

{% include callout.html type="note" title="Originally published" content="First published **2019-03-03** in the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/ampscript/). Ported here for sfmc.guide." %}

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

The AMPscript `Lookup` family is documented individually, each with its own reference page:

- [Lookup](/engagement/ampscript/functions/lookup/) — single field of the first matching row, case-insensitive
- [LookupRows](/engagement/ampscript/functions/lookuprows/) — full rows, case-insensitive
- [LookupRowsCS](/engagement/ampscript/functions/lookuprowscs/) — full rows, case-sensitive
- [LookupOrderedRows](/engagement/ampscript/functions/lookuporderedrows/) — sorted full rows, case-insensitive
- [LookupOrderedRowsCS](/engagement/ampscript/functions/lookuporderedrowscs/) — sorted full rows, case-sensitive

## Dynamic trackable links

Building link URLs from variables has a tracking pitfall — use `RedirectTo` rather than a hand-built `<a>` tag. See [RedirectTo](/engagement/ampscript/functions/redirectto/#dynamic-trackable-links).

## Other resources

- [ampscript.guide](https://ampscript.guide/) — community AMPscript function reference
