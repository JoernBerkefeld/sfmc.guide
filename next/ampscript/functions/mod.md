---
layout: page
title: "AMPscript Mod (Next)"
description: "Get the remainder of a division with AMPscript Mod in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the sign rule and the inputs that break the preview."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/mod/
platforms:
  - next
syntax: "Mod(dividend, divisor)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts numeric strings (`Mod(\"10\",\"3\")` gives `1`), renders `Mod(3,10)` as `3` and a zero divisor as `NaN`; in Next all of these break the email preview. Decimal results are written differently: `Mod(10,3.5)` gives `3` in Engagement and `3.0` in Next, `Mod(-500.123,12.456)` gives `-1.88300000000001` in Engagement and `-1.883` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dividend` | number | Yes | Number to divide |
| `divisor` | number | Yes | Number to divide by |

Exactly two arguments. Pass numeric literals or numeric variables: a number written as a string breaks the render in Next.

## Example

```ampscript
%%=Mod(10, 3)=%%
```

Renders `1`.

```ampscript
%%=Mod(500, 12)=%%
```

Renders `8`.

## Return value

**`number`** — the remainder left after dividing the first number by the second.

There is no special value for a zero divisor in Next: the render fails instead (see below).

## Behaviour

**Exactly two arguments.** An email that calls `Mod(10)` or `Mod(10, 3, 1)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**The sign follows the dividend.**

| Call | Renders |
|---|---|
| `Mod(10, 3)` | `1` |
| `Mod(-10, 3)` | `-1` |
| `Mod(10, -3)` | `1` |
| `Mod(-10, -3)` | `-1` |

**Decimal operands work, with their own number format.** `Mod(10.5, 3)` gives `1.5`, `Mod(10, 3.5)` gives `3.0` (with a trailing `.0`), and `Mod(-500.123, 12.456)` gives `-1.883`.

**A dividend smaller than the divisor broke the render.** `Mod(3, 10)` saved, but the email preview failed with HTTP 500 instead of giving `3`.

**A zero divisor breaks the render.** `Mod(10, 0)`, `Mod(-10, 0)` and `Mod(0, 0)` all make the preview fail with HTTP 500. Check the divisor first.

**Numeric strings break the render.** `Mod("10", "3")`, `Mod(10, "3")` and `Mod("10.5", "0.25")` save, but the preview then fails.

**Non-numeric input fails.** `Mod("abc", 3)`, `Mod("true", 3)` and `Mod(Now(), 3)` each make the preview fail with HTTP 500.

{% include test-script.html bundle="next-ampscript-functions--mod" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--mod" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Decimal result format.** The official decimal example states a result with a floating-point tail. In Next the same call, `Mod(-500.123, 12.456)`, renders `-1.883`, and `Mod(10, 3.5)` renders `3.0`. [Details](/next/differs-from-docs/#mod-decimal-result-format)
- **Dividend smaller than divisor.** The official reference accepts any two numbers. In Next, `Mod(3, 10)` saved, but the email preview failed with HTTP 500 (one probe). [Details](/next/differs-from-docs/#mod-small-dividend-fails)
- **Zero divisor.** The official reference does not cover a divisor of zero. In Next, `Mod(10, 0)`, `Mod(-10, 0)` and `Mod(0, 0)` make the email preview fail with HTTP 500. [Details](/next/differs-from-docs/#mod-zero-divisor-fails)

{% include platform-compare.html %}

## See also

- [`Mod` in Marketing Cloud Engagement](/engagement/ampscript/functions/mod/) — how it behaves there
- [`Divide`](/next/ampscript/functions/divide/) — the quotient of the same division
- [`Random`](/next/ampscript/functions/random/) — pairs with `Mod` for bucketing
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-mod.html)
