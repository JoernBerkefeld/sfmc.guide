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
mcn_tested: 2026-11-26
mcn_note: "The documented call form fails the email preview with HTTP 500 on a list of objects built in AMPscript, and on a list built with `jsonpath`, although `each`, `sort` and `map` read the same lists. On a related DMO list of the bound data graph it breaks the whole preview too."
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
- `{{#each (filter (jsonpath '[{"name":"Bob","age":27},{"name":"Ann","age":21}]' "$") "age" ">" 22 "number")}}[{{name}}]{{/each}}` also fails the preview with HTTP 500, as do a string comparison (`"name" "==" "Ann" "string"`) and the documented chain `map (filter …) "name"`. The same `jsonpath` list renders with `each`.
- `{{#if false}}{{filter myList "age" ">" 25 "number"}}{{/if}}` is accepted when the email is saved.

Tested on 2026-11-26 on a related DMO list of the data graph bound to the email, in the Email Builder preview with a profile:

- `{{#each (filter (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm") "ssot__DataSourceObjectId__c" "==" "Contact" "string")}}{{SourceRecordId__c}};{{/each}}` saves, but the preview shows an error for the whole email instead of the matching row. `each`, `sort`, `slice` and `length` read the same list.
- The same call without `filterAs` is rejected when the email is saved (HTTP 400: a required parameter of `filter` is missing). The reference marks `filterAs` as required, so this matches the docs.
- Instead of `filter`, test each row inside the loop: `{{#each (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm")}}{{#if (compare ssot__DataSourceObjectId__c "==" "Contact")}}{{SourceRecordId__c}};{{/if}}{{/each}}` renders the contact row. See [Querying Data in Next](/next/querying-data/#related-dmo-rows-of-the-graph).
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--filter" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--filter" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference shows `{{filter myList "age" ">" 25 "number"}}` returning the matching objects. In Marketing Cloud Next (tested 2026-11-25): the same call form on a list of objects built with AMPscript `BuildRowsetFromJSON` failed the email preview with HTTP 500, although `each` and `sort` read that list. Lists built with `jsonpath` and related DMO lists of the bound data graph (tested 2026-11-26) fail the same way. [Details](/next/differs-from-docs/#hb-filter-preview-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-filter.html)
