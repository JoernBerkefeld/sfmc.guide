---
layout: page
title: "Divide"
description: "Divides the first number by the second. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the undocumented zero-divisor result, which renders an infinity symbol instead of failing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/divide/
platforms:
  - engagement
  - next
syntax: "Divide(dividend, divisor)"
return_type: number
min_args: 2
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dividend` | string \| number | Yes | Number to divide |
| `divisor` | string \| number | Yes | Number to divide by |

## Example

```ampscript
%%[
  VAR @unitPrice
  SET @unitPrice = Divide(29.97, 3)
]%%
Per unit: %%=v(@unitPrice)=%%
```

Renders `Per unit: 9.99`.

A zero divisor renders `∞` rather than failing, so guard the divisor before you use the result:

```ampscript
%%[
  VAR @count, @average
  SET @count = AttributeValue("ItemCount")
  IF @count > 0 THEN
    SET @average = Divide(AttributeValue("OrderTotal"), @count)
  ENDIF
]%%
```

## Return value

**`number`** — the quotient of the two operands.

A zero divisor does not raise an error: a non-zero dividend yields the infinity symbol and a zero dividend yields `NaN`. Guard against a zero divisor before rendering the result. Both of those are IEEE numeric values rather than a closed set of status tokens, so there is nothing to pattern-match beyond the two literals.

## Behaviour

**Non-integer quotients render as decimals.** `Divide(10, 3)` renders `3.33333333333333` — the value is not rounded to an integer.

**Negatives work as expected.** `Divide(-10, 4)` gives `-2.5`.

**Numeric strings are accepted.** `Divide("100", "4")` gives `25`, `Divide("3.5", "0.5")` gives `7`, and mixing forms as in `Divide(9, "2")` gives `4.5`.

**Non-numeric input aborts the page.** A non-numeric string (`Divide("abc", 1)`) and a boolean-like string (`Divide("true", 1)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call.

### Dividing by zero

This is the load-bearing finding for this function, and it is not mentioned by the official reference at all.

A zero divisor does **not** raise an error and does **not** abort the page. Instead:

| Call | Renders |
|---|---|
| `Divide(100, 0)` | `∞` |
| `Divide(1, 0)` | `∞` |
| `Divide(7.5, 0)` | `∞` |
| `Divide(-100, 0)` | `-∞` |
| `Divide(0, 0)` | `NaN` |
| `Divide(100, "0")` | `∞` |

The glyph is genuinely U+221E, confirmed by dumping the codepoints of the rendered line. A zero divisor passed as a numeric string behaves identically to the numeric zero.

The practical consequence is that an unguarded division by zero does not fail loudly — the `∞` flows straight into the rendered message and ships to the recipient. Check the divisor yourself before dividing.

{% include callout.html type="warning" title="Verify the codepoint, not the glyph" content="A console that is not reading the response as UTF-8 displays `∞` as the digit `8`. During verification that misread the result entirely until the response was re-fetched as UTF-8 and the codepoints dumped. Always codepoint-check a suspicious literal before drawing a conclusion." %}

Both zero-divisor behaviours are catalogued as findings on [Differs from official docs](/engagement/differs-from-docs/#divide-zero-divisor-infinity), alongside the contrasting behaviour of [`Mod`](/engagement/ampscript/functions/mod/), which renders `NaN` in every zero-divisor case.

{% include test-script.html bundle="ampscript-functions--divide" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Mod`](/engagement/ampscript/functions/mod/) — the sibling remainder function, which handles a zero divisor differently
- [`Multiply`](/engagement/ampscript/functions/multiply/) — the inverse operation
- [Differs from official docs](/engagement/differs-from-docs/#divide-zero-divisor-infinity) — the zero-divisor finding
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-divide.html) · [ampscript.guide](https://ampscript.guide/divide/)
