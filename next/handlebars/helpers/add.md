---
layout: page
title: "Handlebars add"
description: "Handlebars add: returns the sum of two numbers, rounded to 2 decimal places."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/add/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "Whole numbers work: `{{add 2 3}}` gives `5`. A decimal passed as a string, `{{add \"1.5\" 2.25}}`, breaks the email preview (HTTP 500) instead of giving the documented `3.75`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns the sum of two numbers, rounded to 2 decimal places.

## Syntax

```sfmc
{{add value1 value2}}
```

Returns `number`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | number | Yes | First value to add. |
| `value2` | number | Yes | Second value to add. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{add 2 3}}` renders `5`, as documented.
- `{{add "1.5" 2.25}}` breaks the email preview (HTTP 500). The documented result is `3.75`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--add" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--add" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference says `add` accepts numbers or strings that convert to numbers, handles decimals, and rounds the sum to two decimal places. In Marketing Cloud Next (tested 2026-11-22): `{{add "1.5" 2.25}}` let the email save and publish, but the preview then failed with HTTP 500 and no message instead of rendering `3.75`. Whole numbers work: `{{add 2 3}}` rendered `5`. [Details](/next/differs-from-docs/#hb-add-decimal-string-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Add`](/next/ampscript/functions/add/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-add.html)
