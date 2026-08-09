---
layout: page
title: "FormatDate"
description: "Formats a date according to a date pattern, a time pattern and a locale. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that mm in the date pattern renders the month, not the minutes."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/formatdate/
platforms:
  - engagement
  - next
syntax: "FormatDate(dateString[, dateFormat, timeFormat, localeCode])"
return_type: string
min_args: 1
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | The date to format, either a real date value or a parseable date string |
| `dateFormat` | string | No | The date pattern, or a single-letter standard format such as `D`, `G` or `s` |
| `timeFormat` | string | No | The time pattern — the only argument in which `mm` means minutes |
| `localeCode` | string | No | The locale for month and day names, written with a hyphen or an underscore |

## Example

```html
%%[
  VAR @d, @out
  SET @d = "2026-03-04 13:52:07"
  SET @out = FormatDate(@d, "yyyy-MM-dd", "HH:mm:ss")
]%%
%%=v(@out)=%%
```

Renders `2026-03-04 13:52:07`.

The split across two arguments is not optional styling — it is what makes the time correct. Putting the whole pattern in the date argument, the way a single .NET format string would be written, silently returns the wrong minutes:

```html
%%[
  VAR @d, @wrong, @right
  SET @d = "2026-03-04 13:52:07"
  SET @wrong = FormatDate(@d, "yyyy-MM-dd HH:mm:ss")
  SET @right = FormatDate(@d, "yyyy-MM-dd", "HH:mm:ss")
]%%
<p>One argument: %%=v(@wrong)=%%</p>
<p>Two arguments: %%=v(@right)=%%</p>
```

The first line renders `2026-03-04 13:03:07` and the second `2026-03-04 13:52:07`. Why the minutes became `03` is the subject of the next chapter.

## Return value

**`string`** — the formatted date.

There is no closed set of sentinel values: the output is whatever the pattern produced. The one value worth testing for is the **empty string**, which comes back whenever the first argument cannot be read as a date — an unparseable string, an empty string and a number all returned it.

## Behaviour

**The two pattern arguments are separate token sets.** Whatever the second argument contains is resolved as a date pattern and whatever the third contains as a time pattern, and the same letters can mean different things in each. This is why a pattern that looks correct as a single .NET format string comes out wrong: split it across the two arguments instead.

**Tokens ignore case entirely.** `YYYY` rendered `2026` exactly as `yyyy` did, `mmmm` rendered `March` exactly as `MMMM` did, and `DDDD` matched `dddd`. Capitalisation is therefore never a way to disambiguate two meanings of the same letters.

**Single-letter tokens select a standard format, not an unpadded number.** For `2026-03-04 13:52:07`, `d` rendered `3/4/2026` and `M` rendered `March 4`. In the time argument, `h` or `H` on its own does not render an hour at all — it aborts the page. Use `dd`, `MM`, `hh` and `HH`.

**A standard-format letter can stand in for the whole pattern.** `G` rendered `3/4/2026 1:52:07 PM`, `F` rendered `Wednesday, March 4, 2026 1:52:07 PM`, `r` rendered `Wed, 04 Mar 2026 13:52:07 GMT` and `o` rendered `2026-03-04T13:52:07.0000000`. Two are worth knowing about: `D` gave the short date `3/4/2026` rather than a long one, and `U` rendered `Wednesday, March 4, 2026 7:52:07 PM` — six hours ahead, because it treats the input as local and renders it as UTC.

**The locale accepts either separator and falls back silently.** `fr-FR` and `fr_FR` produced identical output. `uk_UA` rendered `04.03.2026` where `en-US` rendered `3/4/2026`, and French month names come back lower-cased (`mars`). A locale code that does not exist is not rejected — a made-up one still rendered a date.

**Bad input is not reported, it is swallowed.** An unparseable date, an empty date and a number each returned an empty string at HTTP 200. An unrecognised format token is echoed back literally — `qqqq` rendered `qqqq`. A caller cannot tell a failed parse from a legitimately empty result, so validate the input before formatting it.

**Input can be a real date value, not only a string.** The output of `DateAdd(Now(), 1, "D")` formatted directly, with no conversion step, as did `Now()` itself.

### The date pattern's `mm` is the month, and the day names are shifted

| Call | Renders |
|---|---|
| `FormatDate(@d, "mm")` | `03` — the month |
| `FormatDate(@d, "", "mm")` | `52` — the minutes |
| `FormatDate(@d, "yyyy-MM-dd HH:mm:ss")` | `2026-03-04 13:03:07` |
| `FormatDate(@d, "yyyy-MM-dd", "HH:mm:ss")` | `2026-03-04 13:52:07` |
| `FormatDate(@d, "ddd")` | `We4ne74a26` |
| `FormatDate(@d, "dddd")` | `Wed` |
| `FormatDate(@d, "ddddd")` | `Wednesday` |

All against `@d = "2026-03-04 13:52:07"`, a Wednesday.

Minutes are simply not addressable from the date pattern: `mm` and `MM` are the same token there and both give the month. Move to the time pattern and both give the minutes. The day-name tokens are shifted by one repetition against what the reference promises, and `ddd` does not produce a day name at all — the digits in `We4ne74a26` come from the date itself, and a December date produced `ri25a26` the same way. Never use `ddd`. See [the differs-from-docs card](/engagement/differs-from-docs/#formatdate-date-pattern-tokens-mean-something-else) for the full comparison against the official reference.

{% include test-script.html bundle="ampscript-functions--formatdate" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Marketing Cloud Next uses a different pattern dialect — Java-style format strings rather than the .NET-style ones proven here — so a pattern written for Engagement is not portable as-is.

## See also

- [Now](/engagement/ampscript/functions/now/) — the value most often passed into this function
- [The differs-from-docs card](/engagement/differs-from-docs/#formatdate-date-pattern-tokens-mean-something-else) — what the official reference claims and what the runtime does
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-format-date.html) · [ampscript.guide](https://ampscript.guide/formatdate/)
