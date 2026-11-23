---
layout: page
title: "Handlebars datePart"
description: "Handlebars datePart: returns one part of a date or timestamp as a number, for example the year."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/datepart/
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
Returns one part of a date or timestamp as a number, for example the year.

## Syntax

```sfmc
{{datePart date part}}
```

Returns `integer`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date` | any | Yes | The date or timestamp to read from. |
| `part` | string | Yes | Component to return: Y, M, D, H, or MI. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{datePart "2023年8月5日" "Y"}}` renders `2023`, as documented.
- `{{datePart "2025-03-15 14:30:00" "MI"}}` renders `30`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--datepart" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `DatePart`](/next/ampscript/functions/datepart/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-datepart.html)
