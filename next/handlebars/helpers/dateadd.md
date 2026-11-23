---
layout: page
title: "Handlebars dateAdd"
description: "Handlebars dateAdd: moves a date forward or back by a number of time units."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/dateadd/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "The date math is right, but the output format is not: the documentation shows a space between date and time (`2025-02-28 00:00:00`), while MCN puts a `T` there (`2025-02-28T00:00:00`)."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Moves a date forward or back by a number of time units.

## Syntax

```sfmc
{{dateAdd date number interval}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | The starting date. |
| `number` | integer | Yes | How many units to add. A negative number moves the date back. |
| `interval` | string | Yes | Time unit: Y, M, D, H, MI, or S. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{dateAdd "2024-02-29" 1 "Y"}}` renders `2025-02-28T00:00:00`. The documented result is `2025-02-28 00:00:00`.
- `{{dateAdd "2025-01-31" 1 "D"}}` renders `2025-02-01T00:00:00`. The documented result is `2025-02-01 00:00:00`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--dateadd" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference states the result is a date-time string shaped `yyyy-MM-dd HH:mm:ss`, with a space between date and time, and shows `2025-02-28 00:00:00` for its leap-year example. In Marketing Cloud Next (tested 2026-11-22): The date math was right, but the separator is a `T`: `{{dateAdd "2024-02-29" 1 "Y"}}` rendered `2025-02-28T00:00:00` and `{{dateAdd "2025-01-31" 1 "D"}}` rendered `2025-02-01T00:00:00`. Code that compares or splits the result on the space breaks. [Details](/next/differs-from-docs/#hb-dateadd-t-separator)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `DateAdd`](/next/ampscript/functions/dateadd/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-dateadd.html)
