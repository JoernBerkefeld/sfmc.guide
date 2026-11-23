---
layout: page
title: "AMPscript DateDiff (Next)"
description: "Measure the gap between two dates with AMPscript DateDiff in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/datediff/
platforms:
  - next
syntax: "DateDiff(startDate, endDate, unitOfDifference)"
return_type: number
min_args: 3
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement counts unit boundaries while Next counts whole elapsed units: 23 hours across midnight give `1` day in Engagement and `0` in Next, and `2026-03-04 13:52:07` to `2027-05-09 09:15:31` gives `431` days in Engagement and `430` in Next. Engagement aborts the page on a seconds unit; Next returns `59` for 59 seconds measured in `S`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `startDate` | string \| date | Yes | The starting date, either a real date value or a parseable date string |
| `endDate` | string \| date | Yes | The end date, either a real date value or a parseable date string |
| `unitOfDifference` | string | Yes | One of `Y`, `M`, `D`, `H`, `MI` or `S`. The first five work in any capitalisation |

## Example

```ampscript
%%=DateDiff("2026-01-01", "2026-01-15", "D")=%%
```

Renders `14`.

The sign follows the order of the dates:

```ampscript
%%=DateDiff("2026-01-11 07:00:00", "2026-01-10 08:00:00", "H")=%%
```

Renders `-23`.

## Return value

**`number`** — how many whole units have elapsed between the two dates, negative when the end date is earlier. A partial unit is dropped, in both directions.

The result feeds arithmetic, but `Add(DateDiff("2026-01-10 08:00:00", "2026-01-11 07:00:00", "H"), 1)` printed `24.0`, with a trailing `.0`.

## Behaviour

**Whole elapsed units, not calendar boundaries.** The count is the elapsed time divided by the unit, with the remainder thrown away:

| Call | Renders |
|---|---|
| `DateDiff("2026-01-10 08:00:00", "2026-01-11 07:00:00", "D")` | `0` |
| `DateDiff("2026-01-11 07:00:00", "2026-01-10 08:00:00", "D")` | `0` |
| `DateDiff("2026-01-10 08:00:00", "2026-01-10 09:30:00", "H")` | `1` |
| `DateDiff("2026-01-10 09:30:00", "2026-01-10 08:00:00", "H")` | `-1` |
| `DateDiff("2026-01-10 08:00:00", "2026-01-10 08:59:00", "H")` | `0` |
| `DateDiff("2026-12-31 23:59:00", "2027-01-01 00:00:00", "D")` | `0` |
| `DateDiff("2026-01-10 08:00:59", "2026-01-10 08:01:00", "MI")` | `0` |

One minute across New Year gives `0` for `Y`, `M` and `D` and `1` for `MI`. 364 days give `0` years, 366 days give `1`, and 29 days from January 10 give `0` months.

**Long spans.** From `2026-03-04 13:52:07` to `2027-05-09 09:15:31` the units `Y`, `M`, `D`, `H` and `MI` gave `1`, `14`, `430`, `10339` and `620363`. Lower-case and mixed-case spellings of the units gave the same numbers.

**Seconds work.** `DateDiff("2026-01-10 08:00:00", "2026-01-10 08:00:59", "S")` renders `59`.

**Other unit tokens break the render.** An email with a weeks unit `W`, the word `day` or an unknown token `ZZ` saves and publishes, but its preview fails.

**The same instant gives `0`**, in days and in minutes.

**Date strings and date values both work, in either position.** US slash (`1/10/2026`) and spelled-out (`10 January 2026`) strings parse. `Now()`, a `DateAdd` result and a mix of a date value with a string all work. A string that is not a date makes the preview fail.

**Exactly three arguments.** An email that calls `DateDiff` with two or with four arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--datediff" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--datediff" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Partial units are dropped.** The reference does not say how a partial unit or a crossed calendar boundary is counted. In Next only whole elapsed units count: 23 hours across midnight give `0` days, and one minute across New Year gives `0` years, months and days. [Card](/next/differs-from-docs/#datediff-whole-elapsed-units)

{% include platform-compare.html %}

## See also

- [`DateDiff` in Marketing Cloud Engagement](/engagement/ampscript/functions/datediff/) — how it behaves there
- [DateAdd](/next/ampscript/functions/dateadd/) — moves a date by an interval
- [Now](/next/ampscript/functions/now/) — a common start or end date
- [FormatDate](/next/ampscript/functions/formatdate/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-diff.html)
