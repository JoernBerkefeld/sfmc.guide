---
layout: page
title: "FormatNumber"
description: "Formats a number with a .NET numeric pattern, optionally for a locale. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including half-up rounding, case-insensitive pattern letters, and the fact that an unrecognised pattern is echoed back instead of failing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/formatnumber/
platforms:
  - engagement
  - next
syntax: "FormatNumber(number, format[, locale])"
return_type: string
min_args: 2
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
| `number` | string \| number | Yes | Value to format; a numeric string works and may carry thousands separators |
| `format` | string | Yes | Standard pattern letter with an optional precision digit, or a custom pattern |
| `locale` | string | No | Locale supplying separators and the currency symbol; hyphen or underscore |

## Example

Two decimals with thousands separators, in the reader's own locale:

```html
%%[
  VAR @total, @locale
  SET @total = 1234.555
  SET @locale = AttributeValue("Locale")
]%%
Total: %%=FormatNumber(@total, "N2", @locale)=%%
```

With `de-DE` that renders `1.234,56`; with `en-US`, `1,234.56`.

A precision digit after the letter overrides the default, so `N0` gives a whole number:

```html
%%=FormatNumber(1234.555, "N0")=%%
```

Check the pattern carefully — a typo does not raise anything, it prints:

```html
%%=FormatNumber(1234.555, "qqqq")=%%
```

That renders the literal text `qqqq` to the reader.

## Return value

**`string`** — the number rendered with the requested pattern.

The domain is open, so there is no set of literals to test for. When the pattern is not recognised the pattern itself comes back instead.

## Behaviour

**Pattern letters are case-insensitive.** Lowercase `c` and `n` produced exactly the same output as their capitals. Neither reference mentions this.

**A precision digit sets the decimal places.** `N0`, `N2` and `N3` on the same input gave `1,235`, `1,234.56` and `1,234.555`.

**An unrecognised pattern is echoed back at HTTP 200.** There is no error and no empty string — the pattern string is what the reader sees, which makes a typo easy to miss in review.

**`D` and `X` need a whole number.** On the integer `123` they gave `123` and `7B`.

**A numeric string is accepted** and formats identically to the number.

**Negatives depend on the pattern family.** `N2` produced `-1,234.56` with a minus sign, but `C2` produced `($1,234.56)` in brackets. Code that strips a leading minus to detect a negative misses the currency case entirely.

### Rounding is half-up, not banker's rounding

This is the single most likely wrong assumption, because .NET's own `Math.Round` defaults the other way.

| Input | Pattern | Result | Banker's rounding would give |
|---|---|---|---|
| `2.5` | `N0` | `3` | `2` |
| `3.5` | `N0` | `4` | `4` |
| `-2.5` | `N0` | `-3` | `-2` |
| `1.005` | `N2` | `1.01` | `1.00` |
| `1.004` | `N2` | `1.00` | `1.00` |

Halves always move away from zero. For financial output that is usually what is wanted, but it must not be assumed to match a rounding step performed elsewhere in the pipeline.

### Standard patterns on the same input

Every result below is `1234.555` formatted with the default locale:

| Pattern | Result |
|---|---|
| `C` | `$1,234.56` |
| `E` | `1.234555E+003` |
| `F` | `1234.56` |
| `G` | `1234.555` |
| `N` | `1,234.56` |
| `P` | `123,455.50%` |
| `R` | `1234.555` |
| `N0` | `1,235` |
| `N3` | `1,234.555` |
| `C0` | `$1,235` |

`P` treats the value as a ratio and multiplies it by 100 — passing an already-computed percentage through `P` inflates it a hundredfold.

### Custom patterns

| Pattern | Input | Result |
|---|---|---|
| `0000` | `-1234.555` | `-1235` |
| `###0` | `-1234.555` | `-1235` |
| `#0.00` | `-1234.555` | `-1234.56` |
| `#,##0.00` | `1234.555` | `1,234.56` |
| `#0.00;(#0.00)` | `-1234.555` | `(1234.56)` |

The two-section form selects its second section for negative values, which is how a bracketed negative is produced without a currency pattern.

### Locales accept more names than either reference lists

| Locale argument | Result for `N2` |
|---|---|
| `en-US` | `1,234.56` |
| `en_US` | `1,234.56` |
| `de-DE` | `1.234,56` |
| `fr-FR` | `1 234,56` |
| `ja-JP` | `1,234.56` |
| `hi-IN` | `1,234.56` |
| `de` | `1.234,56` |
| `zz-ZZ` | `1,234.56` |
| `""` | `1,234.56` |

The underscore form works, a language-only code works, and an unknown code falls back to the US format rather than aborting — so a bad locale value fails silently rather than loudly. The `fr-FR` group separator is a **non-breaking space** (U+00A0), not a plain space; string comparisons against that output need to expect it.

With a currency pattern the locale also supplies the symbol and its position: `C2` with `de-DE` gave `1.234,56 €`, and `C` with `ja-JP` gave `¥1,235` — leading symbol, no decimals.

{% include test-script.html bundle="ampscript-functions--formatnumber" chapter="behaviour" %}

{% include callout.html type="warning" title="Argument-count probes need their own deploy" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including the control block and branches that were never requested. Keep arity checks out of a gated behaviour harness and give each one its own deployment." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [FormatCurrency](/engagement/ampscript/functions/formatcurrency/) — the same locale machinery, with the symbol and its position chosen for you
- [Format](/engagement/ampscript/functions/format/) — the general form, which handles dates as well
- [FormatDate](/engagement/ampscript/functions/formatdate/) — dates only
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-formatNumber.html) · [ampscript.guide](https://ampscript.guide/formatnumber/)
