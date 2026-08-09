---
layout: page
title: "Format"
description: "Formats a number, a date or a string with a .NET pattern. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that the documented data-format value Number aborts the page, and that this function and FormatDate disagree on the same date."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/format/
platforms:
  - engagement
  - next
syntax: "Format(value, formatString[, dataFormat, cultureCode])"
return_type: string
min_args: 2
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
| `value` | string \| number \| date | Yes | Number, numeric string, date value or parseable date string |
| `formatString` | string | Yes | Standard or custom .NET pattern |
| `dataFormat` | string | No | Only `Date`, in any capitalisation, or the empty string |
| `cultureCode` | string | No | Locale for separators, symbols and month and day names |

## Example

For a number, leave the third parameter out entirely:

```html
%%=Format(1234.555, "C2")=%%
```

That renders `$1,234.56`. To localise a number, pass the **empty string** in the third slot so the fourth remains reachable:

```html
%%=Format(1234.555, "C2", "", "de-DE")=%%
```

That renders `1.234,56 €`.

For a date, `Date` in the third slot unlocks the date patterns:

```html
%%[
  VAR @orderDate
  SET @orderDate = AttributeValue("OrderDate")
]%%
Ordered on %%=Format(@orderDate, "D", "Date", "fr-FR")=%%
```

Do **not** write `"Number"` in the third slot — see the warning below.

## Return value

**`string`** — the formatted value.

The domain is open, so there is no set of literals to test for. When the pattern does not suit the input, the input or the pattern comes back unformatted rather than raising anything.

## Behaviour

{% include callout.html type="danger" title="The documented value `Number` takes the page down" content="The official reference names <code>Date</code> and <code>Number</code> as the two values of the third parameter. Passing the literal <code>Number</code> aborts the page with HTTP 422 and discards every byte of output, with or without a locale after it — an invented value produced exactly the same abort. Use the empty string, or omit the parameter." %}

**For numbers, this behaves as `FormatNumber` does.** Same patterns, same half-up rounding, same bracketed negative under a currency pattern: `-1234.555` under `C2` gave `($1,234.56)`.

**A numeric string is accepted** and formats identically to the number.

**The third parameter is optional for dates too.** A date-shaped string with a custom date pattern rendered correctly with the parameter omitted.

**An unusable pattern is echoed rather than rejected.** A digit-group pattern applied to a plain digit string rendered without any separators being inserted, at HTTP 200.

### The same pattern means different things

The pattern is read against the input, not on its own:

| Pattern | Input | Result |
|---|---|---|
| `E` | `1234.555` | `1.234555E+003` |
| `d` | `2026-03-04 13:52:07` | `3/4/2026` |
| `D` | `2026-03-04 13:52:07` | `Wednesday, March 4, 2026` |
| `dddd` | `2026-03-04 13:52:07` | `Wednesday` |

A single letter is a numeric pattern for a number and a date pattern for a date, so moving a pattern string between call sites can silently change what it means.

### Format and FormatDate disagree

Both calls below were made in one render, on the identical input `2026-03-04 13:52:07` and the identical pattern `yyyy-MM-dd HH:mm:ss`:

| Function | Result |
|---|---|
| `Format` | `2026-03-04 13:52:07` |
| `FormatDate` | `2026-03-04 13:03:07` |

`FormatDate` rendered the minutes wrong. For a minute-precise pattern this function is the safer of the two.

### Localised dates

The fourth parameter changes month and day names, not just the separators: `D` with `fr-FR` gave `mercredi 4 mars 2026`, and `dddd` with `de-DE` gave `Mittwoch`. `Date` may be written in any capitalisation.

{% include test-script.html bundle="ampscript-functions--format" chapter="behaviour" %}

{% include callout.html type="warning" title="Argument-count probes need their own deploy" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including the control block and branches that were never requested. Keep arity checks out of a gated behaviour harness and give each one its own deployment." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [FormatNumber](/engagement/ampscript/functions/formatnumber/) — numbers only, without the third-parameter trap
- [FormatCurrency](/engagement/ampscript/functions/formatcurrency/) — currency, with the symbol chosen for you
- [FormatDate](/engagement/ampscript/functions/formatdate/) — dates only; compare the minutes before choosing it
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-format.html) · [ampscript.guide](https://ampscript.guide/format/)
