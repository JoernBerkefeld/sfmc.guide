---
layout: page
title: "Handlebars buildRowSetFromString"
description: "Handlebars buildRowSetFromString: splits a string at a delimiter into a rowset with a single unnamed column, one row per value."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/buildrowsetfromstring/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "Every tested call rendered the documented result."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Splits a string at a delimiter into a rowset with a single unnamed column, one row per value.

## Syntax

```sfmc
{{buildRowSetFromString text delimiter}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The string to split. |
| `delimiter` | string | Yes | The text that separates values. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{length (buildRowSetFromString "a|b|c" "|")}}` renders `3`, as documented.
- `{{#each (buildRowSetFromString "x|y" "|")}}{{@index}}{{/each}}` renders `01`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--buildrowsetfromstring" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-buildrowsetfromstring.html)
