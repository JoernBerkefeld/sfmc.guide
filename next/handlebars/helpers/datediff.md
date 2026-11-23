---
layout: page
title: "Handlebars dateDiff"
description: "Handlebars dateDiff: calculates the time difference between two dates in a specified unit."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/datediff/
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
Calculates the time difference between two dates in a specified unit.

## Syntax

```sfmc
{{dateDiff date1 date2 interval}}
```

Returns `integer`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date1` | string | Yes | The first date. |
| `date2` | string | Yes | The second date. |
| `interval` | string | Yes | Unit of time: Y, M, D, H, MI, or S. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{dateDiff "2025-12-26" "2026-01-05" "D"}}` renders `10`, as documented.
- `{{dateDiff "2025-01-31" "2025-02-02" "M"}}` renders `0`, as documented.
- `{{dateDiff "2025-01-31" "2025-02-02" "M" version="ampscript"}}` renders `1`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--datediff" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `DateDiff`](/next/ampscript/functions/datediff/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-datediff.html)
