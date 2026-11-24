---
layout: page
title: "AMPscript Random (Next)"
description: "Pick a random whole number between two bounds with AMPscript Random in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including bound order and decimal bounds."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/random/
platforms:
  - next
syntax: "Random(min, max)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts the bounds in either order (`Random(3,1)`) and as whole-number strings (`Random(\"1\",\"2\")`); in Next both break the email preview. Engagement aborts on decimal bounds such as `Random(1.2,1.8)`, while Next renders a whole number (`1`)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `min` | number | Yes | Lower bound (inclusive) |
| `max` | number | Yes | Upper bound (inclusive) |

Exactly two arguments. Pass the lower bound first, as a number: reversed bounds and bounds written as strings break the render in Next.

## Example

```ampscript
%%=Random(1, 100)=%%
```

Renders a whole number from `1` to `100`, for example `43`.

Pick one of two content variants:

```ampscript
%%[
  VAR @pick
  SET @pick = Random(1, 2)
  IF @pick == 1 THEN
]%%
  First offer
%%[ ELSE ]%%
  Second offer
%%[ ENDIF ]%%
```

## Return value

**`number`** — a random whole number within the given range.

The possible values depend only on the bounds you pass, so there is no fixed set to test for.

## Behaviour

**Exactly two arguments.** An email that calls `Random(1)` or `Random(1, 3, 5)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Both bounds are inclusive.** Sixty calls of `Random(1, 2)` in one email produced both `1` and `2` and nothing else; sixty calls of `Random(1, 3)` produced each of `1`, `2` and `3` and nothing else.

**Equal bounds return that value.** `Random(1, 1)` gives `1` and `Random(5, 5)` gives `5`.

**Negative ranges work.** Sixty calls of `Random(-2, -1)` produced both `-2` and `-1` and nothing else.

**The lower bound must come first.** An email running `Random(3, 1)` saved, but the preview failed with HTTP 500.

**Bounds written as strings break the render.** `Random("1", "2")` and `Random("1.5", "3.5")` save, but the preview fails with HTTP 500.

**Decimal bounds render.** `Random(1.2, 1.8)` rendered `1`, `Random(1, 2.5)` rendered `2` and `Random(1.0, 3.0)` rendered `2`. Each was a single sample, so how the bounds are rounded was not established.

**Non-numeric input fails.** `Random("abc", 3)` and `Random("true", 3)` each make the preview fail with HTTP 500.

{% include test-script.html bundle="next-ampscript-functions--random" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--random" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Bound order.** The official reference says the order of the bounds does not matter. In Next, an email with a 60-draw loop calling `Random(3, 1)` saved, but the email preview failed with HTTP 500 (one probe). [Details](/next/differs-from-docs/#random-reversed-bounds-fail)
- **Decimal bounds.** The official reference allows decimal bounds and keeps the result inside them. In Next, `Random(1.2, 1.8)` rendered `1`, below the lower bound (single sample). [Details](/next/differs-from-docs/#random-decimal-bounds-outside-range)

{% include platform-compare.html %}

## See also

- [`Mod`](/next/ampscript/functions/mod/) — useful for bucketing a value into groups
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-random.html)
