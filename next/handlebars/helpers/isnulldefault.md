---
layout: page
title: "Handlebars isNullDefault"
description: "Handlebars isNullDefault: returns the first value, or the second one when the first is null."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/isnulldefault/
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
Returns the first value, or the second one when the first is null.

## Syntax

```sfmc
{{isNullDefault value defaultValue}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | any | Yes | The value to use when it is not null. |
| `defaultValue` | any | Yes | The replacement to use when the first value is null. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{isNullDefault "Premium" "Basic"}}` renders `Premium`, as documented.
- `{{isNullDefault missingVar "Basic"}}` renders `Basic`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--isnulldefault" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `IsNullDefault`](/next/ampscript/functions/isnulldefault/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-isnulldefault.html)
