---
layout: page
title: "Handlebars encode"
description: "Handlebars encode: hashes a string with an algorithm chosen by name and returns the digest as lowercase hex."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/encode/
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
Hashes a string with an algorithm chosen by name and returns the digest as lowercase hex. Errors on a missing argument or an unknown algorithm or charset.

## Syntax

```sfmc
{{encode ...options}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `options` | any | Yes, repeatable | Named arguments only: alg (md5, sha1, sha256 or sha512) and value (the text to hash) are required; charset is UTF-8 (default) or UTF-16. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{encode alg="sha256" value="abc"}}` renders `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`, as documented.
- `{{encode alg="md5" value="abc"}}` renders `900150983cd24fb0d6963f7d28e17f72`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--encode" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-encryption-references/mcn-handlebars-reference-encryption-encode.html)
