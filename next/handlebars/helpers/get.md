---
layout: page
title: "Handlebars get"
description: "Handlebars get: reads one value from a list by index or from a map by key."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/get/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Reading a key from an object and an index from a list rendered as documented."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Reads one value from a list by index or from a map by key.

## Syntax

```sfmc
{{get collection indexOrKey}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `collection` | any | Yes | List or map to read from. |
| `indexOrKey` | any | Yes | The list index or the map key to retrieve. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-22 and 2026-11-25:

- `{{get (hash color="yellow") "color"}}` renders `yellow`, as documented.
- With a list of two rows built in AMPscript (`%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21}]', '$[*]', 1) ]%%`), `{{get (get rows 1) "name"}}` renders `Ann`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--get" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Field`](/next/ampscript/functions/field/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `Row`](/next/ampscript/functions/row/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-get.html)
