---
layout: page
title: "AMPscript Add (Next)"
description: "Add two numbers with AMPscript Add in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the 32-bit wrap-around and the argument forms that break the preview."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/add/
platforms:
  - next
syntax: "Add(number1, number2)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts numeric strings (`Add(\"15\",\"27\")` gives `42`) and renders `Add(-5,3)` as `-2`; in Next both break the email preview. `Add(2147483647,1)` gives `2147483648` in Engagement but wraps to `-2147483648` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `number1` | number | Yes | First operand |
| `number2` | number | Yes | Second operand |

Exactly two arguments. Pass numeric literals or numeric variables: a number written as a string breaks the render in Next.

## Example

```ampscript
%%=Add(15, 27)=%%
```

Renders `42`.

Decimals keep their fractional part:

```ampscript
%%=Add(1.5, 2.25)=%%
```

Renders `3.75`.

## Return value

**`number`** — the sum of the two operands.

Every call that rendered gave a bare number. There is no set of special values to test for.

## Behaviour

**Exactly two arguments.** An email that calls `Add(1)` or `Add(1, 2, 3)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Results wrap at the 32-bit limit.** `Add(2147483647, 1)` renders `-2147483648`, not `2147483648`. Keep sums below 2,147,483,647 or do the arithmetic before the value reaches the email.

**Numeric strings break the render.** `Add("15", "27")`, `Add("3.14", 1)` and `Add(10, "5")` all save, but the email preview then fails with HTTP 500 and no message. Convert string values before adding them.

**A negative first operand broke the render too.** `Add(-5, 3)` saved but the preview failed with HTTP 500, so a negative literal as the first argument was not shown to work in Next.

**Non-numeric input fails.** `Add("abc", 1)`, `Add("true", 1)`, `Add("", 1)` and `Add(Now(), 1)` each make the preview fail with HTTP 500. Nothing is coerced to zero.

{% include test-script.html bundle="next-ampscript-functions--add" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--add" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Negative first operand.** The official reference allows positive and negative operands. In Next, `Add(-5, 3)` saved, but the email preview failed with HTTP 500 (one probe). [Details](/next/differs-from-docs/#add-negative-operand-fails)
- **32-bit wrap-around.** The official reference names no size limit. In Next, `Add(2147483647, 1)` renders `-2147483648`. [Details](/next/differs-from-docs/#add-32bit-wraparound)

{% include platform-compare.html %}

## See also

- [`Subtract`](/next/ampscript/functions/subtract/) — the inverse operation
- [`Multiply`](/next/ampscript/functions/multiply/)
- [`Divide`](/next/ampscript/functions/divide/) — the other two arithmetic functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-math/mc-ampscript-reference-math-add.html)
