---
layout: page
title: "Handlebars set"
description: "Handlebars set: performs local variable assignment within the block scope."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/set/
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
Performs local variable assignment within the block scope. Variables do not persist outside the block.

## Syntax

```sfmc
{{#set ...assignments}}
  …
{{/set}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `assignments` | any | Yes, repeatable | Variable name/value pairs, e.g. name="John" age=30. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#set greeting="Hi"}}{{greeting}}{{/set}}` renders `Hi`, as documented.
- `{{#set n=2}}{{add n 3}}{{/set}}` renders `5`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--set" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-set.html)
