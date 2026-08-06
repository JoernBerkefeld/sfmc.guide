---
layout: page
title: "Mod"
description: "Returns the remainder after dividing the first number by the second. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the sign rule and the NaN result for a zero divisor."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/mod/
platforms:
  - engagement
  - next
syntax: "Mod(dividend, divisor)"
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

```html
%%[
  VAR @rest
  SET @rest = Mod(10, 3)
]%%
Remainder: %%=v(@rest)=%%
```

Renders `Remainder: 1`.

The common use is bucketing — pair it with [`Random`](/engagement/ampscript/functions/random/) or a subscriber ID to split an audience into groups:

```html
%%[
  VAR @bucket
  SET @bucket = Mod(AttributeValue("SubscriberID"), 4)
]%%
```

`@bucket` is `0`, `1`, `2` or `3`. Note that a negative dividend gives a negative bucket, so normalise first when the ID can be negative.

## Return value

**`number`** — the remainder after dividing the first number by the second.

The result takes the sign of the dividend, and a divisor of `0` yields `NaN` instead of raising an error. `NaN` is an IEEE numeric value rather than a status token, so there is no closed literal set to match against.

## Behaviour

**Basic remainders.** `Mod(10, 3)` gives `1`, `Mod(500, 12)` gives `8`, and a dividend smaller than the divisor returns the dividend unchanged: `Mod(3, 10)` gives `3`.

**Decimal operands are accepted.** `Mod(10.5, 3)` gives `1.5` and `Mod(10, 3.5)` gives `3`. A worked decimal case matched the official example exactly: `Mod(-500.123, 12.456)` renders `-1.88300000000001`.

**Numeric strings are accepted.** `Mod("10", "3")` gives `1`, `Mod(10, "3")` gives `1`, and `Mod("10.5", "0.25")` gives `0`.

**Non-numeric input aborts the page.** A non-numeric string (`Mod("abc", 3)`), a boolean-like string (`Mod("true", 3)`), and a date value (`Mod(Now(), 3)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call.

### The sign follows the dividend

The official page does not say which operand decides the sign of the remainder, and languages genuinely disagree about it. At runtime, the sign always follows the **first** argument:

| Call | Result |
|---|---|
| `Mod(10, 3)` | `1` |
| `Mod(-10, 3)` | `-1` |
| `Mod(10, -3)` | `1` |
| `Mod(-10, -3)` | `-1` |

That is truncated-remainder behaviour, matching C and JavaScript's `%`, and the opposite of the floored modulo used by languages such as Python. If you are porting an expression from a floored-modulo language, negative dividends will give you a different answer — normalise explicitly when you need a non-negative remainder. See the finding on [Differs from official docs](/engagement/differs-from-docs/#mod-sign-follows-dividend).

### Dividing by zero

`Mod` does not abort on a zero divisor. It renders the three ASCII characters `NaN` in every case — `Mod(10, 0)`, `Mod(-10, 0)`, and `Mod(0, 0)` all produce `NaN`, including the non-zero-dividend case.

This is where `Mod` and its sibling [`Divide`](/engagement/ampscript/functions/divide/) part ways: `Divide` renders `∞` for a non-zero dividend and only falls back to `NaN` for `0 / 0`. Code that tests for one sentinel will silently miss the other, so guard the divisor rather than pattern-matching the result. Both are catalogued on [Differs from official docs](/engagement/differs-from-docs/#mod-zero-divisor-nan).

{% include test-script.html bundle="ampscript-functions--mod" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Divide`](/engagement/ampscript/functions/divide/) — the sibling function, with a different zero-divisor result
- [Differs from official docs](/engagement/differs-from-docs/#mod-zero-divisor-nan) — the zero-divisor and sign findings
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-mod.html) · [ampscript.guide](https://ampscript.guide/mod/)
