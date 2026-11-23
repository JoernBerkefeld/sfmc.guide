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
mcn_tested: 2026-11-22
mcn_note: "Looping over an object rendered as documented. Looping over a list was not tried: building the list needs `jsonPath`, and an email with `jsonPath` cannot be saved."
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

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#each (hash a="1" b="2")}}{{@key}}={{this}};{{/each}}` renders `a=1;b=2;`, as documented.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--each" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-each.html)
