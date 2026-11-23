---
layout: page
title: "Handlebars uppercase"
description: "Handlebars uppercase: changes every letter in a string to uppercase."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/uppercase/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "With double braces every tested call rendered as documented. With triple braces, `{{{uppercase \"<i>a</i>\"}}}` renders the name of an internal Java object (`com.salesforce…HandlebarResultWrapper@…`) instead of the text."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Changes every letter in a string to uppercase.

## Syntax

```sfmc
{{uppercase subject [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to uppercase. |
| `culture` | string | No | Locale code (for example `tr-TR`) whose letter-case rules apply. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{uppercase "mcn"}}` renders `MCN`, as documented.
- `{{uppercase "<i>a</i>"}}` renders `<I>A</I>`.
- `{{{uppercase "<i>a</i>"}}}` renders `com.salesforce.e360.messaging.rendering.helper.HandlebarResultWrapper@451c8ea0`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--uppercase" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference does not say that the helper cannot be used with triple braces, the usual Handlebars way to output a value without HTML escaping. In Marketing Cloud Next (tested 2026-11-22): `{{{uppercase "<i>a</i>"}}}` rendered `com.salesforce.e360.messaging.rendering.helper.HandlebarResultWrapper@451c8ea0` instead of the text. With double braces the helper works: `{{uppercase "mcn"}}` rendered `MCN`. [Details](/next/differs-from-docs/#hb-uppercase-triple-brace-object-name)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Uppercase`](/next/ampscript/functions/uppercase/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-uppercase.html)
