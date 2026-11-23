---
layout: page
title: "Handlebars sha1"
description: "Handlebars sha1: returns the SHA-1 digest (160 bit) of a string as hex."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/sha1/
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
Returns the SHA-1 digest (160 bit) of a string as hex. One-way and not safe for protecting secrets.

## Syntax

```sfmc
{{sha1 text [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The text to hash. |
| `options` | any | No, repeatable | Named argument charset: UTF-8 (default) or UTF-16. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{sha1 "abc"}}` renders `a9993e364706816aba3e25717850c26c9cd0d89d`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--sha1" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `SHA1`](/next/ampscript/functions/sha1/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-encryption-references/mcn-handlebars-reference-encryption-sha1.html)
