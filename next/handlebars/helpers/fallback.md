---
layout: page
title: "Handlebars fallback"
description: "Handlebars fallback: returns a fallback value when the first argument is null, empty, or throws an exception."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/fallback/
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
Returns a fallback value when the first argument is null, empty, or throws an exception.

## Syntax

```sfmc
{{fallback value fallbackValue}}

{{#fallback value fallbackValue}}
  …
{{/fallback}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | any | Yes | The value to try first. |
| `fallbackValue` | primitive | Yes | Static value returned when the first value is null or fails. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{fallback missingVar "fb"}}` renders `fb`, as documented.
- `{{fallback "" "fb"}}` renders `fb`, as documented.
- `{{fallback (divide 1 0) "err"}}` renders `err`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--fallback" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-fallback.html)
