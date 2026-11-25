---
layout: page
title: "Handlebars sort"
description: "Handlebars sort: sorts a list of objects by a field, order, and type."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/sort/
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
Sorts a list of objects by a field, order, and type.

## Syntax

```sfmc
{{sort list fieldName sortOrder sortAs}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | List of objects to order. |
| `fieldName` | string | Yes | Field to order by. |
| `sortOrder` | string | Yes | Sort order: asc or desc. |
| `sortAs` | string | Yes | Type to sort as: string, number, date, or boolean. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{#if false}}{{sort myList "age" "asc" "number"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--sort" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-sort.html)
