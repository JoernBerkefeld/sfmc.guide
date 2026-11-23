---
layout: page
title: "Handlebars indexOf"
description: "Handlebars indexOf: returns the 1-based position of a substring within a string (case-insensitive)."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/indexof/
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
Returns the 1-based position of a substring within a string (case-insensitive).

## Syntax

```sfmc
{{indexOf subject search}}
```

Returns `integer`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to search. |
| `search` | string | Yes | The string to find. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{indexOf "Hello World" "world"}}` renders `7`, as documented.
- `{{indexOf "abc" "z"}}` renders `0`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--indexof" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `IndexOf`](/next/ampscript/functions/indexof/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-indexof.html)
