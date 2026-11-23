---
layout: page
title: "Handlebars timeZoneConversion"
description: "Handlebars timeZoneConversion: converts a date to a different time zone."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/timezoneconversion/
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
Converts a date to a different time zone.

## Syntax

```sfmc
{{timeZoneConversion date sourceTZ targetTZ}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | Input date. |
| `sourceTZ` | string | Yes | Time zone of the input date. |
| `targetTZ` | string | Yes | Time zone to convert to. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{timeZoneConversion "2025-01-15 12:00:00" "UTC" "America/New_York"}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- `{{timeZoneConversion "2025-07-15 12:00:00" "UTC" "America/Los_Angeles"}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--timezoneconversion" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `timeZoneConversion` as a Marketing Cloud Next helper, available since the Summer '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{timeZoneConversion "2025-01-15 12:00:00" "UTC" "America/New_York"}}` could not be saved: the CMS answered HTTP 400 and named `timeZoneConversion` as an unsupported handlebars helper. [Details](/next/differs-from-docs/#hb-timezoneconversion-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `LocalDateToSystemDate`](/engagement/ampscript/functions/localdatetosystemdate/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `SystemDateToLocalDate`](/engagement/ampscript/functions/systemdatetolocaldate/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-timezoneconversion.html)
