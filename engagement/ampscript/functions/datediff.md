---
layout: page
title: "DateDiff"
description: "Returns the difference between two dates in the requested unit. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that it counts unit boundaries rather than elapsed time, so one minute either side of midnight is a whole day apart."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/datediff/
platforms:
  - engagement
  - next
syntax: "DateDiff(startDate, endDate, unitOfDifference)"
return_type: number
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `startDate` | string \| date | Yes | The starting date, either a real date value or a parseable date string |
| `endDate` | string \| date | Yes | The end date, either a real date value or a parseable date string |
| `unitOfDifference` | string | Yes | One of `Y`, `M`, `D`, `H` or `MI`, in any capitalisation. Nothing else is accepted |

## Example

```html
%%[
  VAR @start, @end, @days
  SET @start = "2026-01-10 08:00:00"
  SET @end = "2026-01-11 07:00:00"
  SET @days = DateDiff(@start, @end, "D")
]%%
%%=v(@days)=%%
```

Renders `1` — even though only 23 hours separate the two values, because the date changed once.

A later end date gives a positive number and an earlier one a negative number, which is what makes the result usable as a countdown or an overdue check:

```html
%%[
  VAR @due, @today, @remaining
  SET @due = "2026-05-01 00:00:00"
  SET @today = "2026-04-24 00:00:00"
  SET @remaining = DateDiff(@today, @due, "D")

  IF @remaining > 0 THEN
]%%
<p>%%=v(@remaining)=%% days left.</p>
%%[ ELSE ]%%
<p>Past due.</p>
%%[ ENDIF ]%%
```

The order of the two dates is the whole sign convention — swap them and you get the same magnitude negated.

## Return value

**`number`** — a whole number of unit boundaries, negative when the end date precedes the start date and `0` when both dates fall inside the same unit. It is a real number, not text: `Add(DateDiff(@s, @e, "H"), 1)` returned `24` where the inner call returned `23`.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected argument aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real count.

## Behaviour

**The five units are the whole list, and they ignore case.** `Y`, `M`, `D`, `H` and `MI` all work; `y`, `m`, `d`, `h`, `mi`, `Mi` and `mI` each returned exactly what their upper-case spelling returned. There is no seconds unit, so `MI` is the finest resolution available.

**Anything else costs you the entire page.** A seconds token, a weeks token, a quarters token, a milliseconds token, the spelled-out word for a day, an unknown two-letter token and an empty token string each returned HTTP 422 with no output at all, while a control call in the same deployment rendered normally. Nothing is written when the page aborts, so a bad unit is not something the caller can detect and recover from.

**A date string and a real date value are interchangeable, in either position independently.** ISO, US slash and spelled-out month forms all parsed, and the output of `Now()` and of [DateAdd](/engagement/ampscript/functions/dateadd/) went straight in with no conversion. Mixing a value with a string in one call works in both directions. But an unparseable string, an empty string or a plain number aborts the page in either position — the same unforgiving behaviour as `DateAdd`, and the opposite of [FormatDate](/engagement/ampscript/functions/formatdate/).

### The result counts boundaries, not elapsed time

Both dates are truncated to the requested unit and then subtracted. What comes back is how many unit boundaries lie between them.

| Call | Renders |
|---|---|
| `DateDiff("2026-01-10 08:00:00", "2026-01-11 07:00:00", "D")` | `1` |
| `DateDiff("2026-01-10 00:00:00", "2026-01-10 23:59:00", "D")` | `0` |
| `DateDiff("2026-12-31 23:59:00", "2027-01-01 00:00:00", "Y")` | `1` |
| `DateDiff("2026-01-01 00:00:00", "2026-12-31 23:59:00", "Y")` | `0` |
| `DateDiff("2026-01-10 08:00:00", "2026-01-10 09:30:00", "H")` | `1` |
| `DateDiff("2026-01-10 08:00:59", "2026-01-10 08:01:00", "MI")` | `1` |

The first two rows are the pair worth remembering: 23 hours that cross midnight count as a day, and 23 hours that do not, count as nothing. The third row is the same rule at its most extreme — sixty seconds spanning New Year returns `1` for `Y`, `M`, `D` and `MI` simultaneously.

Anything finer than the requested unit is discarded rather than contributing a fraction: 59 seconds measured in `MI` gives `0`, but one second across a minute boundary gives `1`. So `DateDiff(a, b, "D") == 1` means the date changed once, not that a day passed. See [the differs-from-docs card](/engagement/differs-from-docs/#datediff-counts-boundaries-not-elapsed-time) for the full write-up.

{% include test-script.html bundle="ampscript-functions--datediff" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="One rejected argument discards the whole page" content="AMPscript has no try/catch, so a bad unit or an unreadable date aborts the render and throws away everything already written above it. When testing, put each risky call behind its own `RequestParameter` branch and fetch them one at a time — otherwise a single failure hides every result on the page." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [DateAdd](/engagement/ampscript/functions/dateadd/) — the inverse operation, sharing the same five-unit token set
- [Now](/engagement/ampscript/functions/now/) — the value most often passed in as one of the two dates
- [FormatDate](/engagement/ampscript/functions/formatdate/) — formats a date, and swallows bad input where this function aborts
- [The differs-from-docs cards](/engagement/differs-from-docs/#datediff-counts-boundaries-not-elapsed-time) — why a 23-hour gap can be one day
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-diff.html) · [ampscript.guide](https://ampscript.guide/datediff/)
