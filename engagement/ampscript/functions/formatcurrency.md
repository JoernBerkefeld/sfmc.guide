---
layout: page
title: "FormatCurrency"
description: "Formats a number as a currency amount for a locale. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that the locale, not the function, decides the symbol position, the separators and even the number of decimal places."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/formatcurrency/
platforms:
  - engagement
  - next
syntax: "FormatCurrency(value, locale[, decimalPlaces, symbol])"
return_type: string
min_args: 2
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number | Yes | Amount to format; a numeric string works and may carry thousands separators |
| `locale` | string | Yes | Locale supplying the symbol, its position and the separators; hyphen or underscore |
| `decimalPlaces` | string \| number | No | Overrides the locale's own decimal count |
| `symbol` | string | No | Replaces the symbol only; the locale still decides where it goes |

## Example

The usual case — hand it the amount and the reader's locale and let the locale do the work:

```html
%%[
  VAR @price, @locale
  SET @price = 1234.555
  SET @locale = AttributeValue("Locale")
]%%
Your total: %%=FormatCurrency(@price, @locale)=%%
```

With `en-US` that renders `$1,234.56`; with `de-DE`, `1.234,56 €` — different symbol, different side, different separators, same call.

Force a whole-number amount by supplying the decimal count:

```html
%%=FormatCurrency(1234.555, "de-CH", 0)=%%
```

Substitute the symbol without disturbing the layout:

```html
%%=FormatCurrency(1234.555, "es-MX", 2, "Mex$")=%%
```

## Return value

**`string`** — the amount rendered as currency for the requested locale.

The domain is open, so there is no set of literals to test for.

## Behaviour

**The locale decides six things at once:** the symbol, which side of the number it sits on, the group separator, the decimal separator, the negative form, and — when the argument is omitted — how many decimals are shown. Only the symbol can be overridden.

**A numeric string is accepted** and formats identically to the number.

**Rounding is half-up.** `2.345` gave `$2.35` and `2.355` gave `$2.36`.

**The decimal count is not a flat two.** `ja-JP` rendered no decimals at all, because the yen has no minor unit. Supplying `2` explicitly forced two decimals onto the same amount, so the argument overrides the locale rather than restating a default. It also accepts a numeric string.

**The symbol argument swaps the glyph, nothing else.** `Mex$` with `es-MX` rendered in the leading position that locale uses, while `CHF` with `de-DE` rendered trailing — the layout came from the locale in both cases. It is positional, so a symbol cannot be supplied without a decimal count.

### One amount, nine locales

Every row below is `1234.555` with no further arguments:

| Locale | Result | Notes |
|---|---|---|
| `en-US` | `$1,234.56` | symbol leading |
| `en_GB` | `£1,234.56` | underscore form accepted |
| `de-DE` | `1.234,56 €` | symbol trailing after a space |
| `fr-FR` | `1 234,56 €` | group separator is a non-breaking space |
| `ja-JP` | `¥1,235` | no decimals — the locale's own choice |
| `pt-BR` | `R$ 1.234,56` | multi-character symbol, space after |
| `hi-IN` | `₹1,234.56` | |
| `de-CH` | `CHF 1’234.56` | group separator is a right single quote |
| `de` | `1.234,56 €` | language-only code works |

Two of these break naive post-processing: `fr-FR` uses U+00A0 rather than a space, and `de-CH` uses U+2019 rather than an apostrophe. Neither survives a comparison written against plain ASCII.

**An unknown locale does not abort.** `zz-ZZ` rendered `¤1,234.56` with the generic currency sign U+00A4 in the leading position, and the empty string fell back to the US format — so a mistyped locale ships a wrong-looking price rather than an error.

### Negatives follow the locale too

| Locale | `-1234.555` |
|---|---|
| `en-US` | `($1,234.56)` |
| `de-DE` | `-1.234,56 €` |

The US form uses brackets and no minus sign at all. Code that looks for a leading `-` to detect a refund misses it.

{% include test-script.html bundle="ampscript-functions--formatcurrency" chapter="behaviour" %}

{% include callout.html type="warning" title="Argument-count probes need their own deploy" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including the control block and branches that were never requested. Keep arity checks out of a gated behaviour harness and give each one its own deployment." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [FormatNumber](/engagement/ampscript/functions/formatnumber/) — same locale machinery, but you choose the pattern
- [Format](/engagement/ampscript/functions/format/) — the general form, which handles dates as well
- [FormatDate](/engagement/ampscript/functions/formatdate/) — dates only
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-formatCurrency.html) · [ampscript.guide](https://ampscript.guide/formatcurrency/)
