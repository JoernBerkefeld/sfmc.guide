---
layout: page
title: "Handlebars concat"
description: "Handlebars concat: joins several values into one string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/concat/
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
Joins several values into one string. Null values are skipped.

## Syntax

```sfmc
{{concat value1 [value2] [...valueN]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value1` | any | Yes | First value to concatenate. |
| `value2` | any | No | Second value. |
| `valueN` | any | No, repeatable | More values to join. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{concat "ab" "cd"}}` renders `abcd`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--concat" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Concat`](/next/ampscript/functions/concat/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-concat.html)
