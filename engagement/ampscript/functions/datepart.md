---
layout: page
title: "DatePart"
description: "Extracts a specific component from a date value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the hour comes back on a 12-hour clock with nothing to tell 7 AM from 7 PM."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/datepart/
platforms:
  - engagement
syntax: "DatePart(dateString, datePart)"
return_type: string
min_args: 2
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
| `dateString` | string \| date | Yes | A real date value or a parseable date string |
| `datePart` | string | Yes | One of `Y`, `M`, `D`, `H`, `MI`, `year`, `month`, `monthName`, `day`, `hour` or `minute`, in any capitalisation |

## Example

```html
%%[
  VAR @when, @month
  SET @when = "2026-03-04 09:05:07"
  SET @month = DatePart(@when, "M")
]%%
%%=v(@month)=%%
```

Renders `03` — zero-padded, even though the hour from the same value comes back as a bare `9`.

The long-form tokens are what make the function worth reaching for, because `monthName` has no other equivalent:

```html
%%[
  VAR @when, @name, @day, @year
  SET @when = "2026-03-04 09:05:07"
  SET @name = DatePart(@when, "monthName")
  SET @day = DatePart(@when, "day")
  SET @year = DatePart(@when, "year")
]%%
<p>%%=v(@name)=%% %%=v(@day)=%%, %%=v(@year)=%%</p>
```

Reach for [FormatDate](/engagement/ampscript/functions/formatdate/) instead when you need the hour — see below.

## Return value

**`string`** — the requested component as text: a four-digit year, a zero-padded two-digit month or day, an unpadded hour or minute, or the full English month name.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected argument aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real component.

Text does not mean the value needs converting first. `Add(DatePart(@when, "Y"), 1)` returned `2027` and `Multiply(DatePart(@when, "M"), 10)` returned `30` from a month that had rendered as `03`, so the padding does not survive into arithmetic.

## Behaviour

**Eleven tokens are accepted, and they ignore case.** The five abbreviations `Y`, `M`, `D`, `H` and `MI` work, and so do the long forms `year`, `month`, `day`, `hour`, `minute` and `monthName`. `y`, `m`, `d`, `h`, `mi` and `Mi` each returned exactly what their upper-case spelling returned, and `YEAR`, `MONTHNAME` and `monthname` all resolved. This is a wider set than the sibling [DateAdd](/engagement/ampscript/functions/dateadd/) and [DateDiff](/engagement/ampscript/functions/datediff/) accept.

**`monthName` is the only token with no abbreviation, and there is no day-name counterpart.** It returned `March` for a date in March; a `dayName` token aborts the page, so the naming pattern does not generalise.

**Anything else costs you the entire page.** A seconds token in either spelling, a weeks token, a quarters token, a `dayName` token, an unknown two-letter token and an empty token string each returned HTTP 422 with no output at all, while a control call in the same deployment rendered normally. There is no seconds component available, so the finest resolution is the minute.

**A date string and a real date value are interchangeable.** ISO, ISO-T, US slash and spelled-out month forms all parsed, and the output of `Now()` and of `DateAdd` went straight in with no conversion. But an unparseable string, an empty string or a plain number aborts the page — the same unforgiving behaviour as `DateAdd` and `DateDiff`, and the opposite of [FormatDate](/engagement/ampscript/functions/formatdate/).

**The padding is not uniform.** From `2026-03-04 09:05:07` the month rendered `03` and the day `04`, while the hour rendered `9` and the minute `5`. `Length()` over the same calls gave `2` and `1`. Concatenating parts therefore builds a ragged string rather than a fixed-width one. Full write-up in [the differs-from-docs card](/engagement/differs-from-docs/#datepart-inconsistent-zero-padding).

### The hour is a 12-hour clock

The hour is read off a twelve-hour clock and arrives without an AM/PM indicator, so the result is ambiguous by construction.

| Call | Renders |
|---|---|
| `DatePart("2026-11-23 19:35:47", "H")` | `7` |
| `DatePart("2026-03-04 09:05:07", "H")` | `9` |
| `DatePart("2026-03-04 00:30:00", "H")` | `12` |
| `DatePart("2026-03-04 12:30:00", "H")` | `12` |
| `DatePart("2026-03-04", "H")` | `12` |

The last three rows are the ones that surprise: midnight is `12` rather than `0`, and a date string with no time part at all is also `12` — so a missing time cannot be told apart from noon or from half past midnight. Anything that compares hours, buckets a send into a time of day, or feeds the number back into a date will be wrong for half the day. Use `FormatDate` with an `HH` pattern when a 24-hour value is needed, and treat this token as display-only. See [the differs-from-docs card](/engagement/differs-from-docs/#datepart-hour-is-a-12-hour-clock).

{% include test-script.html bundle="ampscript-functions--datepart" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="One rejected argument discards the whole page" content="AMPscript has no try/catch, so a bad token or an unreadable date aborts the render and throws away everything already written above it. When testing, put each risky call behind its own `RequestParameter` branch and fetch them one at a time — otherwise a single failure hides every result on the page." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

Unlike [Now](/engagement/ampscript/functions/now/), [DateAdd](/engagement/ampscript/functions/dateadd/), [DateDiff](/engagement/ampscript/functions/datediff/) and [FormatDate](/engagement/ampscript/functions/formatdate/), this function did not gain Marketing Cloud Next support in the Summer '26 release.

## See also

- [FormatDate](/engagement/ampscript/functions/formatdate/) — the way to get a 24-hour clock, a padded value, or a localised month name
- [DateAdd](/engagement/ampscript/functions/dateadd/) · [DateDiff](/engagement/ampscript/functions/datediff/) — the sibling functions, whose token set is narrower
- [Now](/engagement/ampscript/functions/now/) — the value most often passed in
- [The differs-from-docs cards](/engagement/differs-from-docs/#datepart-hour-is-a-12-hour-clock) — the 12-hour clock and the ragged padding
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-part.html) · [ampscript.guide](https://ampscript.guide/datepart/)
