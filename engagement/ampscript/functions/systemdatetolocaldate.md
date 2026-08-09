---
layout: page
title: "SystemDateToLocalDate"
description: "Converts a Marketing Cloud system date to the time zone configured on the account. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the shift is seasonal rather than a fixed offset."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/systemdatetolocaldate/
platforms:
  - engagement
syntax: "SystemDateToLocalDate(systemTime)"
return_type: date
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `systemTime` | string \| date | Yes | The system time value to convert, as a date value or a parseable date string |

## Example

```html
%%[
  VAR @local
  SET @local = SystemDateToLocalDate("2026-01-15 09:30:00")
]%%
%%=v(@local)=%%
```

Renders `1/15/2026 4:30:00 PM` on the account this page was proven against — seven hours later than the input.

The result is a real date, so the usual pattern is to format it in the same expression rather than render it raw:

```html
%%[
  VAR @sentAt
  SET @sentAt = FormatDate(SystemDateToLocalDate(Now()), "yyyy-MM-dd HH:mm")
]%%
<p>Local time: %%=v(@sentAt)=%%</p>
```

Do not derive the offset once and reuse it — its size depends on the season, as covered below.

## Return value

**`date`** — a real date value, not text. `FormatDate`, `DatePart` and `DateAdd` all accepted the result directly, and `Length()` over it returned `20`.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected input aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real date.

Rendered on its own the value prints as a US short date followed by a 12-hour clock with an AM/PM suffix — `1/15/2026 4:30:00 PM`.

## Behaviour

**The shift is not a fixed offset — it changes with the season.** The same wall-clock input six months apart moved by different amounts: `2026-01-15 09:30:00` became `1/15/2026 4:30:00 PM`, a `DateDiff` of `420` minutes, while `2026-07-15 09:30:00` became `7/15/2026 5:30:00 PM`, `480` minutes. Exactly one hour more in summer. System time is Central Standard with no daylight-saving adjustment, so the side that moves is the account-configured local zone. Full write-up in [the differs-from-docs card](/engagement/differs-from-docs/#systemdatetolocaldate-seasonal-shift).

**The account setting decides the result, not the viewer.** The conversion is driven entirely by the time zone configured on the account, so every visitor to a CloudPage sees the same converted value regardless of where they are.

**[LocalDateToSystemDate](/engagement/ampscript/functions/localdatetosystemdate/) is an exact inverse.** Composing the two in either order returned the original instant with a `DateDiff` of `0`, in both winter and summer — `SystemDateToLocalDate(LocalDateToSystemDate("2026-01-15 09:30:00"))` rendered `1/15/2026 9:30:00 AM`, the input unchanged.

**A date value can be passed in as well as a string.** `SystemDateToLocalDate(DateParse("2026-01-15 09:30:00"))` produced the identical value as the string form, and `SystemDateToLocalDate(Now())` converts the current instant with no string round-trip. Among strings, the space-separated form, the `T`-separated ISO form and the US slash form all produced the same result.

**An unreadable string takes the whole page down.** `"not a date at all"` and an empty string both returned HTTP 422 with nothing rendered — the same failure mode as [DateParse](/engagement/ampscript/functions/dateparse/), not the empty string that `FormatDate` returns. There is no value to test for afterwards, so validate before the call.

{% include test-script.html bundle="ampscript-functions--systemdatetolocaldate" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- ctrl start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="The minute counts depend on the account" content="The `420` and `480` figures come from one business unit's configured time zone. Re-running the script on another account gives different numbers; what stays true is the whole-hour shift and the one-hour gap between the winter and the summer measurement." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [LocalDateToSystemDate](/engagement/ampscript/functions/localdatetosystemdate/) — the inverse conversion, and the one with the date-only trap
- [DateParse](/engagement/ampscript/functions/dateparse/) · [FormatDate](/engagement/ampscript/functions/formatdate/) · [DatePart](/engagement/ampscript/functions/datepart/) — the functions that produce and consume the value
- [Now](/engagement/ampscript/functions/now/) — the system-time source this converts from
- [The differs-from-docs card](/engagement/differs-from-docs/#systemdatetolocaldate-seasonal-shift) — the seasonal shift
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-system-date-to-local-date.html) · [ampscript.guide](https://ampscript.guide/systemdatetolocaldate/)
