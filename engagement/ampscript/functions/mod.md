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
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dividend` | `string \| number` | Yes | Number to divide |
| `divisor` | `string \| number` | Yes | Number to divide by |

Both parameters are typed `string | number` rather than `number` because a string that parses cleanly as a number is accepted at runtime and produces the same result as the numeric literal.

## Return value

**`number`** — the remainder after dividing the first number by the second.

The result takes the sign of the dividend, and a divisor of `0` yields `NaN` instead of raising an error. `NaN` is an IEEE numeric value rather than a status token, so there is no closed literal set to match against.

## Behaviour

**Exactly two arguments.** One argument aborts the page; three arguments abort the page.

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

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=mods`, `?b=m0`, `?b=fewm`, and so on. Risky cases must be isolated because a rejected argument aborts the whole page; a branch that renders nothing at all is the failure signal. Fetch as UTF-8 so a non-ASCII glyph cannot be mistaken for `NaN`.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* sign rule: all four cases are safe and can share one request */
  IF @b == "mods" THEN
    OutputLine(Concat("Mod(10,3)=[", Mod(10,3), "]"))
    OutputLine(Concat("Mod(500,12)=[", Mod(500,12), "]"))
    OutputLine(Concat("Mod(3,10)=[", Mod(3,10), "]"))
    OutputLine(Concat("Mod(-10,3)=[", Mod(-10,3), "]"))
    OutputLine(Concat("Mod(10,-3)=[", Mod(10,-3), "]"))
    OutputLine(Concat("Mod(-10,-3)=[", Mod(-10,-3), "]"))
  ENDIF

  /* decimal operands */
  IF @b == "moddec" THEN
    OutputLine(Concat("Mod(-500.123,12.456)=[", Mod(-500.123,12.456), "]"))
    OutputLine(Concat("Mod(10.5,3)=[", Mod(10.5,3), "]"))
    OutputLine(Concat("Mod(10,3.5)=[", Mod(10,3.5), "]"))
  ENDIF

  /* numeric strings */
  IF @b == "modstr" THEN
    OutputLine(Concat("Mod('10','3')=[", Mod("10","3"), "]"))
    OutputLine(Concat("Mod(10,'3')=[", Mod(10,"3"), "]"))
    OutputLine(Concat("Mod('10.5','0.25')=[", Mod("10.5","0.25"), "]"))
  ENDIF

  /* zero divisor: does NOT abort, so all cases can share one request */
  IF @b == "m0" THEN
    OutputLine(Concat("Mod(10,0)=[", Mod(10,0), "]"))
    OutputLine(Concat("Mod(-10,0)=[", Mod(-10,0), "]"))
    OutputLine(Concat("Mod(0,0)=[", Mod(0,0), "]"))
    /* contrast: Divide renders the infinity symbol here */
    OutputLine(Concat("Divide(10,0)=[", Divide(10,0), "]"))
  ENDIF

  /* each risky branch aborts the page: the start marker never renders */
  IF @b == "fewm" THEN
    OutputLine(Concat("--- fewm start ---"))
    OutputLine(Concat("Mod(1)=[", Mod(1), "]"))
  ENDIF

  IF @b == "manym" THEN
    OutputLine(Concat("--- manym start ---"))
    OutputLine(Concat("Mod(1,2,3)=[", Mod(1,2,3), "]"))
  ENDIF

  IF @b == "strm" THEN
    OutputLine(Concat("--- strm start ---"))
    OutputLine(Concat("Mod('abc',3)=[", Mod("abc",3), "]"))
  ENDIF

  IF @b == "boolm" THEN
    OutputLine(Concat("--- boolm start ---"))
    OutputLine(Concat("Mod('true',3)=[", Mod("true",3), "]"))
  ENDIF

  IF @b == "datem" THEN
    OutputLine(Concat("--- datem start ---"))
    OutputLine(Concat("Mod(Now(),3)=[", Mod(Now(),3), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [`Divide`](/engagement/ampscript/functions/divide/) — the sibling function, with a different zero-divisor result
- [Differs from official docs](/engagement/differs-from-docs/#mod-zero-divisor-nan) — the zero-divisor and sign findings
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-mod.html) · [ampscript.guide](https://ampscript.guide/mod/)
