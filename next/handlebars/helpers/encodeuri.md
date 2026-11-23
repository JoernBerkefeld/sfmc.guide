---
layout: page
title: "Handlebars encodeURI"
description: "Handlebars encodeURI: URL-encodes a whole string so it can be placed in a link."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/encodeuri/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "Without the second argument, `{{encodeURI \"a b\"}}` renders `a b` with the space left as is, although encoding everything is the documented default. With `true`, `{{encodeURI \"a b/c\" true}}` breaks the email preview (HTTP 500) instead of giving `a%20b/c`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
URL-encodes a whole string so it can be placed in a link. For only the part behind the address, such as a query string, use encodeURIComponent.

## Syntax

```sfmc
{{encodeURI text [onlySpaces]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `text` | string | Yes | The text to encode. |
| `onlySpaces` | boolean | No | true replaces just spaces with %20; false (default) encodes every URL-unsafe character. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{encodeURI "a b/c" true}}` breaks the email preview (HTTP 500). The documented result is `a%20b/c`.
- `{{encodeURI "a b"}}` renders `a b`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--encodeuri" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--encodeuri" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference says that when `onlySpaces` is left out (it defaults to `false`), anything that does not belong in a URL gets percent-encoded. In Marketing Cloud Next (tested 2026-11-22): `{{encodeURI "a b"}}` rendered `a b`: the space stayed as it is. A link built this way still contains a raw space. [Details](/next/differs-from-docs/#hb-encodeuri-default-leaves-spaces)
- The reference says that with `onlySpaces` set to `true`, only spaces are converted (to `%20`). In Marketing Cloud Next (tested 2026-11-22): `{{encodeURI "a b/c" true}}` let the email save and publish, but the preview then failed with HTTP 500 and no message instead of rendering `a%20b/c`. [Details](/next/differs-from-docs/#hb-encodeuri-onlyspaces-http-500)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-http-references/mcn-handlebars-reference-http-encodeuri.html)
