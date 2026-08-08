---
layout: page
title: "AMPscript and Handlebars on Marketing Cloud Next"
description: "Which AMPscript functions are supported in Marketing Cloud Next, how they map to Handlebars helpers, and which helpers have no AMPscript counterpart."
parent: Next
parent_url: /next/
permalink: /next/ampscript-handlebars/
platforms:
  - next
---

Marketing Cloud Next supports a **subset** of Engagement AMPscript and a parallel **Handlebars** helper surface. This page is an architect-oriented overview built from the same catalogs that power the SFMC Language Service and ESLint rules.

{% include callout.html type="note" title="Source of truth" content="AMPscript support and the Handlebars mapping come from the AMPscript catalog; the helpers come from the Handlebars catalog. Both tables are rendered from generated data, so they follow the catalogs automatically." %}

## Syntax at a glance

Handlebars helpers, Marketing Cloud Next bindings and AMPscript can all appear in the same template. Documented helpers and functions are highlighted differently from names the catalogs do not know:

{% raw %}

```sfmc
{{#if isMember}}
  {{formatCurrency total "EUR"}} — {{myUnknownHelper total}}
{{else}}
  {{fallback firstName "there"}}
{{/if}}

<a href="{!$link.PreferenceCenterUrl}">Manage preferences</a>

%%[ SET @greeting = Concat("Hello ", @firstName) ]%%
%%=v(@greeting)=%%
```

{% endraw %}

## AMPscript supported in Marketing Cloud Next

**API version** is the Marketing Cloud Next Core API version the function became available in. The **Handlebars** column names the helper that covers the same job, where one exists.

{% include ampscript-function-index.html entries=site.data.ampscript_functions
   mcn_only=true show_mcn=true show_handlebars=true
   empty="No Marketing Cloud Next AMPscript functions catalogued yet." %}

## Handlebars helpers without an AMPscript counterpart

These helpers are the reason a Next template cannot always be expressed as AMPscript — nothing in the AMPscript catalog maps onto them.

{% include handlebars-helper-index.html entries=site.data.handlebars_helpers
   unmapped_only=true
   empty="Every catalogued Handlebars helper has an AMPscript counterpart." %}

## See also

- [Next overview](/next/)
- [AMPscript function reference (Next)](/next/ampscript/functions/) — the same subset on its own page
- [Handlebars helper reference](/next/handlebars/helpers/) — the full helper catalog, not just the unmapped ones
- [ampscript.guide](https://ampscript.guide)
- [SFMC Language Service](/tools/vscode-sfmc-language/)
