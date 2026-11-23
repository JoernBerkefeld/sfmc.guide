---
layout: page
title: "Handlebars multiply"
description: "Handlebars multiply: returns the product of two numbers, rounded to 2 decimal places."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/multiply/
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
Returns the product of two numbers, rounded to 2 decimal places.

## Syntax

```sfmc
{{multiply value1 value2}}
```

Returns `number`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | number | Yes | First value to multiply. |
| `value2` | number | Yes | Second value to multiply. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{multiply 2 3}}` renders `6`, as documented.
- `{{multiply 1.25 3}}` renders `3.75`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--multiply" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Multiply`](/next/ampscript/functions/multiply/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-multiply.html)
