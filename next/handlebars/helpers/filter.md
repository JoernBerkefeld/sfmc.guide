---
layout: page
title: "Handlebars filter"
description: "Handlebars filter: keeps only the list items that pass a field/operator/value test."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/filter/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-25
mcn_note: "Accepted when the email is saved. Not rendered yet: the documented examples build their list with `jsonPath`, which Next rejects."
verification: in-progress
test_scripts: complete
---

{% include verification-status.html %}

{% raw %}
Keeps only the list items that pass a field/operator/value test.

## Syntax

```sfmc
{{filter list fieldName comparisonOperator targetValue filterAs}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | List of objects to check. |
| `fieldName` | string | Yes | Name of the field to compare. |
| `comparisonOperator` | string | Yes | Comparison operator (e.g. >, ==, CONTAINS). |
| `targetValue` | any | Yes | Value the field is compared with. |
| `filterAs` | string | Yes | The type to filter as: string, number, or date. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{#if false}}{{filter myList "age" ">" 25 "number"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--filter" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-filter.html)
