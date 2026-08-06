---
layout: page
title: "Add"
description: "Computes the sum of two numeric values. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including which argument types are accepted and which abort the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/add/
platforms:
  - engagement
  - next
syntax: "Add(number1, number2)"
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

**`number`** — the numeric sum of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values: the result is simply the sum.

## Behaviour

**Exactly two arguments.** One argument aborts the page; three arguments abort the page. There is no optional third operand.

**Decimals and negatives work as expected.** `Add(1.5, 2.25)` gives `3.75`; `Add(-5, 3)` gives `-2`.

**Numeric strings are accepted.** `Add("15", "27")` gives `42`, `Add("3.14", 1)` gives `4.14`, and mixing forms as in `Add(10, "5")` gives `15`.

**Non-numeric input aborts the page.** A non-numeric string (`Add("abc", 1)`), a boolean-like string (`Add("true", 1)`), an empty string (`Add("", 1)`), and a date value (`Add(Now(), 1)`) each abort the CloudPage with HTTP 422. None of them is coerced to zero, and none returns an error value you can test for — the page simply stops and everything already rendered is discarded.

**No 32-bit truncation.** `Add(2147483647, 1)` returns `2147483648`, so results are not clamped at the signed 32-bit boundary.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

The AMPscript below is the harness that produced the evidence above. Risky cases have to be isolated: a rejected argument aborts the entire page, so they cannot share a request with the safe sweep. Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=safe`, `?b=few`, `?b=str`, and so on. A branch that renders nothing at all is the failure signal.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* safe sweep: everything here is accepted and can share one request */
  IF @b == "safe" THEN
    OutputLine(Concat("Add(15,27)=[", Add(15,27), "]"))
    OutputLine(Concat("Add('15','27')=[", Add("15","27"), "]"))
    OutputLine(Concat("Add('3.14',1)=[", Add("3.14",1), "]"))
    OutputLine(Concat("Add(10,'5')=[", Add(10,"5"), "]"))
    OutputLine(Concat("Add(1.5,2.25)=[", Add(1.5,2.25), "]"))
    OutputLine(Concat("Add(-5,3)=[", Add(-5,3), "]"))
    OutputLine(Concat("Add(2147483647,1)=[", Add(2147483647,1), "]"))
  ENDIF

  /* each risky branch aborts the page: the start marker never renders */
  IF @b == "few" THEN
    OutputLine(Concat("few start"))
    OutputLine(Concat("Add(1)=[", Add(1), "]"))
    OutputLine(Concat("few done"))
  ENDIF

  IF @b == "many" THEN
    OutputLine(Concat("many start"))
    OutputLine(Concat("Add(1,2,3)=[", Add(1,2,3), "]"))
    OutputLine(Concat("many done"))
  ENDIF

  IF @b == "str" THEN
    OutputLine(Concat("str start"))
    OutputLine(Concat("Add('abc',1)=[", Add("abc",1), "]"))
  ENDIF

  IF @b == "bool" THEN
    OutputLine(Concat("bool start"))
    OutputLine(Concat("Add('true',1)=[", Add("true",1), "]"))
  ENDIF

  IF @b == "empty" THEN
    OutputLine(Concat("empty start"))
    OutputLine(Concat("Add('',1)=[", Add("",1), "]"))
  ENDIF

  IF @b == "date" THEN
    OutputLine(Concat("date start"))
    OutputLine(Concat("Add(Now(),1)=[", Add(Now(),1), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [`Subtract`](/engagement/ampscript/functions/subtract/) — the inverse operation
- [`Multiply`](/engagement/ampscript/functions/multiply/) · [`Divide`](/engagement/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-add.html) · [ampscript.guide](https://ampscript.guide/add/)
