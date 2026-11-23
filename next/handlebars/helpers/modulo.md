---
layout: page
title: "Handlebars modulo"
description: "Handlebars modulo: returns the remainder after dividing the first value by the second."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/modulo/
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
Returns the remainder after dividing the first value by the second.

## Syntax

```sfmc
{{modulo value1 value2}}
```

Returns `number`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | number | Yes | The dividend. |
| `value2` | number | Yes | The divisor. Cannot be 0. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{modulo 10 3}}` renders `1`, as documented.
- `{{modulo 7.5 2}}` renders `1.5`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--modulo" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Mod`](/next/ampscript/functions/mod/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-modulo.html)
