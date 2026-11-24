---
layout: page
title: "AMPscript FormatNumber (Next)"
description: "Format a number with a standard pattern, optionally for a locale, with AMPscript FormatNumber in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including rounding and ignored custom patterns."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/formatnumber/
platforms:
  - next
syntax: "FormatNumber(number, format[, locale])"
return_type: string
min_args: 2
max_args: 3
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement rounds halves away from zero (`FormatNumber(2.5,\"N0\")` gives `3`); Next rounds to the even digit (`2`). Engagement applies custom patterns (`#,##0.00` gives `1,234.56`) and echoes an unknown pattern (`qqqq`); Next returns the number unchanged (`1234.555`) in both cases. `P`, `E` and a negative `C2` also differ: `123,455.50%`, `1.234555E+003` and `($1,234.56)` in Engagement, `123,455.500%`, `1.234555E03` and `-$1,234.56` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number` | string \| number | Yes | Value to format; a numeric string works and may carry thousands separators |
| `format` | string | Yes | Standard pattern letter with an optional precision digit, or a custom pattern |
| `locale` | string | No | Locale supplying separators and the currency symbol; hyphen or underscore |

In Next a custom pattern is accepted at save but returns the number unformatted. Use a standard pattern letter.

## Example

```ampscript
%%=FormatNumber(1234.555, "N2", "de-DE")=%%
```

Renders `1.234,56`; with `en-US` it renders `1,234.56`.

A precision digit sets the decimals:

```ampscript
%%=FormatNumber(1234.555, "N0")=%%
```

Renders `1,235`.

## Return value

**`string`** — the formatted number.

The result is open text. An unknown or custom pattern returns the number as it was passed in.

## Behaviour

**Standard patterns on `1234.555`:**

| Pattern | Result |
|---|---|
| `C` | `$1,234.56` |
| `E` | `1.234555E03` |
| `F` | `1234.56` |
| `G` | `1234.555` |
| `N` | `1,234.56` |
| `P` | `123,455.500%` |
| `R` | `1234.555` |
| `N0` | `1,235` |
| `N3` | `1,234.555` |
| `C0` | `$1,235` |

Lowercase `c` and `n` give the same output as their capitals. On the integer `123`, `D` gives `123` and `X` gives `7B`.

**Custom and unknown patterns return the number unchanged.** `0000`, `###0` and `#0.00` on `-1234.555` all give `-1234.555`; `#,##0.00` and `qqqq` on `1234.555` give `1234.555`; the two-section `#0.00;(#0.00)` on `-1234.555` also gives `-1234.555`.

**Halves round to the even digit.**

| Input | Pattern | Result |
|---|---|---|
| `2.5` | `N0` | `2` |
| `3.5` | `N0` | `4` |
| `-2.5` | `N0` | `-2` |
| `1.005` | `N2` | `1.00` |
| `1.004` | `N2` | `1.00` |

**Negatives get a minus sign.** `-1234.555` gives `-1,234.56` with `N2` and `-$1,234.56` with `C2`.

**A numeric string works like the number.** `"1234.555"` with `N2` gives `1,234.56`, and `"1234.5"` gives `1,234.50`.

**Locales.** With `N2` on `1234.555`:

| Locale | Result |
|---|---|
| `en-US` | `1,234.56` |
| `en_US` | `1,234.56` |
| `de-DE` | `1.234,56` |
| `de` | `1.234,56` |
| `fr-FR` | `1 234,56` (group separator U+202F) |
| `ja-JP` | `1,234.56` |
| `hi-IN` | `1,234.56` |
| `zz-ZZ` | `1,234.56` |
| `""` | `1,234.56` |

With a currency pattern the locale also sets the symbol: `C2` with `de-DE` gives `1.234,56 €` (U+00A0 before the euro sign), and `C` with `ja-JP` gives `￥1,235` with the full-width yen sign U+FFE5.

**Two arguments are the minimum.** An email with `FormatNumber(@value)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--formatnumber" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--formatnumber" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Halves round to the even digit.** The docs present rounding without naming the rule; their example rounds a trailing 5 up. In Next, with `N0`, `2.5` gave `2`, `-2.5` gave `-2` and `3.5` gave `4`. [Card](/next/differs-from-docs/#formatnumber-half-even-rounding)
- **`P` and `E` give shapes the page does not show.** Without a precision digit, `P` gave three decimals (`123,455.500%`) and `E` gave `1.234555E03`. [Card](/next/differs-from-docs/#formatnumber-percent-scientific-shape)
- **Localised output uses non-ASCII characters.** The docs show the German currency result with a plain space. Next puts U+00A0 before the euro sign, U+202F between French groups and the full-width `￥` for `ja-JP`. [Card](/next/differs-from-docs/#formatnumber-non-ascii-characters)

{% include platform-compare.html %}

## See also

- [FormatCurrency](/next/ampscript/functions/formatcurrency/) — currency with the symbol chosen by the locale
- [Format](/next/ampscript/functions/format/) — numbers and dates
- [FormatDate](/next/ampscript/functions/formatdate/) — dates only
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-formatNumber.html)
