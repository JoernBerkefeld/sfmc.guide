---
layout: page
title: "Handlebars slice"
description: "Handlebars slice: returns part of a list, from a start index up to but not including an end index."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/slice/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper."
test_scripts: complete
verification: verified
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

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{get (slice (jsonPath '["apple","banana","cherry","date","elderberry"]' "$") 1 3) 0}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- `{{length (slice (jsonPath '["apple","banana","cherry","date","elderberry"]' "$") 2)}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- `{{get (slice (jsonPath '["apple","banana","cherry","date","elderberry"]' "$") -2 -1) 0}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--slice" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `slice` as a Marketing Cloud Next helper, available since the Winter '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{get (slice (jsonPath '["apple","banana","cherry","date","elderberry"]' "$") 1 3) 0}}` could not be saved: the CMS answered HTTP 400 and named `slice` as an unsupported handlebars helper. (These examples also use `jsonPath`, which is rejected too; `slice` is named in the same error.) [Details](/next/differs-from-docs/#hb-slice-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-slice.html)
