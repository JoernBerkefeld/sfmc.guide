---
layout: page
title: "Handlebars encodeURIComponent"
description: "Handlebars encodeURIComponent: URL-encodes the part of a string that comes after the address, such as a query string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/encodeuricomponent/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "`{{encodeURIComponent \"a b/c\"}}` renders `a%20b%2Fc`: both the space and the slash are encoded."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
URL-encodes the part of a string that comes after the address, such as a query string. For a whole string, use encodeURI.

## Syntax

```sfmc
{{encodeURIComponent text}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The text to encode. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{encodeURIComponent "a b/c"}}` renders `a%20b%2Fc`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--encodeuricomponent" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `URLEncode`](/next/ampscript/functions/urlencode/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-http-references/mcn-handlebars-reference-http-encodeuricomponent.html)
