---
layout: page
title: "Handlebars sort"
description: "Handlebars sort: sorts a list of objects by a field, order, and type."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/sort/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-26
mcn_note: "Sorting a list of objects renders the documented result."
verification: verified
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

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email, with a list of objects built in AMPscript (Handlebars reads it as variable `rows`):

- `%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21},{"name":"Cid","age":24}]', '$[*]', 1) ]%%{{#each (sort rows "age" "asc" "number")}}[{{name}}]{{/each}}` renders `[Ann][Cid][Bob]`, as documented.
- A list of plain strings with an empty field name, `{{sort (buildRowSetFromString "b|a|c" "|") "" "asc" "string"}}`, fails the email preview with HTTP 500. The docs describe lists of objects only.
- On a related DMO list of the data graph bound to the email (2026-11-26, Email Builder preview), `{{#each (sort (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm") "SourceRecordId__c" "desc" "string")}}{{SourceRecordId__c}};{{/each}}` lists the rows in descending order of the field. Wrapped in `slice`, it gives the first rows after sorting; see [Querying Data in Next](/next/querying-data/#related-dmo-rows-of-the-graph). Sorting by a field the graph does not hold, or with type `"number"` on a text field, makes the whole email fail in the preview ("We can't show this content right now").
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--sort" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--sort" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-sort.html)
