---
layout: page
title: "Handlebars repeat"
description: "Handlebars repeat: repeats a block a specified number of times, exposing index, first, and last loop variables."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/repeat/
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
Repeats a block a specified number of times, exposing index, first, and last loop variables.

## Syntax

```sfmc
{{#repeat count}}
  …
{{/repeat}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `count` | integer | Yes | How many times to render the block. Must be a non-negative integer. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#repeat 3}}x{{/repeat}}` renders `xxx`, as documented.
- `{{#repeat 3}}{{index}}{{/repeat}}` renders `012`, as documented.
- `{{#repeat 0}}x{{/repeat}}` renders an empty string, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--repeat" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-repeat.html)
