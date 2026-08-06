---
layout: page
title: "Multiply"
description: "Computes the product of two numeric values. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including which argument types are accepted and which abort the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/multiply/
platforms:
  - engagement
  - next
syntax: "Multiply(number1, number2)"
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
| `number1` | `string \| number` | Yes | First operand |
| `number2` | `string \| number` | Yes | Second operand |

Both parameters are typed `string | number` rather than `number` because a string that parses cleanly as a number is accepted at runtime and produces the same result as the numeric literal.

## Return value

**`number`** — the product of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values.

## Behaviour

**Exactly two arguments.** One argument aborts the page; three arguments abort the page.

**Decimals and negatives work as expected.** `Multiply(1.5, 2.25)` gives `3.375`; `Multiply(-5, 3)` gives `-15`.

**Numeric strings are accepted.** `Multiply("5", "3")` gives `15`, and mixing forms as in `Multiply("4", 2.5)` gives `10`.

**Non-numeric input aborts the page.** A non-numeric string (`Multiply("abc", 1)`) and a boolean-like string (`Multiply("true", 1)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call.

**No 32-bit truncation.** `Multiply(1000000, 1000000)` returns `1000000000000`, well past the signed 32-bit boundary, so large products are not clamped.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=safe`, `?b=few`, `?b=many`, and so on. Risky cases must be isolated because a rejected argument aborts the whole page; a branch that renders nothing at all is the failure signal.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* safe sweep: everything here is accepted and can share one request */
  IF @b == "safe" THEN
    OutputLine(Concat("Multiply(5,3)=[", Multiply(5,3), "]"))
    OutputLine(Concat("Multiply('5','3')=[", Multiply("5","3"), "]"))
    OutputLine(Concat("Multiply('4',2.5)=[", Multiply("4",2.5), "]"))
    OutputLine(Concat("Multiply(1.5,2.25)=[", Multiply(1.5,2.25), "]"))
    OutputLine(Concat("Multiply(-5,3)=[", Multiply(-5,3), "]"))
    OutputLine(Concat("Multiply(1000000,1000000)=[", Multiply(1000000,1000000), "]"))
  ENDIF

  /* each risky branch aborts the page: the start marker never renders */
  IF @b == "few" THEN
    OutputLine(Concat("few start"))
    OutputLine(Concat("Multiply(1)=[", Multiply(1), "]"))
  ENDIF

  IF @b == "many" THEN
    OutputLine(Concat("many start"))
    OutputLine(Concat("Multiply(1,2,3)=[", Multiply(1,2,3), "]"))
  ENDIF

  IF @b == "str" THEN
    OutputLine(Concat("str start"))
    OutputLine(Concat("Multiply('abc',1)=[", Multiply("abc",1), "]"))
  ENDIF

  IF @b == "bool" THEN
    OutputLine(Concat("bool start"))
    OutputLine(Concat("Multiply('true',1)=[", Multiply("true",1), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [`Divide`](/engagement/ampscript/functions/divide/) — the inverse operation, with an unusual zero-divisor result
- [`Add`](/engagement/ampscript/functions/add/) · [`Subtract`](/engagement/ampscript/functions/subtract/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-multiply.html) · [ampscript.guide](https://ampscript.guide/multiply/)
