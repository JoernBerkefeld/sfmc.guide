---
layout: page
title: "Handlebars iif"
description: "Handlebars iif: picks one of two values, depending on whether an expression is true or false."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/iif/
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
Picks one of two values, depending on whether an expression is true or false.

## Syntax

```sfmc
{{iif expression leftResult rightResult}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `expression` | any | Yes | Condition to test. |
| `leftResult` | any | Yes | Value returned when the expression is true. |
| `rightResult` | any | Yes | Value returned when the expression is false. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{iif true "y" "n"}}` renders `y`, as documented.
- `{{iif 0 "y" "n"}}` renders `n`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--iif" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `IIf`](/next/ampscript/functions/iif/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-iif.html)
