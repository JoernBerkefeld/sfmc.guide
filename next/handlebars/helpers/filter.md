---
layout: page
title: "Handlebars filter"
description: "Handlebars filter: keeps only the list items that pass a field/operator/value test."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/filter/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-25
mcn_note: "The documented call form fails the email preview with HTTP 500 on a list of objects built in AMPscript, although `each` and `sort` read the same list. Other list sources are untested."
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

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email, with a list of objects built in AMPscript (Handlebars reads it as variable `rows`):

- `%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21},{"name":"Cid","age":24}]', '$[*]', 1) ]%%{{#each (filter rows "age" ">" 22 "number")}}[{{name}}]{{/each}}` fails the email preview with HTTP 500. The documented result is `[Bob][Cid]`. The same `rows` render with `each` and with `sort`.
- `{{#if false}}{{filter myList "age" ">" 25 "number"}}{{/if}}` is accepted when the email is saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--filter" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--filter" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference shows `{{filter myList "age" ">" 25 "number"}}` returning the matching objects. In Marketing Cloud Next (tested 2026-11-25): the same call form on a list of objects built with AMPscript `BuildRowsetFromJSON` failed the email preview with HTTP 500, although `each` and `sort` read that list. Lists from other sources were not tried. [Details](/next/differs-from-docs/#hb-filter-preview-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-filter.html)
