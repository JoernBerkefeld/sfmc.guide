---
layout: page
title: "Handlebars base64Decode"
description: "Handlebars base64Decode: turns a Base64 string back into readable text."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/base64decode/
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
Turns a Base64 string back into readable text.

## Syntax

```sfmc
{{base64Decode encoded [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `encoded` | string | Yes | The Base64 text to decode. |
| `options` | any | No, repeatable | Named arguments: characterEncoding (ASCII, UTF-7, UTF-8, UTF-16 or UTF-32) and abortSendOnFail (true stops the send when decoding fails; false yields an empty string instead). |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{base64Decode "YWJj"}}` renders `abc`, as documented.
- `{{base64Decode "@@@@" abortSendOnFail=false}}` renders an empty string, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--base64decode" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Base64Decode`](/next/ampscript/functions/base64decode/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-base64decode.html)
