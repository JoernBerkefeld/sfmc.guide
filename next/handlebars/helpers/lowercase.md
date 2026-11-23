---
layout: page
title: "Handlebars lowercase"
description: "Handlebars lowercase: changes every letter in a string to lowercase."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/lowercase/
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
Changes every letter in a string to lowercase.

## Syntax

```sfmc
{{lowercase subject [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to lowercase. |
| `culture` | string | No | Locale code (for example `tr-TR`) whose letter-case rules apply. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{lowercase "MCN"}}` renders `mcn`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--lowercase" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Lowercase`](/next/ampscript/functions/lowercase/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-lowercase.html)
