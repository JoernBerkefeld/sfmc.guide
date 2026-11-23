---
layout: page
title: "AMPscript Format (Next)"
description: "Format a number or a date with AMPscript Format in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the patterns whose output differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/format/
platforms:
  - next
syntax: "Format(value, formatString[, dataFormat, cultureCode])"
return_type: string
min_args: 2
max_args: 4
verification: in-progress
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement aborts on `Number` as the data format; Next renders `$1,234.56`. Engagement applies custom patterns such as `#,##0.00` (`1,234.56`) and brackets a negative currency (`($1,234.56)`); Next returns `1234.555` and `-$1,234.56`. `P`, `E` and the French long date also differ: Engagement gives `123,455.50%`, `1.234555E+003` and `mercredi 4 mars 2026`, Next `123,455.500%`, `1.234555E03` and `mercredi, mars 4, 2026`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| date | Yes | Number, numeric string, date value or parseable date string |
| `formatString` | string | Yes | Standard .NET pattern; custom numeric patterns come back unformatted |
| `dataFormat` | string | No | `Date` in any capitalisation, `Number` or the empty string; another word makes the render fail |
| `cultureCode` | string | No | Locale for separators, symbols and month and day names |

## Example

```ampscript
%%=Format(1234.555, "C2")=%%
```

Renders `$1,234.56`.

For a localised number, keep the third slot empty so the fourth can be reached:

```ampscript
%%=Format(1234.555, "C2", "", "de-DE")=%%
```

Renders `1.234,56 €`, with a non-breaking space (U+00A0) before the euro sign.

For a date, put `Date` in the third slot:

```ampscript
%%[ SET @orderDate = "2026-03-04 13:52:07" ]%%
%%=Format(@orderDate, "D", "Date")=%%
```

Renders `Wednesday, March 4, 2026`.

## Return value

**`string`** — the formatted value.

The result is open text. A custom numeric pattern returns the input unchanged rather than raising anything.

## Behaviour

**`Number` is a working data format.** `Format(1234.555, "C2", "Number")` renders `$1,234.56`. An unknown word such as `Banana` in that slot makes the preview fail with HTTP 500.

**Two arguments are the minimum.** An email with `Format(@value)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Standard number patterns.** On `1234.555`: `N2` gives `1,234.56`, `C2` gives `$1,234.56`, `P` gives `123,455.500%` (three decimals) and `E` gives `1.234555E03` (no plus sign, two exponent digits). The numeric string `"1234.555"` formats the same as the number, and `"1234.5"` with `N2` gives `1,234.50`.

**A negative currency gets a minus sign.** `Format(-1234.555, "C2")` gives `-$1,234.56`, not a bracketed form.

**Custom numeric patterns are ignored.** `Format(1234.555, "#,##0.00")` gives `1234.555`, the input as it was.

### Dates

All rows below use the input `2026-03-04 13:52:07`:

| Pattern | Data format | Culture | Result |
|---|---|---|---|
| `yyyy-MM-dd HH:mm:ss` | `Date` | | `2026-03-04 13:52:07` |
| `yyyy-MM-dd HH:mm:ss` | *(omitted)* | | `2026-03-04 13:52:07` |
| `d` | `Date` | | `3/4/2026` |
| `D` | `Date` | | `Wednesday, March 4, 2026` |
| `D` | `date` | | `Wednesday, March 4, 2026` |
| `dddd` | `Date` | | `Wednesday` |
| `dddd` | `Date` | `de-DE` | `Mittwoch` |
| `D` | `Date` | `fr-FR` | `mercredi, mars 4, 2026` |

The data format is optional for a custom date pattern and accepts any capitalisation. The culture translates day and month names, but the French long date keeps the US order of the parts.

In the same Next email, [FormatDate](/next/ampscript/functions/formatdate/) with the pattern `yyyy-MM-dd HH:mm:ss` gave the same `2026-03-04 13:52:07`, minutes included.

{% include test-script.html bundle="next-ampscript-functions--format" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--format" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The French long date keeps the US order.** The docs show `D` in French with the day number before the month. Next rendered `mercredi, mars 4, 2026` for `fr-FR`. [Card](/next/differs-from-docs/#format-french-long-date-order)
- **Number codes give shapes the page does not show.** The docs name the codes without output examples. In Next `P` gave three decimals (`123,455.500%`), `E` gave `1.234555E03`, and a custom pattern such as `#,##0.00` returned the number unformatted. [Card](/next/differs-from-docs/#format-number-pattern-output)

{% include platform-compare.html %}

## See also

- [`Format` in Marketing Cloud Engagement](/engagement/ampscript/functions/format/) — how it behaves there
- [FormatNumber](/next/ampscript/functions/formatnumber/) — numbers only
- [FormatCurrency](/next/ampscript/functions/formatcurrency/) — currency for a locale
- [FormatDate](/next/ampscript/functions/formatdate/) — dates only
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-format.html)
