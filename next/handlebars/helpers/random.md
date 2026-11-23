---
layout: page
title: "Handlebars random"
description: "Handlebars random: returns a random integer between two values (inclusive)."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/random/
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
Returns a random integer between two values (inclusive).

## Syntax

```sfmc
{{random first second}}
```

Returns `integer`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `first` | number | Yes | The minimum value. |
| `second` | number | Yes | The maximum value. Must be >= first. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{random 1 1}}` renders `1`, as documented.
- `{{random 1 10}}` renders `7`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--random" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Random`](/next/ampscript/functions/random/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-math-references/mcn-handlebars-reference-math-random.html)
