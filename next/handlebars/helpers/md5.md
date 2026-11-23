---
layout: page
title: "Handlebars md5"
description: "Handlebars md5: returns the MD5 digest (128 bit) of a string as hex."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/md5/
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
Returns the MD5 digest (128 bit) of a string as hex. One-way and not safe for protecting secrets.

## Syntax

```sfmc
{{md5 text [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The text to hash. |
| `options` | any | No, repeatable | Named argument charset: UTF-8 (default) or UTF-16. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{md5 "abc"}}` renders `900150983cd24fb0d6963f7d28e17f72`, as documented.
- `{{md5 "abc" charset="UTF-16"}}` renders `ce1473cf80c6b3fda8e3dfc006adc315`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--md5" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `MD5`](/next/ampscript/functions/md5/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-encryption-references/mcn-handlebars-reference-encryption-md5.html)
