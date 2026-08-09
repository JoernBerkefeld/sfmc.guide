---
layout: page
title: "LocalDateToSystemDate"
description: "Converts a date in the account's configured time zone to the Marketing Cloud system date. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that a date with no time part lands on the previous day."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/localdatetosystemdate/
platforms:
  - engagement
syntax: "LocalDateToSystemDate(timeToConvert)"
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
| `timeToConvert` | string \| date | Yes | The local time value to convert, as a date value or a parseable date string |

## Example

```html
%%[
  VAR @system
  SET @system = LocalDateToSystemDate("2026-01-15 09:30:00")
]%%
%%=v(@system)=%%
```

Renders `1/15/2026 2:30:00 AM` on the account this page was proven against — seven hours earlier than the input.

The usual reason to convert is to compare a user-supplied time against something the platform stamped in system time:

```html
%%[
  VAR @requested, @cutoff
  SET @requested = LocalDateToSystemDate("2026-01-15 09:30:00")
  SET @cutoff = DateAdd(Now(), 2, "H")
  IF @requested > @cutoff THEN
]%%
<p>Scheduled.</p>
%%[ ELSE ]%%
<p>Too close to the cutoff.</p>
%%[ ENDIF ]%%
```

Pass a full timestamp, never a bare date — a date with no time is pushed into the previous day, see below.

## Return value

**`date`** — a real date value, not text. `FormatDate` and `DatePart` accepted the result directly, and `Length()` over it returned `20`.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected input aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real date.

Rendered on its own the value prints as a US short date followed by a 12-hour clock with an AM/PM suffix — `1/15/2026 2:30:00 AM`.

## Behaviour

**The shift is not a fixed offset — it changes with the season.** `2026-01-15 09:30:00` became `1/15/2026 2:30:00 AM`, a `DateDiff` of `-420` minutes, while `2026-07-15 09:30:00` became `7/15/2026 1:30:00 AM`, `-480` minutes. One hour further in summer, because system time is Central Standard with no daylight-saving adjustment while the account-configured local side observes it. Full write-up in [the differs-from-docs card](/engagement/differs-from-docs/#localdatetosystemdate-seasonal-shift).

**The account setting decides the result, not the viewer.** The conversion uses the time zone configured on the account, so the result does not depend on where the page is being viewed from.

**[SystemDateToLocalDate](/engagement/ampscript/functions/systemdatetolocaldate/) is an exact inverse.** Composing the two in either order returned the original instant with a `DateDiff` of `0`, in both winter and summer — `LocalDateToSystemDate(SystemDateToLocalDate("2026-07-15 09:30:00"))` rendered `7/15/2026 9:30:00 AM`, the input unchanged.

**A date value can be passed in as well as a string.** `LocalDateToSystemDate(DateParse("2026-01-15 09:30:00"))` produced the identical value as the string form, and `LocalDateToSystemDate(Now())` converts the current instant directly. The US slash form parsed to the same value as the space-separated form.

**An unreadable string takes the whole page down.** `"not a date at all"` and an empty string both returned HTTP 422 with nothing rendered — the same failure mode as [DateParse](/engagement/ampscript/functions/dateparse/), not the empty string that `FormatDate` returns.

### A date with no time lands on the previous day

A string carrying no time part is read as midnight, and subtracting the offset from midnight crosses back over the date boundary.

| Call | Renders |
|---|---|
| `LocalDateToSystemDate("2026-01-15")` | `1/14/2026 5:00:00 PM` |
| `LocalDateToSystemDate("2026-01-15 09:30:00")` | `1/15/2026 2:30:00 AM` |

Nothing aborts and nothing signals it, so code that formats only the date part afterwards reports the 14th for a value supplied as the 15th. The forward direction adds the offset instead and stays on the same day, which is why the trap is one-sided. Details in [the differs-from-docs card](/engagement/differs-from-docs/#localdatetosystemdate-seasonal-shift).

{% include test-script.html bundle="ampscript-functions--localdatetosystemdate" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- ctrl start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="The minute counts depend on the account" content="The `-420` and `-480` figures come from one business unit's configured time zone. Re-running the script on another account gives different numbers; what stays true is the whole-hour shift and the one-hour gap between the winter and the summer measurement." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [SystemDateToLocalDate](/engagement/ampscript/functions/systemdatetolocaldate/) — the inverse conversion
- [DateParse](/engagement/ampscript/functions/dateparse/) · [FormatDate](/engagement/ampscript/functions/formatdate/) · [DatePart](/engagement/ampscript/functions/datepart/) — the functions that produce and consume the value
- [Now](/engagement/ampscript/functions/now/) — the system-time value this converts toward
- [The differs-from-docs card](/engagement/differs-from-docs/#localdatetosystemdate-seasonal-shift) — the seasonal shift and the date-only day shift
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-local-date-to-system-date.html) · [ampscript.guide](https://ampscript.guide/localdatetosystemdate/)
