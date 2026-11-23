---
layout: page
title: "Handlebars base64Encode"
description: "Handlebars base64Encode: turns readable text into a Base64 string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/base64encode/
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
Turns readable text into a Base64 string.

## Syntax

```sfmc
{{base64Encode text [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The text to encode. |
| `options` | any | No, repeatable | Named argument characterEncoding: ASCII, UTF-7, UTF-8, UTF-16 or UTF-32. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{base64Encode "abc"}}` renders `YWJj`, as documented.
- `{{base64Encode "abc" characterEncoding="UTF-16"}}` renders `YQBiAGMA`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--base64encode" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Base64Encode`](/next/ampscript/functions/base64encode/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-base64encode.html)
