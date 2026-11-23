---
layout: page
title: "Handlebars filter"
description: "Handlebars filter: keeps only the list items that pass a field/operator/value test."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/filter/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper. This happens even when the call sits in a branch that never runs."
verification: verified
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

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{filter myList "name" "x"}}{{/if}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

## Differs from official docs

{% raw %}
- The reference documents `filter` as a Marketing Cloud Next helper, available since the Winter '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#if false}}{{filter myList "name" "x"}}{{/if}}` could not be saved: the CMS answered HTTP 400 and named `filter` as an unsupported handlebars helper. The check runs at save time, so the call is rejected even inside a branch that never runs. [Details](/next/differs-from-docs/#hb-filter-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-filter.html)
