---
layout: page
title: "Handlebars formatNumber"
description: "Handlebars formatNumber: formats a number as one numeric type, for example decimal or percent."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/formatnumber/
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
Formats a number as one numeric type, for example decimal or percent.

## Syntax

```sfmc
{{formatNumber number formatType [cultureCode]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number` | number | Yes | Input number. |
| `formatType` | string | Yes | Number format type: C, D, E, F, G, N, P, R, or X. |
| `cultureCode` | string | No | Locale code. Defaults to en_US. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{formatNumber 1234.567 "C2"}}` renders `$1,234.57`, as documented.
- `{{formatNumber 1234.567 "F"}}` renders `1234.57`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--formatnumber" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `FormatNumber`](/next/ampscript/functions/formatnumber/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-formatnumber.html)
