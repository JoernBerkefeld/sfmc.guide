---
layout: page
title: "Handlebars unless"
description: "Handlebars unless: renders its block only when the value counts as false."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/unless/
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
Renders its block only when the value counts as false.

## Syntax

```sfmc
{{#unless condition}}
  …
{{/unless}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `condition` | any | Yes | Value to test. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#unless false}}yes{{else}}no{{/unless}}` renders `yes`, as documented.
- `{{#unless "x"}}yes{{else}}no{{/unless}}` renders `no`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--unless" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-unless.html)
