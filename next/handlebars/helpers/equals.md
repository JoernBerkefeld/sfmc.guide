---
layout: page
title: "Handlebars equals"
description: "Handlebars equals: compares two values for equality, optionally by a comparison type."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/equals/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "`{{equals \"a\" \"a\"}}` gives `true`. Comparing as numbers does not work as documented: `{{equals \"5.0\" 5 \"number\"}}` renders `false` instead of `true`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Compares two values for equality, optionally by a comparison type.

## Syntax

```sfmc
{{equals value1 value2 [compareAs]}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | any | Yes | First value to compare. |
| `value2` | any | Yes | Second value to compare. |
| `compareAs` | string | No | Comparison type: date, datetime, number, or string. Defaults to string. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{equals "a" "a"}}` renders `true`, as documented.
- `{{equals "5.0" 5 "number"}}` renders `false`. The documented result is `true`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--equals" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference says the optional third argument picks the comparison type, and `number` compares the two values as numbers. In Marketing Cloud Next (tested 2026-11-22): `{{equals "5.0" 5 "number"}}` rendered `false`, although both values are the number 5. A plain string comparison, `{{equals "a" "a"}}`, rendered `true`. [Details](/next/differs-from-docs/#hb-equals-number-compare-false)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-equals.html)
