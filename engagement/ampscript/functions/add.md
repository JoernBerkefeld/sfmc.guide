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
  VAR @total
  SET @total = Add(1, 2)
]%%
Total: %%=v(@total)=%%
```

Renders `Total: 3`.

Because a numeric string is accepted, adding zero is a compact way to turn a string field into a number before further arithmetic:

```html
%%[
  VAR @qty
  SET @qty = Add(AttributeValue("Quantity"), 0)
]%%
```

## Return value

**`number`** — the numeric sum of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values: the result is simply the sum.

## Behaviour

**Decimals and negatives work as expected.** `Add(1.5, 2.25)` gives `3.75`; `Add(-5, 3)` gives `-2`.

**Numeric strings are accepted.** `Add("15", "27")` gives `42`, `Add("3.14", 1)` gives `4.14`, and mixing forms as in `Add(10, "5")` gives `15`.

**Non-numeric input aborts the page.** A non-numeric string (`Add("abc", 1)`), a boolean-like string (`Add("true", 1)`), an empty string (`Add("", 1)`), and a date value (`Add(Now(), 1)`) each abort the CloudPage with HTTP 422. None of them is coerced to zero, and none returns an error value you can test for — the page simply stops and everything already rendered is discarded.

**No 32-bit truncation.** `Add(2147483647, 1)` returns `2147483648`, so results are not clamped at the signed 32-bit boundary.

{% include test-script.html bundle="ampscript-functions--add" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Subtract`](/engagement/ampscript/functions/subtract/) — the inverse operation
- [`Multiply`](/engagement/ampscript/functions/multiply/) · [`Divide`](/engagement/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-add.html) · [ampscript.guide](https://ampscript.guide/add/)
