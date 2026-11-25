---
layout: page
title: "Handlebars map"
description: "Handlebars map: returns a list with the value of one field from each object in a list."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/map/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Rendered as documented on a list of rows built in AMPscript."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns a list with the value of one field from each object in a list.

## Syntax

```sfmc
{{map list fieldName}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | List of objects to read. |
| `fieldName` | string | Yes | Field to read from each object. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-22 and 2026-11-25:

- `{{#if false}}{{map myList "name"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- With a list of two rows built in AMPscript (`%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21}]', '$[*]', 1) ]%%`), `{{#each (map rows "age")}}[{{this}}]{{/each}}` renders `[27][21]`.
- `{{map rows "name"}}` on the same rows renders `[Bob, Ann]`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--map" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-map.html)
