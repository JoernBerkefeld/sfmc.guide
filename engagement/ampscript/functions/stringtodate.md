---
layout: page
title: "StringToDate"
description: "Converts a date string to a date value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that it produced character-for-character identical output to DateParse for every input tried, while accepting no second argument at all."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/stringtodate/
platforms:
  - engagement
  - next
syntax: "StringToDate(dateString)"
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
| `dateString` | string \| date | Yes | A date or timestamp string, or an existing date value |

## Example

```html
%%[
  VAR @parsed
  SET @parsed = StringToDate("2026-03-04T09:05:07")
]%%
%%=v(@parsed)=%%
```

Renders `3/4/2026 9:05:07 AM`.

The value is a real date, so the point of parsing is usually to hand it straight to another date function:

```html
%%[
  VAR @raw, @due
  SET @raw = "2026-03-04"
  SET @due = FormatDate(DateAdd(StringToDate(@raw), 30, "D"), "yyyy-MM-dd")
]%%
<p>Payment due %%=v(@due)=%%</p>
```

If a UTC conversion might ever be needed, reach for [DateParse](/engagement/ampscript/functions/dateparse/) instead — this name has no second argument to ask for one.

## Return value

**`date`** — a real date value, not text. `DatePart`, `FormatDate`, `DateAdd` and `DateDiff` all accepted the result directly, and `Length()` over it returned `20`.

There is no closed set of sentinel values to test for, and no failure value either. Every rejected input aborts the page with HTTP 422 rather than returning an error token, so a result that exists is always a real date.

Rendered on its own the value prints as a US short date followed by a 12-hour clock with an AM/PM suffix — `3/4/2026 12:00:00 AM` for a date with no time part.

### It behaves exactly like DateParse

Both functions were called on the same line of the same render, against the same fixed inputs. Every pair matched character for character.

| Call | `StringToDate` renders | `DateParse` renders |
|---|---|---|
| `("2026-03-04")` | `3/4/2026 12:00:00 AM` | `3/4/2026 12:00:00 AM` |
| `("2026-03-04 09:05:07")` | `3/4/2026 9:05:07 AM` | `3/4/2026 9:05:07 AM` |
| `("2026-03-04T09:05:07")` | `3/4/2026 9:05:07 AM` | `3/4/2026 9:05:07 AM` |
| `("2026-03-04T09:05:07+02:00")` | `3/4/2026 1:05:07 AM` | `3/4/2026 1:05:07 AM` |
| `("2026-03-04T09:05:07Z")` | `3/4/2026 3:05:07 AM` | `3/4/2026 3:05:07 AM` |
| `("3/4/2026 9:05 AM")` | `3/4/2026 9:05:00 AM` | `3/4/2026 9:05:00 AM` |
| `("4 March 2026")` | `3/4/2026 12:00:00 AM` | `3/4/2026 12:00:00 AM` |
| `("March 4, 2026")` | `3/4/2026 12:00:00 AM` | `3/4/2026 12:00:00 AM` |
| `("Wed, 04 Mar 2026 09:05:07 GMT")` | `3/4/2026 3:05:07 AM` | `3/4/2026 3:05:07 AM` |

Measured rather than eyeballed: a `DateDiff` in hours between the two results over the same input returned `0`, and `Length()` over each returned `20`.

**The one real difference is arity.** `DateParse` takes an optional second argument that returns the instant in UTC. `StringToDate` accepts exactly one argument — passing that same flag shape aborts the page, and so does the `"UTF-8"` encoding argument some community references still list for it. Neither is ignored; both are rejected. The relationship is written up in [the differs-from-docs card](/engagement/differs-from-docs/#stringtodate-duplicate-of-dateparse).

## Behaviour

**The failure mode is shared too, and it is the harsh one.** Free text, an empty string and a bare number such as `20260304` each abort the render with HTTP 422 and discard everything already written above them — under either name. There is no value to inspect afterwards, so validate the string before the call rather than checking the result.

**A timezone offset in the input is honoured, not discarded.** `2026-03-04T09:05:07+02:00` came back as `1:05:07 AM` and a `Z`-suffixed Zulu timestamp as `3:05:07 AM`, both correctly converted into the account zone. An `RFC`-style string ending in `GMT` converted the same way.

**A time with no date borrows the day of the render.** `1:41 PM` parsed successfully and took today's date, so it is the one accepted form whose result is not deterministic from the input alone.

**An existing date value can be passed straight back in.** `StringToDate(Now())` returned the current instant unchanged, so the parameter accepts a date as well as a string.

### A day-first date is misread, not refused

`5/8/2026` meant as the 5th of August parsed cleanly and came back as `5/8/2026 12:00:00 AM` — the 8th of May. Nothing aborts and nothing signals the problem, so a European-formatted feed produces plausible dates that are months wrong. Normalise to `yyyy-MM-dd` before parsing. The same input misreads identically under `DateParse`; full write-up in [that function's differs-from-docs card](/engagement/differs-from-docs/#dateparse-day-first-dates-are-silently-misread).

{% include test-script.html bundle="ampscript-functions--stringtodate" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- formats start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="One rejected argument discards the whole page" content="AMPscript has no try/catch, so an unreadable date string aborts the render and throws away everything already written above it. When testing, put each risky call behind its own `RequestParameter` branch and fetch them one at a time — otherwise a single failure hides every result on the page." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Everything on this page was proven on an Engagement CloudPage. The official reference states that on Marketing Cloud Next the function returns a locale-formatted string rather than a date value, which would break the chaining shown above; that claim was not tested here.

## See also

- [DateParse](/engagement/ampscript/functions/dateparse/) — same behaviour on one argument, plus an optional UTC flag this function does not have
- [FormatDate](/engagement/ampscript/functions/formatdate/) — the usual next call, and the recommended alternative on Marketing Cloud Next
- [DateAdd](/engagement/ampscript/functions/dateadd/) · [DateDiff](/engagement/ampscript/functions/datediff/) · [DatePart](/engagement/ampscript/functions/datepart/) — the functions that consume the parsed value
- [The differs-from-docs card](/engagement/differs-from-docs/#stringtodate-duplicate-of-dateparse) — the duplication and the arity gap
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-string-to-date.html) · [ampscript.guide](https://ampscript.guide/stringtodate/)
