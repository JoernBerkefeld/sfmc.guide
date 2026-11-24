---
layout: page
title: "AMPscript DatePart (Next)"
description: "Read one component of a date with AMPscript DatePart in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/datepart/
platforms:
  - next
syntax: "DatePart(dateString, datePart)"
return_type: string
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement zero-pads month and day (`03`, `04`) and reads the hour off a 12-hour clock (`19:35` gives `7`, midnight gives `12`); Next returns `3`, `4`, `19` and `0`. Engagement also accepts long tokens such as `monthName`, `year` and `day`, which make the Next preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | A real date value or a parseable date string |
| `datePart` | string | Yes | One of `Y`, `M`, `D`, `H` or `MI` |

## Example

```ampscript
%%=DatePart("2026-11-23 19:35:47", "H")=%%
```

Renders `19`.

The result can go into arithmetic directly:

```ampscript
%%=Add(DatePart("2026-03-04 09:05:07", "Y"), 1)=%%
```

Renders `2027`.

## Return value

**`string`** — the requested component as digits, with no padding: from `2026-03-04 09:05:07` the tokens `Y`, `M`, `D`, `H` and `MI` give `2026`, `3`, `4`, `9` and `5`.

`Add` and `Multiply` accept the result (`Multiply(DatePart("2026-03-04 09:05:07", "M"), 10)` gives `30`). Wrapping it in `Length()` made the preview fail with HTTP 500, so do not measure it.

## Behaviour

**Five tokens.** `Y`, `M`, `D`, `H` and `MI` work. The long tokens `year`, `month`, `monthName`, `day`, `hour` and `minute` make the preview fail (HTTP 500); `DatePart("2026-03-04 09:05:07", "monthName")` on its own is enough. Use [FormatDate](/next/ampscript/functions/formatdate/) with `MMMM` for a month name.

**No leading zeros.** Month and day come back as `3` and `4`, not `03` and `04`, for any input format: ISO, ISO with `T`, US slash and spelled-out strings all gave unpadded values.

**The hour is on a 24-hour clock.**

| Call | Renders |
|---|---|
| `DatePart("2026-11-23 19:35:47", "H")` | `19` |
| `DatePart("2026-03-04 00:30:00", "H")` | `0` |
| `DatePart("2026-03-04 12:30:00", "H")` | `12` |
| `DatePart("2026-03-04", "H")` | `0` |

**Date values work.** `DatePart(Now(), "Y")` gives the current year, and a `DateAdd` result goes in directly.

**Bad input breaks the render.** An unreadable date, a seconds token `S`, a `dayName` token and an unknown token `ZZ` each make the preview fail.

**Exactly two arguments.** An email that calls `DatePart` with one or with three arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--datepart" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--datepart" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Documented as unavailable in Next, yet accepted.** The reference's availability table says No for Marketing Cloud Next. In a Next email the tokens `Y`, `M`, `D`, `H` and `MI` all returned the expected parts (unpadded, 24-hour hour); only wrapping the result in `Length()` failed the render. [Card](/next/differs-from-docs/#datepart-available-in-next)

{% include platform-compare.html %}

## See also

- [FormatDate](/next/ampscript/functions/formatdate/) — padded values and month names
- [DateAdd](/next/ampscript/functions/dateadd/)
- [DateDiff](/next/ampscript/functions/datediff/)
- [Now](/next/ampscript/functions/now/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-part.html)
