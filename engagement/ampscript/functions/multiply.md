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
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number1` | string \| number | Yes | First operand |
| `number2` | string \| number | Yes | Second operand |

## Example

```html
%%[
  VAR @lineTotal
  SET @lineTotal = Multiply(3, 9.99)
]%%
Line total: %%=v(@lineTotal)=%%
```

Renders `Line total: 29.97`.

Percentages need the fraction spelled out, since there is no percent operator:

```html
%%[
  VAR @vat
  SET @vat = Multiply(AttributeValue("NetAmount"), 0.19)
]%%
```

## Return value

**`number`** — the product of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values.

## Behaviour

**Decimals and negatives work as expected.** `Multiply(1.5, 2.25)` gives `3.375`; `Multiply(-5, 3)` gives `-15`.

**Numeric strings are accepted.** `Multiply("5", "3")` gives `15`, and mixing forms as in `Multiply("4", 2.5)` gives `10`.

**Non-numeric input aborts the page.** A non-numeric string (`Multiply("abc", 1)`) and a boolean-like string (`Multiply("true", 1)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call.

**No 32-bit truncation.** `Multiply(1000000, 1000000)` returns `1000000000000`, well past the signed 32-bit boundary, so large products are not clamped.

{% include test-script.html bundle="ampscript-functions--multiply" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Divide`](/engagement/ampscript/functions/divide/) — the inverse operation, with an unusual zero-divisor result
- [`Add`](/engagement/ampscript/functions/add/) · [`Subtract`](/engagement/ampscript/functions/subtract/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-multiply.html) · [ampscript.guide](https://ampscript.guide/multiply/)
