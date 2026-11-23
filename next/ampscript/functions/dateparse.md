---
layout: page
title: "AMPscript DateParse (Next)"
description: "Turn a date string into a date value with AMPscript DateParse in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/dateparse/
platforms:
  - next
syntax: "DateParse(dateString[, useUtc])"
return_type: date
min_args: 1
max_args: 2
verification: in-progress
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "In Engagement the second argument switches to UTC (`DateParse(\"2026-03-04 09:05:07\",1)` gives `3/4/2026 3:05:07 PM`); in Next every spelling of it returns `3/4/2026 9:05:07 AM`. Offset, Zulu and GMT timestamps land six hours apart: `2026-03-04T09:05:07Z` gives `3:05:07 AM` in Engagement and `9:05:07 AM` in Next. An unreadable string aborts the Engagement page, while Next prints it back unchanged."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | A date or timestamp string, or an existing date value |
| `useUtc` | string \| boolean \| number | No | Whether to return the instant in UTC instead of the account time zone; defaults to off. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

In Next the second argument is accepted in all eight spellings, and even as an arbitrary word, but it did not change the value in any test.

## Example

```ampscript
%%=DateParse("2026-03-04T09:05:07")=%%
```

Renders `3/4/2026 9:05:07 AM`.

The result is a date, so it can go straight into a formatting call:

```ampscript
%%=FormatDate(DateParse("2026-03-04T09:05:07"), "yyyy-MM-dd")=%%
```

Renders `2026-03-04`.

## Return value

**`date`** — printed on its own as a US short date with a 12-hour clock and AM/PM: `3/4/2026 12:00:00 AM` for a date without a time. `Length()` over that value returns `20`.

`DatePart`, `FormatDate`, `DateAdd` and `DateDiff` all accept the result. Note that a `DateAdd` over it prints in ISO form (`2026-03-05T00:00:00`), not in the US form.

## Behaviour

**Common formats parse.**

| Call | Renders |
|---|---|
| `DateParse("2026-03-04")` | `3/4/2026 12:00:00 AM` |
| `DateParse("2026-03-04 09:05:07")` | `3/4/2026 9:05:07 AM` |
| `DateParse("2026-03-04 9:05:07 AM")` | `3/4/2026 9:05:07 AM` |
| `DateParse("2026-03-04T09:05:07")` | `3/4/2026 9:05:07 AM` |
| `DateParse("3/4/2026 9:05 AM")` | `3/4/2026 9:05:00 AM` |
| `DateParse("4 March 2026")` | `3/4/2026 12:00:00 AM` |
| `DateParse("March 4, 2026")` | `3/4/2026 12:00:00 AM` |

**Offsets in the input are applied.** `2026-03-04T09:05:07Z` gives `9:05:07 AM`, `+02:00` on the same clock time gives `7:05:07 AM`, and `-06:00` gives `3:05:07 PM`. The RFC form `Wed, 04 Mar 2026 09:05:07 GMT` gives `9:05:07 AM`, like the `Z` form.

**The second argument has no effect.** `1`, `0`, `true`, `false` and the quoted forms of all four returned `3/4/2026 9:05:07 AM` for `2026-03-04 09:05:07`, and a `DateDiff` in hours between the flag-off and flag-on results is `0`. The word `spring` is accepted as well.

**A time without a date parses.** `Format(DateParse("1:41 PM"), "HH:mm:ss")` renders `13:41:00`.

**A day-first date is read month-first.** `DateParse("5/8/2026")` gives `5/8/2026 12:00:00 AM`, the 8th of May, without any warning.

**A date value can be passed back in.** `DateDiff(DateParse(Now()), Now(), "MI")` is `0`.

**Unreadable input is printed back, not rejected.** `DateParse("not a date at all")` renders `not a date at all`, and the numeric string `"1772614800"` renders as those digits. The preview does not fail, so check the input before relying on the result.

**One or two arguments.** An email with `DateParse()` or with three arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--dateparse" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--dateparse" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Unreadable text is passed through.** The reference does not say what happens to text that is not a date. In Next, `DateParse("not a date at all")` returned that text unchanged, without failing. [Card](/next/differs-from-docs/#dateparse-unreadable-input-echoed)

{% include platform-compare.html %}

## See also

- [`DateParse` in Marketing Cloud Engagement](/engagement/ampscript/functions/dateparse/) — how it behaves there
- [StringToDate](/next/ampscript/functions/stringtodate/) — the same parsing without the second argument
- [FormatDate](/next/ampscript/functions/formatdate/) — the usual next call
- [DateAdd](/next/ampscript/functions/dateadd/)
- [DateDiff](/next/ampscript/functions/datediff/)
- [DatePart](/next/ampscript/functions/datepart/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-date-parse.html)
