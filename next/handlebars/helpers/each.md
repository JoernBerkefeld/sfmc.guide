---
layout: page
title: "Handlebars each"
description: "Handlebars each: renders its block once for every item in an array, list or object."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/each/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Looping over an object or a list rendered as documented. Rows built in AMPscript and arrays from `jsonpath` both work as lists."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Renders its block once for every item in an array, list or object.

## Syntax

```sfmc
{{#each collection}}
  …
{{/each}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `collection` | array | Yes | The array, list or object to loop over. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-22 and 2026-11-25:

- `{{#each (hash a="1" b="2")}}{{@key}}={{this}};{{/each}}` renders `a=1;b=2;`, as documented.
- With a list of two rows built in AMPscript (`%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21}]', '$[*]', 1) ]%%`), `{{#each rows}}{{@index}}={{name}};{{/each}}` renders `0=Bob;1=Ann;`.
- `{{#each (jsonpath '[1,2,3]' "$")}}[{{this}}]{{/each}}` renders `[1][2][3]`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--each" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-each.html)
