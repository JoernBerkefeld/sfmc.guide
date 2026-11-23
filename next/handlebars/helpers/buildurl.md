---
layout: page
title: "Handlebars buildUrl"
description: "Handlebars buildUrl: composes a link from a base URL plus UTM and custom query parameters and wraps it for click tracking."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/buildurl/
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
Composes a link from a base URL plus UTM and custom query parameters and wraps it for click tracking. Errors when the base URL is empty.

## Syntax

```sfmc
{{buildUrl base [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `base` | string | Yes | Destination URL; query parameters it already has are kept. |
| `options` | any | No, repeatable | Named arguments: encode, label or sfmclinkalias (not both), noTracking, sfmclinkid, utm_campaign, utm_content, utm_medium, utm_source, utm_term, plus any custom key="value" query parameters. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{buildUrl "https://example.com/a" noTracking=true utm_campaign="spring"}}` renders `https://example.com/a?utm_campaign=spring`, as documented.
- `{{buildUrl "https://example.com/a"}}` renders `https://example.com/a`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--buildurl" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-buildurl.html)
