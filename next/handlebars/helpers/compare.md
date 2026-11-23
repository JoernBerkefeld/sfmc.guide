---
layout: page
title: "Handlebars compare"
description: "Handlebars compare: checks two values against each other with the operator you pass."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/compare/
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
Checks two values against each other with the operator you pass.

## Syntax

```sfmc
{{compare leftValue operator rightValue}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `leftValue` | any | Yes | Left operand. |
| `operator` | string | Yes | One of ==, !=, >, >=, <, <=. |
| `rightValue` | any | Yes | Right operand. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{compare "5.5" ">" 3}}` renders `true`, as documented.
- `{{compare "apple" "<" "banana"}}` renders `true`, as documented.
- `{{compare "Hello" "==" "hello"}}` renders `false`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--compare" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-compare.html)
