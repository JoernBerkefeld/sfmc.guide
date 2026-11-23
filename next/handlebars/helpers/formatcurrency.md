---
layout: page
title: "Handlebars formatCurrency"
description: "Handlebars formatCurrency: formats a number as a currency value for a locale."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/formatcurrency/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "`en-US` and `ja-JP` render as documented. `de-DE` renders `1.234,56 €` with a non-breaking space before the euro sign, where the documentation shows a normal space. It looks the same, but a plain text comparison fails."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Formats a number as a currency value for a locale.

## Syntax

```sfmc
{{formatCurrency number [cultureCode]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number` | number | Yes | The number to format as currency. |
| `cultureCode` | string | No | Locale code. Defaults to en_US. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{formatCurrency 1234.56 "en-US"}}` renders `$1,234.56`, as documented.
- `{{formatCurrency 1234.56 "de-DE"}}` renders `1.234,56 €`. The documented result is `1.234,56 €` (the space before `€` is a non-breaking space in the output).
- `{{formatCurrency 1234.56 "ja-JP"}}` renders `￥1,235`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--formatcurrency" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference shows the `de-DE` result as `1.234,56 €` with an ordinary space before the euro sign. In Marketing Cloud Next (tested 2026-11-22): `{{formatCurrency 1234.56 "de-DE"}}` rendered `1.234,56 €` with a non-breaking space (U+00A0) before `€`. It looks identical, but a plain text comparison against the documented value fails. `en-US` and `ja-JP` matched the docs. [Details](/next/differs-from-docs/#hb-formatcurrency-de-nbsp)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `FormatCurrency`](/next/ampscript/functions/formatcurrency/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-formatcurrency.html)
