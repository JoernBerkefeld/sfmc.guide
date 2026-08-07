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
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `minuend` | string \| number | Yes | Value to subtract from |
| `subtrahend` | string \| number | Yes | Value to subtract |

## Example

```ampscript
%%[
  VAR @remaining
  SET @remaining = Subtract(100, 15)
]%%
Remaining: %%=v(@remaining)=%%
```

Renders `Remaining: 85`.

A result below zero is returned as-is, so subtract in the order you want the sign to come out:

```ampscript
%%[
  VAR @balance
  SET @balance = Subtract(AttributeValue("Credit"), AttributeValue("Spent"))
]%%
```

## Return value

**`number`** — the difference of the two operands.

Every successful call rendered a bare numeric literal. There is no closed set of status tokens or sentinel values.

## Behaviour

**Decimals and negative results work as expected.** `Subtract(1.5, 2.25)` gives `-0.75`; `Subtract(-5, 3)` gives `-8`. A result below zero is returned normally, not clamped.

**Numeric strings are accepted.** `Subtract("50", "15")` gives `35`, and mixing forms as in `Subtract("9", 4)` gives `5`.

**Non-numeric input aborts the page.** A non-numeric string (`Subtract("abc", 1)`) and a boolean-like string (`Subtract("true", 1)`) each abort the CloudPage with HTTP 422, discarding all output rendered before the call. Neither is coerced.

{% include test-script.html bundle="ampscript-functions--subtract" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Add`](/engagement/ampscript/functions/add/) — the inverse operation
- [`Multiply`](/engagement/ampscript/functions/multiply/) · [`Divide`](/engagement/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-subtract.html) · [ampscript.guide](https://ampscript.guide/subtract/)
