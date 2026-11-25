---
layout: page
title: "Handlebars timezoneConversion"
description: "Handlebars timezoneConversion: converts a date to a different time zone."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/timezoneconversion/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Every tested call rendered the documented result. Write the name as the docs do: `timezoneConversion`; `timeZoneConversion` is rejected at save."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Converts a date to a different time zone.

## Syntax

```sfmc
{{timezoneConversion date sourceTZ targetTZ}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | Input date. |
| `sourceTZ` | string | Yes | Time zone of the input date. |
| `targetTZ` | string | Yes | Time zone to convert to. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{timezoneConversion "2025-01-15 12:00:00" "UTC" "America/New_York"}}` renders `2025-01-15T07:00:00`, the ISO-8601 format the docs name as return value.
- Helper names are case-sensitive. `{{timeZoneConversion …}}` (capital Z) is rejected when the email is saved as an unsupported helper; only the documented spelling `timezoneConversion` works.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--timezoneconversion" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--timezoneconversion" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

{% include mcn-status.html %}

## See also

- [AMPscript `LocalDateToSystemDate`](/engagement/ampscript/functions/localdatetosystemdate/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `SystemDateToLocalDate`](/engagement/ampscript/functions/systemdatetolocaldate/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-timezoneconversion.html)
