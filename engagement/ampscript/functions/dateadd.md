---
layout: page
title: "DateAdd"
description: "Adds a whole number of intervals to a date. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that any unit outside the documented five destroys the page rather than returning a value."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/dateadd/
platforms:
  - engagement
  - next
syntax: "DateAdd(date, amountToAdd, unitToAdd)"
return_type: date
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
| `date` | string \| date | Yes | The date to adjust, either a real date value or a parseable date string |
| `amountToAdd` | string \| number | Yes | A whole number of intervals — negative subtracts, and a decimal aborts the page |
| `unitToAdd` | string | Yes | One of `Y`, `M`, `D`, `H` or `MI`, in any capitalisation. Nothing else is accepted |

## Example

```html
%%[
  VAR @d, @due
  SET @d = "2026-03-04 13:52:07"
  SET @due = DateAdd(@d, 14, "D")
]%%
%%=v(@due)=%%
```

Renders `3/18/2026 1:52:07 PM`.

The amount may arrive as a string, which is what happens when it comes out of a data extension field — no conversion step is needed:

```html
%%[
  VAR @d, @a, @b
  SET @d = "2026-03-04 13:52:07"
  SET @a = DateAdd(@d, 1, "D")
  SET @b = DateAdd(@d, "1", "D")
]%%
<p>Number: %%=v(@a)=%%</p>
<p>String: %%=v(@b)=%%</p>
```

Both lines render `3/5/2026 1:52:07 PM`.

## Return value

**`date`** — the adjusted date, which the other date functions accept directly without formatting or re-parsing. `DateAdd(DateAdd(@d, 1, "D"), 1, "D")` works, and so does passing the result straight into [FormatDate](/engagement/ampscript/functions/formatdate/).

There is no failure value to test for. Every rejected argument aborts the page with HTTP 422 instead of returning an empty string, so a result that exists is always a real date.

## Behaviour

**The five units are the whole list, and they ignore case.** `Y`, `M`, `D`, `H` and `MI` each advance exactly one field and leave the rest alone. Capitalisation makes no difference anywhere: `y`, `m`, `d`, `h`, `mi`, `Mi` and `mI` all matched their upper-case spelling exactly.

**Anything else costs you the entire page.** There is no seconds unit, no weeks unit, no quarters, no milliseconds, and no spelled-out long forms — the word for a day is rejected just as an unknown two-letter token is. Each of those returned HTTP 422 with no output at all, while a control call in the same deployment rendered normally. Since nothing is written when the page aborts, a bad unit is not something the caller can detect and recover from; validate it before the call. For seconds, adjust in minutes or use a different approach entirely.

**The amount must be whole.** Negative subtracts, zero returns the date unchanged, and a large amount rolls the year over correctly. A numeric string is fine in either sign. A decimal is not — neither `1.5` nor `"1.5"` is rounded or truncated, and both abort, as does a non-numeric word.

**A date string and a real date value are interchangeable.** ISO, US slash and spelled-out month forms all parsed, and the output of `Now()` was accepted with no conversion. But unlike [FormatDate](/engagement/ampscript/functions/formatdate/), which quietly returns an empty string for input it cannot read, `DateAdd` aborts: an unparseable string, an empty string and a plain number each killed the page. Two neighbouring functions, opposite failure modes.

### Month arithmetic clamps, and the clamp is not reversible

| Call | Renders |
|---|---|
| `DateAdd("2026-01-31 13:52:07", 1, "M")` | `2/28/2026 1:52:07 PM` |
| `DateAdd("2026-01-31 13:52:07", 2, "M")` | `3/31/2026 1:52:07 PM` |
| `DateAdd(DateAdd("2026-01-31 13:52:07", 1, "M"), -1, "M")` | `1/28/2026 1:52:07 PM` |
| `DateAdd("2028-02-29 09:00:00", 1, "Y")` | `2/28/2029 9:00:00 AM` |

Adding a month to the 31st of a month pulls the day back to the last valid one rather than spilling into the following month. The second row shows the clamp is applied to each result rather than carried forward — two months from the same base restores the 31st.

The third row is the one that bites. Stepping forward a month and back again lands on the 28th, three days from where you started, so any loop that walks a date across month boundaries and expects to return to its origin will drift. If you need month-end semantics, compute the day of month yourself.

{% include test-script.html bundle="ampscript-functions--dateadd" chapter="behaviour" %}

{% include callout.html type="warning" title="One rejected argument discards the whole page" content="AMPscript has no try/catch, so a bad unit, a decimal amount or an unreadable date aborts the render and throws away everything already written above it. When testing, put each risky call behind its own `RequestParameter` branch and fetch them one at a time — otherwise a single failure hides every result on the page." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Now](/engagement/ampscript/functions/now/) — the value most often passed in as the first argument
- [FormatDate](/engagement/ampscript/functions/formatdate/) — formats the result, and swallows bad input where this function aborts
- [The differs-from-docs cards](/engagement/differs-from-docs/#dateadd-unlisted-unit-aborts-the-page) — what the official reference leaves unsaid
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-add.html) · [ampscript.guide](https://ampscript.guide/dateadd/)
