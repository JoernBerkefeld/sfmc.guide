---
layout: page
title: "DateParse"
description: "Parses a date string into a date value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that a day-first date is silently read month-first while an unreadable one takes the whole page down."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/dateparse/
platforms:
  - engagement
  - next
syntax: "DateParse(dateString[, useUtc])"
return_type: date
min_args: 1
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | A date or timestamp string, or an existing date value |
| `useUtc` | string \| boolean \| number | No | Whether to return the instant in UTC instead of the account time zone; defaults to off |

## Example

```html
%%[
  VAR @parsed
  SET @parsed = DateParse("2026-03-04T09:05:07")
]%%
%%=v(@parsed)=%%
```

Renders `3/4/2026 9:05:07 AM`.

The value is a real date, so the point of parsing is usually to hand it straight to another date function:

```html
%%[
  VAR @raw, @due
  SET @raw = "2026-03-04"
  SET @due = FormatDate(DateAdd(DateParse(@raw), 30, "D"), "yyyy-MM-dd")
]%%
<p>Payment due %%=v(@due)=%%</p>
```

Only pass a string you control the shape of — an unreadable one discards the whole page, and a day-first one is misread rather than refused. Both are covered below.

## Return value

**`date`** — a real date value, not text. `DatePart`, `FormatDate`, `DateAdd` and `DateDiff` all accepted the result directly, and `Length()` over it returned `20`.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected input aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real date.

Rendered on its own the value prints as a US short date followed by a 12-hour clock with an AM/PM suffix — `3/4/2026 12:00:00 AM` for a date with no time part.

## Behaviour

**The second argument really does change the value, unlike the flag on [Now](/engagement/ampscript/functions/now/).** Parsing `2026-03-04 09:05:07` with the flag off gave `3/4/2026 9:05:07 AM` and with it on gave `3/4/2026 3:05:07 PM` — a `DateDiff` of exactly `6` hours, the account's offset from UTC. Every spelling is accepted interchangeably: `1`/`0`, `true`/`false`, and all four of those quoted, each producing the identical instant as its counterpart. The argument is not validated either — passing the word `spring` was accepted and behaved as the off path.

**A timezone offset in the input is honoured, not discarded.** `2026-03-04T09:05:07+02:00` came back as `1:05:07 AM` and a `Z`-suffixed Zulu timestamp as `3:05:07 AM`, both correctly converted into the account zone. An `RFC`-style string ending in `GMT` converted the same way.

**A time with no date borrows the day of the render.** `1:41 PM` parsed successfully and took today's date, so it is the one accepted form whose result is not deterministic from the input alone.

**An existing date value can be passed straight back in.** `DateParse(Now())` returned the same instant, which is what makes the UTC conversion idiom `DateParse(Now(), 1)` work without any string round-trip.

### Which input formats parse

Fixed inputs, each proven in its own gate.

| Call | Renders |
|---|---|
| `DateParse("2026-03-04")` | `3/4/2026 12:00:00 AM` |
| `DateParse("2026-03-04 09:05:07")` | `3/4/2026 9:05:07 AM` |
| `DateParse("2026-03-04T09:05:07")` | `3/4/2026 9:05:07 AM` |
| `DateParse("2026-03-04T09:05:07+02:00")` | `3/4/2026 1:05:07 AM` |
| `DateParse("3/4/2026 9:05 AM")` | `3/4/2026 9:05:00 AM` |
| `DateParse("4 March 2026")` | `3/4/2026 12:00:00 AM` |
| `DateParse("March 4, 2026")` | `3/4/2026 12:00:00 AM` |
| `DateParse("Wed, 04 Mar 2026 09:05:07 GMT")` | `3/4/2026 3:05:07 AM` |
| `DateParse("1:41 PM")` | today's date at `1:41:00 PM` |

An ordinal-suffixed day, a non-English month name, free text, an empty string, an epoch-like numeric string such as `"1772614800"` and a bare number such as `20260304` all abort the page instead. There is no numeric input path at all, and no return value to test for afterwards — see [the differs-from-docs card](/engagement/differs-from-docs/#dateparse-unsupported-input-aborts-the-page).

### A day-first date is misread, not refused

`5/8/2026` meant as the 5th of August parsed cleanly and came back as `5/8/2026 12:00:00 AM` — the 8th of May. Nothing aborts and nothing signals the problem, so a European-formatted feed produces plausible dates that are months wrong. Normalise to `yyyy-MM-dd` before parsing. Full write-up in [the differs-from-docs card](/engagement/differs-from-docs/#dateparse-day-first-dates-are-silently-misread).

{% include test-script.html bundle="ampscript-functions--dateparse" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="One rejected argument discards the whole page" content="AMPscript has no try/catch, so an unreadable date string aborts the render and throws away everything already written above it. When testing, put each risky call behind its own `RequestParameter` branch and fetch them one at a time — otherwise a single failure hides every result on the page." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Everything on this page was proven on an Engagement CloudPage. The official reference states that on Marketing Cloud Next the function returns a locale-formatted string rather than a date value, which would break the chaining shown above; that claim was not tested here.

## See also

- [FormatDate](/engagement/ampscript/functions/formatdate/) — the usual next call, and the recommended alternative on Marketing Cloud Next
- [DateAdd](/engagement/ampscript/functions/dateadd/) · [DateDiff](/engagement/ampscript/functions/datediff/) · [DatePart](/engagement/ampscript/functions/datepart/) — the functions that consume the parsed value
- [Now](/engagement/ampscript/functions/now/) — whose own optional flag, unlike this one, changes nothing on a CloudPage
- [The differs-from-docs cards](/engagement/differs-from-docs/#dateparse-unsupported-input-aborts-the-page) — the page abort and the day-first misreading
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-parse.html) · [ampscript.guide](https://ampscript.guide/dateparse/)
