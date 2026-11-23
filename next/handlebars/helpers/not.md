---
layout: page
title: "Handlebars not"
description: "Handlebars not: returns true when the operand evaluates to false."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/not/
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
Returns true when the operand evaluates to false.

## Syntax

```sfmc
{{not value}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | any | Yes | The operand to negate. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{not true}}` renders `false`, as documented.
- `{{not ""}}` renders `true`, as documented.
- `{{not}}` renders `true`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--not" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-not.html)
