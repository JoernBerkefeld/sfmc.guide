---
layout: page
title: "Handlebars personalizationResult"
description: "Handlebars personalizationResult: retrieves a personalized value by key from the subscriber context."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/personalizationresult/
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
Retrieves a personalized value by key from the subscriber context.

## Syntax

```sfmc
{{personalizationResult key}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Key of the personalized value. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{personalizationResult "noSuchKey"}}` renders an empty string, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--personalizationresult" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `AttributeValue`](/engagement/ampscript/functions/attributevalue/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-personalization-references/mcn-handlebars-reference-personalization-personalizationresult.html)
