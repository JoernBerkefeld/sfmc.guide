---
layout: page
title: "AMPscript Subtract (Next)"
description: "Subtract one number from another with AMPscript Subtract in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the argument forms that break the preview."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/subtract/
platforms:
  - next
syntax: "Subtract(minuend, subtrahend)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts numeric strings (`Subtract(\"50\",\"15\")` gives `35`, `Subtract(\"9\",4)` gives `5`) and renders `Subtract(-5,3)` as `-8`; in Next all three break the email preview."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `minuend` | number | Yes | Value to subtract from |
| `subtrahend` | number | Yes | Value to subtract |

Exactly two arguments. Pass numeric literals or numeric variables: a number written as a string breaks the render in Next.

## Example

```ampscript
%%=Subtract(50, 15)=%%
```

Renders `35`.

A result below zero comes back as it is:

```ampscript
%%=Subtract(1.5, 2.25)=%%
```

Renders `-0.75`.

## Return value

**`number`** — the first operand minus the second.

Every call that rendered gave a bare number. There is no set of special values to test for.

## Behaviour

**Exactly two arguments.** An email that calls `Subtract(50)` or `Subtract(50, 15, 1)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Decimals and negative results work.** `Subtract(10, 3)` gives `7` and `Subtract(1.5, 2.25)` gives `-0.75`.

**Numeric strings break the render.** `Subtract("50", "15")` and `Subtract("9", 4)` both save, but the email preview then fails with HTTP 500 and no message. Convert string values first.

**A negative first operand broke the render too.** `Subtract(-5, 3)` saved but the preview failed with HTTP 500, so a negative literal as the first argument was not shown to work in Next.

**Non-numeric input fails.** `Subtract("abc", 1)` and `Subtract("true", 1)` each make the preview fail with HTTP 500.

{% include test-script.html bundle="next-ampscript-functions--subtract" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--subtract" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Negative first operand.** The official reference allows positive and negative operands. In Next, `Subtract(-5, 3)` saved, but the email preview failed with HTTP 500 (one probe). [Details](/next/differs-from-docs/#subtract-negative-operand-fails)

{% include platform-compare.html %}

## See also

- [`Add`](/next/ampscript/functions/add/) — the inverse operation
- [`Multiply`](/next/ampscript/functions/multiply/)
- [`Divide`](/next/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-subtract.html)
