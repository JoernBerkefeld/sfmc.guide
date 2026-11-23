---
layout: page
title: "Handlebars divide"
description: "Handlebars divide: returns the quotient of dividing the first value by the second."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/divide/
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
Returns the quotient of dividing the first value by the second.

## Syntax

```sfmc
{{divide dividend divisor}}
```

Returns `number`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dividend` | number | Yes | Number to divide. |
| `divisor` | number | Yes | Value to divide by; cannot be 0. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{divide 10 4}}` renders `2.5`, as documented.
- `{{divide 10 3}}` renders `3.33`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--divide" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Divide`](/next/ampscript/functions/divide/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-divide.html)
