---
layout: page
title: "Handlebars domain"
description: "Handlebars domain: returns everything behind the first @ of an email address, or null when the input has no @ or is not a string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/domain/
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
Returns everything behind the first @ of an email address, or null when the input has no @ or is not a string.

## Syntax

```sfmc
{{domain emailAddress}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `emailAddress` | string | Yes | The email address to read the domain from. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{domain "sales@force@example"}}` renders `force@example`, as documented.
- `{{domain "user@example.com"}}` renders `example.com`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--domain" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Domain`](/next/ampscript/functions/domain/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-domain.html)
