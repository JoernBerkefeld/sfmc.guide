---
layout: page
title: "Handlebars char"
description: "Handlebars char: returns the Unicode character for a character code, optionally repeated."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/char/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "`{{char 65 3}}` gives `AAA` as documented. A code above 65535, `{{char 65602 1}}`, breaks the email preview (HTTP 500) instead of giving the documented `B`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns the Unicode character for a character code, optionally repeated.

## Syntax

```sfmc
{{char code [repeated]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | number | Yes | Unicode character code in decimal. |
| `repeated` | integer | No | How many times to repeat the character. Defaults to 1. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{char 65602 1}}` breaks the email preview (HTTP 500). The documented result is `B`.
- `{{char 65 3}}` renders `AAA`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--char" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--char" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference says a code outside 0-65535 is wrapped into range with modulo 65536, and gives `{{char 65602 1}}` returning `B` as its own example. In Marketing Cloud Next (tested 2026-11-22): `{{char 65602 1}}` let the email save and publish, but the preview then failed with HTTP 500 and no message. Codes inside the range work: `{{char 65 3}}` rendered `AAA`. [Details](/next/differs-from-docs/#hb-char-code-above-65535-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Char`](/next/ampscript/functions/char/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-char.html)
