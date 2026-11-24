---
layout: page
title: "AMPscript Now (Next)"
description: "Get the current date and time with AMPscript Now in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/now/
platforms:
  - next
syntax: "Now()"
return_type: date
min_args: 0
max_args: 0
verification: in-progress
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts an optional flag (`Now(1)`, `Now(true)`, `Now(\"1\")`, even `Now(\"spring\")`); Next rejects every one of those at save. Printed on its own the value looks like `8/8/2026 5:31:44 PM` in Engagement and like `2026-11-22T15:28:39` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

None. An email that passes any argument, such as `Now(1)`, `Now(true)`, `Now("1")` or `Now("spring")`, cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

## Example

```ampscript
%%=Now()=%%
```

Renders a value like `2026-11-22T15:28:39`.

Format it for a fixed shape:

```ampscript
%%=Format(Now(), "yyyy-MM-dd")=%%
```

Renders a 10-character date such as `2026-11-22`.

## Return value

**`date`** — the current date and time. Printed on its own it comes out in ISO form, date and time joined by a `T`, with no time zone suffix.

## Behaviour

**The value is a date.** `DateDiff(Now(), DateAdd(Now(), 3, "H"), "H")` gives `3`, and `DatePart(Now(), "Y")` gives the current year.

**It is fixed for the whole render.** A value saved in a variable at the top and a fresh `Now()` further down are `0` minutes apart, and two calls of `FormatDate(Now(), "ffffff")` printed the identical value. That pattern did not produce fractional seconds: it printed the full ISO timestamp.

**No arguments.** Every argument form is rejected at save, including two arguments (`Now(1, 1)`).

The time zone of the value and the send-time behaviour were not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--now" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--now" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The optional argument is refused at save.** The reference documents `Now(true)` for the send time. In Next any argument, including `true`, `1` and their quoted forms, makes the email unsavable (HTTP 400, "The AMPscript syntax isn't valid"). [Card](/next/differs-from-docs/#now-argument-rejected)

{% include platform-compare.html %}

## See also

- [DateAdd](/next/ampscript/functions/dateadd/)
- [DateDiff](/next/ampscript/functions/datediff/)
- [FormatDate](/next/ampscript/functions/formatdate/) — gives the value a fixed shape
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-now.html)
