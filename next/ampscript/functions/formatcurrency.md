---
layout: page
title: "AMPscript FormatCurrency (Next)"
description: "Format a number as a currency amount for a locale with AMPscript FormatCurrency in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the ignored decimal and symbol arguments."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/formatcurrency/
platforms:
  - next
syntax: "FormatCurrency(value, locale[, decimalPlaces, symbol])"
return_type: string
min_args: 2
max_args: 4
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement honours the decimal count and the symbol (`FormatCurrency(1234.555,\"es-MX\",2,\"Mex$\")` gives `Mex$1,234.56`); Next ignores both (`$1,234.56`). Engagement rounds halves up (`2.345` gives `$2.35`) and brackets a US negative (`($1,234.56)`); Next gives `$2.34` and `-$1,234.56`. An empty or unknown locale still gives a formatted amount in Engagement but returns the raw `1234.555` in Next."
test_scripts: complete
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

In Next the email saves with `decimalPlaces` and `symbol`, but neither changes the output. The locale alone decides the decimals and the symbol.

## Example

```ampscript
%%=FormatCurrency(1234.555, "en-US")=%%
```

Renders `$1,234.56`.

The same amount for a German reader:

```ampscript
%%=FormatCurrency(1234.555, "de-DE")=%%
```

Renders `1.234,56 €`, with a non-breaking space (U+00A0) before the euro sign.

## Return value

**`string`** — the amount as currency for the locale.

The result is open text. With an empty or unknown locale the input comes back unformatted.

## Behaviour

**The locale decides the symbol, its position, the separators and the decimals.** Each row below is `1234.555` with only a locale:

| Locale | Result | Notes |
|---|---|---|
| `en-US` | `$1,234.56` | |
| `en_US` | `$1,234.56` | underscore form accepted |
| `en-GB` | `£1,234.56` | |
| `de-DE` | `1.234,56 €` | U+00A0 before the symbol |
| `fr-FR` | `1 234,56 €` | U+202F as group separator, U+00A0 before the symbol |
| `pt-BR` | `R$ 1.234,56` | U+00A0 after the symbol |
| `hi-IN` | `₹1,234.56` | |
| `de-CH` | `CHF 1’234.56` | U+00A0 after the symbol, U+2019 as group separator |
| `ja-JP` | `￥1,235` | full-width yen sign U+FFE5, no decimals |
| `de` | `1.234,56 ¤` | generic currency sign U+00A4 |
| `zz-ZZ` | `1234.555` | unformatted |
| `""` | `1234.555` | unformatted |

Several of these contain characters other than a plain space or apostrophe, so a comparison written against ASCII text will not match.

**The decimal count has no effect.** `de-DE` with `3` gives `1.234,56 €`, `de-CH` with `0` gives `CHF 1’234.56`, `ja-JP` with `2` gives `￥1,235`, and `en-US` with `"3"` gives `$1,234.56`.

**The symbol argument has no effect.** `es-MX` with `"Mex$"` gives `$1,234.56`; `de-DE` with `"CHF"` gives `1.234,56 €`.

**Halves round to the even digit.** `2.345` gives `$2.34`, while `2.355` gives `$2.36` and `1234.555` gives `$1,234.56`.

**Negatives get a minus sign.** `-1234.555` gives `-$1,234.56` for `en-US` and `-1.234,56 €` for `de-DE`.

**A numeric string works like the number.** `"1234.555"` gives `$1,234.56`, `"1234.5"` gives `$1,234.50`.

**The locale is required.** An email with `FormatCurrency(@amount)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--formatcurrency" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--formatcurrency" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The decimals and symbol arguments are ignored.** The docs show the third argument changing the decimals and the fourth replacing the symbol (`Mex$`). In Next, `de-CH` with `0` still gave two decimals, `ja-JP` with `2` still gave none, and `Mex$` gave `$1,234.56`. [Card](/next/differs-from-docs/#formatcurrency-ignores-decimals-and-symbol)
- **The output uses non-ASCII characters.** The docs write their samples with plain spaces, a plain apostrophe and `¥`. Next uses U+00A0 and U+202F spaces, U+2019 for the Swiss group separator and the full-width `￥`. [Card](/next/differs-from-docs/#formatcurrency-non-ascii-characters)
- **Rounding and unknown locales are not covered by the docs.** In Next `2.345` gives `$2.34`, rounded down although the docs show no rule (whether the binary representation or rounding halves to the even digit causes it was not isolated); an empty or unknown locale returns the raw number, and `de` gives the generic `¤` sign. [Card](/next/differs-from-docs/#formatcurrency-rounding-and-unknown-locale)

{% include platform-compare.html %}

## See also

- [FormatNumber](/next/ampscript/functions/formatnumber/) — the same locales with a pattern of your choice
- [Format](/next/ampscript/functions/format/) — numbers and dates
- [FormatDate](/next/ampscript/functions/formatdate/) — dates only
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-formatCurrency.html)
