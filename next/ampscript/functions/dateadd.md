---
layout: page
title: "AMPscript DateAdd (Next)"
description: "Add intervals to a date with AMPscript DateAdd in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/dateadd/
platforms:
  - next
syntax: "DateAdd(date, amountToAdd, unitToAdd)"
return_type: date
min_args: 3
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement prints the result as `1/22/2026 12:00:00 AM` where Next prints `2026-01-22T00:00:00`. Engagement aborts the page on a seconds unit and on a decimal amount; Next renders `2026-03-04T13:52:37` for `DateAdd(\"2026-03-04 13:52:07\",30,\"S\")` and adds one day for an amount of `1.5` days."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `date` | string \| date | Yes | The date to adjust, either a real date value or a parseable date string |
| `amountToAdd` | string \| number | Yes | The number of intervals; negative subtracts. A decimal is accepted, and `1.5` days added one day |
| `unitToAdd` | string | Yes | One of `Y`, `M`, `D`, `H`, `MI` or `S`. The first five work in any capitalisation |

## Example

```ampscript
%%=DateAdd("2026-01-15", 7, "D")=%%
```

Renders `2026-01-22T00:00:00`.

Wrap the result in `Format` when the output needs a particular shape:

```ampscript
%%=Format(DateAdd("2026-03-04 13:52:07", 1, "D"), "yyyy-MM-dd HH:mm:ss")=%%
```

Renders `2026-03-05 13:52:07`.

## Return value

**`date`** — the adjusted date. Printed on its own it comes out in ISO form, date and time joined by a `T` with no time zone suffix: `DateAdd("2026-03-04 13:52:07", -3, "H")` gives `2026-03-04T10:52:07`.

The value goes straight into other date functions. `DateAdd(DateAdd("2026-03-04 13:52:07", 1, "D"), 1, "D")` lands on March 6, and `Format` and `FormatDate` accept it directly.

## Behaviour

**Five units move one field each.** From `2026-03-04 13:52:07`, adding one `Y`, `M`, `D`, `H` or `MI` gave `2027-03-04 13:52:07`, `2026-04-04 13:52:07`, `2026-03-05 13:52:07`, `2026-03-04 14:52:07` and `2026-03-04 13:53:07` (formatted with `yyyy-MM-dd HH:mm:ss`). Lower-case and mixed-case spellings (`y`, `m`, `d`, `h`, `mi`, `Mi`, `mI`) gave the same results.

**Seconds work too.** `DateAdd("2026-03-04 13:52:07", 30, "S")` renders `2026-03-04T13:52:37`.

**Other unit tokens break the render.** An email with a weeks unit `W`, a milliseconds unit `MS`, the word `day` or an unknown token `ZZ` saves and publishes, but its preview fails. Stick to the six units above.

**The amount is flexible.** A negative amount subtracts, zero leaves the date unchanged, and `400` days rolls into the next year (`2027-04-08`). A numeric string such as `"1"` or `"-1"` works like the number. A decimal does not fail: `1.5` days gave the same result as `1`. A word such as `"two"` makes the preview fail.

**Date strings and date values both work.** ISO (`2026-01-15`), US slash (`1/1/2026`) and spelled-out (`1 January 2026`) strings parse, and `Now()` is accepted directly. A string that is not a date, such as `not a date at all`, makes the preview fail.

**Exactly three arguments.** An email that calls `DateAdd` with two or with four arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

### Month arithmetic clamps to the month end

| Call (formatted `yyyy-MM-dd HH:mm:ss`) | Renders |
|---|---|
| `DateAdd("2026-01-31 13:52:07", 1, "M")` | `2026-02-28 13:52:07` |
| `DateAdd("2026-01-31 13:52:07", 2, "M")` | `2026-03-31 13:52:07` |
| `DateAdd(DateAdd("2026-01-31 13:52:07", 1, "M"), -1, "M")` | `2026-01-28 13:52:07` |
| `DateAdd("2026-03-31 09:00:00", -1, "M")` | `2026-02-28 09:00:00` |
| `DateAdd("2028-02-29 09:00:00", 1, "Y")` | `2029-02-28 09:00:00` |

A month added to the 31st lands on the last day of a shorter month. Going forward one month and back one month does not return to the start: the 31st becomes the 28th.

{% include test-script.html bundle="next-ampscript-functions--dateadd" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--dateadd" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The result prints in ISO form.** The reference's example shows a `DateAdd` value printed as a US date with AM/PM. In Next, `DateAdd("2026-01-15", 7, "D")` printed `2026-01-22T00:00:00`. [Card](/next/differs-from-docs/#dateadd-prints-iso)
- **Fractional amounts are cut silently.** The reference does not say that a decimal amount loses its fraction. In Next, adding `1.5` days added exactly one day, with no error. [Card](/next/differs-from-docs/#dateadd-decimal-amount-truncated)

{% include platform-compare.html %}

## See also

- [DateDiff](/next/ampscript/functions/datediff/) — the difference between two dates
- [FormatDate](/next/ampscript/functions/formatdate/) — shapes the result
- [Now](/next/ampscript/functions/now/) — a common first argument
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-add.html)
