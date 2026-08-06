---
layout: page
title: "Subtract"
description: "Computes the difference between two numeric values. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including which argument types are accepted and which abort the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/subtract/
platforms:
  - engagement
  - next
syntax: "Subtract(minuend, subtrahend)"
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
| `minuend` | `string \| number` | Yes | Value to subtract from |
| `subtrahend` | `string \| number` | Yes | Value to subtract |

Both parameters are typed `string | number` rather than `number` because a string that parses cleanly as a number is accepted at runtime and produces the same result as the numeric literal.

## Return value

**`number`** — the difference of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values.

## Behaviour

**Exactly two arguments.** One argument aborts the page; three arguments abort the page.

**Decimals and negative results work as expected.** `Subtract(1.5, 2.25)` gives `-0.75`; `Subtract(-5, 3)` gives `-8`. A result below zero is returned normally, not clamped.

**Numeric strings are accepted.** `Subtract("50", "15")` gives `35`, and mixing forms as in `Subtract("9", 4)` gives `5`.

**Non-numeric input aborts the page.** A non-numeric string (`Subtract("abc", 1)`) and a boolean-like string (`Subtract("true", 1)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call. Neither is coerced.

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
    OutputLine(Concat("Subtract(50,15)=[", Subtract(50,15), "]"))
    OutputLine(Concat("Subtract('50','15')=[", Subtract("50","15"), "]"))
    OutputLine(Concat("Subtract('9',4)=[", Subtract("9",4), "]"))
    OutputLine(Concat("Subtract(1.5,2.25)=[", Subtract(1.5,2.25), "]"))
    OutputLine(Concat("Subtract(-5,3)=[", Subtract(-5,3), "]"))
  ENDIF

  /* each risky branch aborts the page: the start marker never renders */
  IF @b == "few" THEN
    OutputLine(Concat("few start"))
    OutputLine(Concat("Subtract(1)=[", Subtract(1), "]"))
    OutputLine(Concat("few done"))
  ENDIF

  IF @b == "many" THEN
    OutputLine(Concat("many start"))
    OutputLine(Concat("Subtract(1,2,3)=[", Subtract(1,2,3), "]"))
  ENDIF

  IF @b == "str" THEN
    OutputLine(Concat("str start"))
    OutputLine(Concat("Subtract('abc',1)=[", Subtract("abc",1), "]"))
  ENDIF

  IF @b == "bool" THEN
    OutputLine(Concat("bool start"))
    OutputLine(Concat("Subtract('true',1)=[", Subtract("true",1), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [`Add`](/engagement/ampscript/functions/add/) — the inverse operation
- [`Multiply`](/engagement/ampscript/functions/multiply/) · [`Divide`](/engagement/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-subtract.html) · [ampscript.guide](https://ampscript.guide/subtract/)
