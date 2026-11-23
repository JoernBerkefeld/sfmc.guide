---
layout: page
title: "Handlebars stringToHex"
description: "Handlebars stringToHex: returns the hexadecimal representation of the encoded characters of a string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/stringtohex/
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
Returns the hexadecimal representation of the encoded characters of a string.

## Syntax

```sfmc
{{stringToHex subject [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to encode as hex. |
| `options` | any | No, repeatable | Named argument charSet: UTF-8 (default) or UTF-16. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{stringToHex "abc"}}` renders `616263`, as documented.
- `{{stringToHex "abc" charSet="UTF-16"}}` renders `610062006300`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--stringtohex" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `StringToHex`](/next/ampscript/functions/stringtohex/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-stringtohex.html)
