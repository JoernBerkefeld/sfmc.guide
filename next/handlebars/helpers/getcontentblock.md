---
layout: page
title: "Handlebars getContentBlock"
description: "Handlebars getContentBlock: inserts a content block into the template and renders it."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/getcontentblock/
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
Inserts a content block into the template and renders it.

## Syntax

```sfmc
{{getContentBlock key}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Key that identifies the content block. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{fallback (getContentBlock "missingBlockKey") "none"}}` renders `none`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--getcontentblock" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `ContentBlockByKey`](/next/ampscript/functions/contentblockbykey/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-getcontentblock.html)
