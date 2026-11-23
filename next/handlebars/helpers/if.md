---
layout: page
title: "Handlebars if"
description: "Handlebars if: renders its block only when the value counts as true."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/if/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "Every tested call rendered the documented result."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Renders its block only when the value counts as true.

## Syntax

```sfmc
{{#if condition}}
  …
{{/if}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `condition` | any | Yes | Value to test. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if true}}yes{{else}}no{{/if}}` renders `yes`, as documented.
- `{{#if ""}}yes{{else}}no{{/if}}` renders `no`, as documented.
- `{{#if false}}a{{else if true}}b{{else}}c{{/if}}` renders `b`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--if" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-if.html)
