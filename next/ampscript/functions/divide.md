---
layout: page
title: "AMPscript Divide (Next)"
description: "Divide one number by another with AMPscript Divide in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the two-decimal result and the failing zero divisor."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/divide/
platforms:
  - next
syntax: "Divide(dividend, divisor)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement renders `Divide(10,3)` as `3.33333333333333` (Next: `3.33`) and a zero divisor as `∞`, `-∞` or `NaN`, where Next breaks the email preview. Engagement aborts on `Divide(\"true\",1)`, while Next renders `1`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dividend` | string \| number | Yes | Number to divide |
| `divisor` | string \| number | Yes | Number to divide by |

Exactly two arguments. Numbers written as strings are accepted.

## Example

```ampscript
%%=Divide(100, 4)=%%
```

Renders `25`.

A quotient that does not come out even is rounded to two decimals:

```ampscript
%%=Divide(10, 3)=%%
```

Renders `3.33`.

## Return value

**`number`** — the quotient of the two operands.

There is no special value for a zero divisor in Next: the render fails instead (see below).

## Behaviour

**Exactly two arguments.** An email that calls `Divide(10)` or `Divide(10, 2, 1)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**The result is rounded to two decimals.** `Divide(10, 3)` renders `3.33`. Even quotients have no decimals: `Divide(10, 2)` gives `5`.

**Negatives work.** `Divide(-10, 4)` gives `-2.5`.

**Numeric strings are accepted.** `Divide("100", "4")` gives `25`, `Divide("3.5", "0.5")` gives `7`, and `Divide(9, "2")` gives `4.5`.

**A zero divisor breaks the render.** `Divide(100, 0)`, `Divide(1, 0)`, `Divide(7.5, 0)`, `Divide(-100, 0)`, `Divide(0, 0)` and `Divide(100, "0")` all save, but the email preview then fails with HTTP 500 and no message. Check the divisor before you divide.

**`"true"` counts as 1.** `Divide("true", 1)` renders `1` instead of failing.

**Other non-numeric input fails.** `Divide("abc", 1)` makes the preview fail with HTTP 500.

{% include test-script.html bundle="next-ampscript-functions--divide" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--divide" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Two-decimal rounding.** The official reference says nothing about rounding the quotient. In Next, `Divide(10, 3)` renders `3.33`. [Details](/next/differs-from-docs/#divide-rounds-two-decimals)
- **Zero divisor.** The official reference does not cover a divisor of zero. In Next, every zero divisor tried made the email preview fail with HTTP 500. [Details](/next/differs-from-docs/#divide-zero-divisor-fails)

{% include platform-compare.html %}

## See also

- [`Mod`](/next/ampscript/functions/mod/) — the remainder of the same division
- [`Multiply`](/next/ampscript/functions/multiply/) — the inverse operation
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-divide.html)
