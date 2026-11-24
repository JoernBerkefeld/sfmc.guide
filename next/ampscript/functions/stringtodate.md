---
layout: page
title: "AMPscript StringToDate (Next)"
description: "Turn a date string into a date value with AMPscript StringToDate in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/stringtodate/
platforms:
  - next
syntax: "StringToDate(dateString)"
return_type: date
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Plain, ISO and spelled-out dates render the same. Offset, Zulu and GMT timestamps land six hours apart: `2026-03-04T09:05:07Z` gives `3:05:07 AM` in Engagement and `9:05:07 AM` in Next. An unreadable string aborts the Engagement page, while Next prints it back unchanged."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | A date or timestamp string, or an existing date value |

## Example

```ampscript
%%=StringToDate("2026-03-04T09:05:07")=%%
```

Renders `3/4/2026 9:05:07 AM`.

The result is a date, so it can be formatted directly:

```ampscript
%%=FormatDate(StringToDate("2026-03-04T09:05:07"), "yyyy-MM-dd")=%%
```

Renders `2026-03-04`.

## Return value

**`date`** — printed on its own as a US short date with a 12-hour clock and AM/PM: `3/4/2026 12:00:00 AM` for a date without a time. `Length()` over that value returns `20`.

`DatePart`, `FormatDate`, `DateAdd` and `DateDiff` all accept the result. A `DateAdd` over it prints in ISO form (`2026-03-05T00:00:00`).

## Behaviour

**Same result as DateParse.** A `DateDiff` in hours between `StringToDate` and `DateParse` over `2026-03-04 09:05:07` is `0`.

| Call | Renders |
|---|---|
| `StringToDate("2026-03-04")` | `3/4/2026 12:00:00 AM` |
| `StringToDate("2026-03-04 09:05:07")` | `3/4/2026 9:05:07 AM` |
| `StringToDate("2026-03-04T09:05:07")` | `3/4/2026 9:05:07 AM` |
| `StringToDate("3/4/2026 9:05 AM")` | `3/4/2026 9:05:00 AM` |
| `StringToDate("4 March 2026")` | `3/4/2026 12:00:00 AM` |
| `StringToDate("March 4, 2026")` | `3/4/2026 12:00:00 AM` |
| `StringToDate("2026-03-04T09:05:07Z")` | `3/4/2026 9:05:07 AM` |
| `StringToDate("2026-03-04T09:05:07+02:00")` | `3/4/2026 7:05:07 AM` |
| `StringToDate("Wed, 04 Mar 2026 09:05:07 GMT")` | `3/4/2026 9:05:07 AM` |

**A time without a date parses.** `Format(StringToDate("1:41 PM"), "HH:mm:ss")` renders `13:41:00`.

**A day-first date is read month-first.** `StringToDate("5/8/2026")` gives `5/8/2026 12:00:00 AM`, the 8th of May.

**A date value can be passed in.** `DateDiff(StringToDate(Now()), Now(), "MI")` is `0`.

**Unreadable input is printed back.** `StringToDate("not a date at all")` renders `not a date at all` instead of failing, so check the input before relying on the result.

**Exactly one argument.** An email with `StringToDate()`, with a second flag argument like the one `DateParse` takes, or with an encoding argument such as `"UTF-8"` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--stringtodate" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--stringtodate" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Unreadable text is passed through.** The reference does not say what happens to text that is not a date. In Next, `StringToDate("not a date at all")` returned that text unchanged, without failing. [Card](/next/differs-from-docs/#stringtodate-unreadable-input-echoed)

{% include platform-compare.html %}

## See also

- [DateParse](/next/ampscript/functions/dateparse/) — the same parsing, with an optional second argument
- [FormatDate](/next/ampscript/functions/formatdate/) — the usual next call
- [DateAdd](/next/ampscript/functions/dateadd/)
- [DateDiff](/next/ampscript/functions/datediff/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-string-to-date.html)
