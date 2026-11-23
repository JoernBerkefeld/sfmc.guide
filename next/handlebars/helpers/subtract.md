---
layout: page
title: "Handlebars subtract"
description: "Handlebars subtract: returns the difference of subtracting the second value from the first."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/subtract/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "Whole numbers work: `{{subtract 5 3}}` gives `2`. `{{subtract 1.5 2.25}}` breaks the email preview (HTTP 500) instead of giving the documented `-0.75`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns the difference of subtracting the second value from the first.

## Syntax

```sfmc
{{subtract value1 value2}}
```

Returns `number`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | number | Yes | The value to subtract from. |
| `value2` | number | Yes | The value to subtract. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{subtract 5 3}}` renders `2`, as documented.
- `{{subtract 1.5 2.25}}` breaks the email preview (HTTP 500). The documented result is `-0.75`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--subtract" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--subtract" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference says `subtract` handles decimals as well as whole numbers and rounds the difference to two decimal places. In Marketing Cloud Next (tested 2026-11-22): `{{subtract 1.5 2.25}}` let the email save and publish, but the preview then failed with HTTP 500 and no message instead of rendering `-0.75`. Whole numbers work: `{{subtract 5 3}}` rendered `2`. [Details](/next/differs-from-docs/#hb-subtract-decimals-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Subtract`](/next/ampscript/functions/subtract/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-subtract.html)
