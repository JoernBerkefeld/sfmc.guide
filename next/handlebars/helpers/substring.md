---
layout: page
title: "Handlebars substring"
description: "Handlebars substring: returns part of a string, counting positions from 1."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/substring/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "With double braces every tested call rendered as documented. With triple braces, `{{{substring \"<i>abc</i>\" 1 6}}}` renders the name of an internal Java object (`com.salesforce…HandlebarResultWrapper@…`) instead of the text."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns part of a string, counting positions from 1.

## Syntax

```sfmc
{{substring subject start [length]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | Source string. |
| `start` | integer | Yes | Starting position. Position 1 is the first character. |
| `length` | integer | No | Number of characters to extract. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{substring "abcdef" 2 3}}` renders `bcd`, as documented.
- `{{{substring "<i>abc</i>" 1 6}}}` renders `com.salesforce.e360.messaging.rendering.helper.HandlebarResultWrapper@539b5bf2`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--substring" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference does not say that the helper cannot be used with triple braces, the usual Handlebars way to output a value without HTML escaping. In Marketing Cloud Next (tested 2026-11-22): `{{{substring "<i>abc</i>" 1 6}}}` rendered `com.salesforce.e360.messaging.rendering.helper.HandlebarResultWrapper@539b5bf2` instead of the text. With double braces the helper works: `{{substring "abcdef" 2 3}}` rendered `bcd`. [Details](/next/differs-from-docs/#hb-substring-triple-brace-object-name)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Substring`](/next/ampscript/functions/substring/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-substring.html)
