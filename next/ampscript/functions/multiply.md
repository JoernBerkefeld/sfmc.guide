---
layout: page
title: "AMPscript Multiply (Next)"
description: "Multiply two numbers with AMPscript Multiply in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the two-decimal rounding of the result."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/multiply/
platforms:
  - next
syntax: "Multiply(number1, number2)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement keeps every decimal (`Multiply(1.5,2.25)` gives `3.375`); Next gives `3.38`. Engagement aborts on `Multiply(\"true\",1)`, while Next renders `1`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number1` | string \| number | Yes | First operand |
| `number2` | string \| number | Yes | Second operand |

Exactly two arguments. Numbers written as strings are accepted.

## Example

```ampscript
%%=Multiply(6, 7)=%%
```

Renders `42`.

String and number operands can be mixed:

```ampscript
%%=Multiply("4", 2.5)=%%
```

Renders `10`.

## Return value

**`number`** — the product of the two operands.

Every call that rendered gave a bare number. There is no set of special values to test for.

## Behaviour

**Exactly two arguments.** An email that calls `Multiply(5)` or `Multiply(5, 3, 1)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**The result is rounded to two decimals.** `Multiply(1.5, 2.25)` renders `3.38`, not `3.375`.

**Negatives work.** `Multiply(-5, 3)` gives `-15`.

**Numeric strings are accepted.** `Multiply("6", "7")` gives `42`, `Multiply("5", "3")` gives `15`, and `Multiply("4", 2.5)` gives `10`.

**Large products are not clamped.** `Multiply(1000000, 1000000)` gives `1000000000000`.

**`"true"` counts as 1.** `Multiply("true", 1)` renders `1` instead of failing.

**Other non-numeric input fails.** `Multiply("abc", 1)` makes the email preview fail with HTTP 500.

{% include test-script.html bundle="next-ampscript-functions--multiply" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--multiply" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Two-decimal rounding.** The official reference allows decimal operands and mentions no rounding. In Next, `Multiply(1.5, 2.25)` renders `3.38`, not `3.375`. [Details](/next/differs-from-docs/#multiply-rounds-two-decimals)

{% include platform-compare.html %}

## See also

- [`Multiply` in Marketing Cloud Engagement](/engagement/ampscript/functions/multiply/) — how it behaves there
- [`Divide`](/next/ampscript/functions/divide/) — the inverse operation
- [`Add`](/next/ampscript/functions/add/)
- [`Subtract`](/next/ampscript/functions/subtract/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-multiply.html)
