---
layout: page
title: "Now"
description: "Returns the current system date and time in Central Standard Time. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that every call in one render returns the same frozen instant."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/now/
platforms:
  - engagement
  - next
syntax: "Now([persistFormat])"
return_type: date
min_args: 0
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
| `persistFormat` | string \| boolean \| number | No | Selects the send job time instead of the current time when the content is rendered by a send |

The argument accepts `1`/`0`, `true`/`false`, or any of those four words quoted as a string. On a CloudPage it makes no difference to the value.

## Example

```html
%%[
  VAR @stamp
  SET @stamp = Now()
]%%
%%=v(@stamp)=%%
```

That renders the US short date followed by a 12-hour clock and an AM or PM suffix — month, day, four-digit year, then the hour without a leading zero.

Because the value is a real date rather than text, it goes straight into the other date functions:

```html
%%[
  VAR @expires
  SET @expires = FormatDate(DateAdd(Now(), 7, "D"), "yyyy-MM-dd")
]%%
<p>Offer valid until %%=v(@expires)=%%.</p>
```

## Return value

**`date`** — the system date and time.

There is no closed set of sentinel values to test for: the value is a point in time and a rejected call aborts the page rather than returning a marker.

## Behaviour

**The value is Central Standard Time, with no daylight-saving shift.** Measured against a UTC reference in the same August render, the returned time ran six hours behind — the winter offset, not the five-hour summer one. It is also not the business unit's own local time: `SystemDateToLocalDate` applied to the same value returned a time exactly 480 minutes ahead of it, so a page that needs the reader's clock has to convert.

**Every call within one render returns the same instant.** A captured copy, a later separate call and the banner printed at the top of the same page all agreed — and not merely to the second: two separate calls read to six fractional-second digits produced identical values within a render, and different ones across renders. A page can therefore call it repeatedly without the timestamps drifting apart.

**The value is a date, not a string.** `DateAdd` advanced it by three hours, `DateDiff` measured that gap back as `3`, and `DatePart` extracted the year and the hour from it directly, with no parsing step.

### The argument is accepted in any spelling and changes nothing on a CloudPage

| Call | Result |
|---|---|
| `Now(1)` / `Now(0)` | the same instant as a bare `Now()` |
| `Now(true)` / `Now(false)` | the same instant |
| `Now("1")` / `Now("true")` | the same instant |
| `Now("spring")` | the same instant |

The `DateDiff` in minutes between `Now()` and `Now(1)` in one render was `0`. The argument selects the send job's start or publish time, which only exists when a send renders the content — a CloudPage has no such context, so the switch has nothing to select and the current time comes back regardless. Nothing about the argument is validated either: a word that is not a flag at all was accepted as readily as `1`. That is why the parameter is typed as three types rather than one.

{% include test-script.html bundle="ampscript-functions--now" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [AMPscript Function Reference](/engagement/ampscript/functions/) — the sibling Date and Time functions that consume this value
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-now.html) · [ampscript.guide](https://ampscript.guide/now/)
