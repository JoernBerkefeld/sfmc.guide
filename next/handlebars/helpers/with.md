---
layout: page
title: "Handlebars with"
description: "Handlebars with: changes the block context to a specified object so properties can be accessed directly."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/with/
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
Changes the block context to a specified object so properties can be accessed directly.

## Syntax

```sfmc
{{#with object}}
  …
{{/with}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `object` | object | Yes | The object to use as the block context. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#with (hash name="Ana")}}{{name}}{{/with}}` renders `Ana`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--with" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-with.html)
