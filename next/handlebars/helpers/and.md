---
layout: page
title: "Handlebars and"
description: "Handlebars and: returns true only when all operands are truthy."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/and/
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
Returns true only when all operands are truthy.

## Syntax

```sfmc
{{and value1 [value2] [...valueN]}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | any | Yes | First operand. |
| `value2` | any | No | Second operand. |
| `valueN` | any | No, repeatable | More operands. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{and true false}}` renders `false`, as documented.
- `{{and true "x" 1}}` renders `true`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--and" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-and.html)
