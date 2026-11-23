---
layout: page
title: "Handlebars isEmpty"
description: "Handlebars isEmpty: returns true when a value is null, undefined, or an empty string."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/isempty/
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
Returns true when a value is null, undefined, or an empty string.

## Syntax

```sfmc
{{isEmpty input}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `input` | any | Yes | Value to test for null or empty. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{isEmpty ""}}` renders `true`, as documented.
- `{{isEmpty 0}}` renders `false`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--isempty" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Empty`](/next/ampscript/functions/empty/) — the AMPscript equivalent
- [AMPscript `IsNull`](/next/ampscript/functions/isnull/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-comparison-references/mcn-handlebars-reference-comparison-isempty.html)
