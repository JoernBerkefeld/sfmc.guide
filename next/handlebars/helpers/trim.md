---
layout: page
title: "Handlebars trim"
description: "Handlebars trim: removes leading and trailing whitespace from a string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/trim/
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
Removes leading and trailing whitespace from a string.

## Syntax

```sfmc
{{trim subject}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to trim. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{trim "  abc  "}}` renders `abc`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--trim" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Trim`](/next/ampscript/functions/trim/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-trim.html)
