---
layout: page
title: "Handlebars or"
description: "Handlebars or: returns true when at least one operand is truthy."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/or/
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
Returns true when at least one operand is truthy.

## Syntax

```sfmc
{{or value1 [value2] [...valueN]}}
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

- `{{or false 0 "x"}}` renders `true`, as documented.
- `{{or false ""}}` renders `false`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--or" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-or.html)
