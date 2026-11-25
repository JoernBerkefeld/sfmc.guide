---
layout: page
title: "Handlebars slice"
description: "Handlebars slice: returns part of a list, from a start index up to but not including an end index."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/slice/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-25
mcn_note: "Accepted when the email is saved. Not rendered yet: the documented examples build their list with `jsonPath`, which Next rejects."
verification: in-progress
test_scripts: complete
---

{% include verification-status.html %}

{% raw %}
Returns part of a list, from a start index up to but not including an end index.

## Syntax

```sfmc
{{slice list startIndex [endIndex]}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | Source list. |
| `startIndex` | integer | Yes | The starting index. Negative counts from the end. |
| `endIndex` | integer | No | The ending index (exclusive). Negative counts from the end. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{#if false}}{{slice myList 1 3}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--slice" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-slice.html)
