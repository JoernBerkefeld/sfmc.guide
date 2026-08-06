---
layout: page
title: "Random"
description: "Returns a random whole number between two inclusive bounds. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the decimal bounds that the official docs allow but the runtime rejects."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/random/
platforms:
  - engagement
  - next
syntax: "Random(min, max)"
return_type: number
min_args: 2
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `min` | string \| number | Yes | Lower bound (inclusive) |
| `max` | string \| number | Yes | Upper bound (inclusive) |

## Example

```html
%%[
  VAR @pick
  SET @pick = Random(1, 3)
]%%
Variant: %%=v(@pick)=%%
```

Renders `Variant: 1`, `2` or `3` — both bounds are reachable.

Use it to pick one of a handful of content variants:

```html
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

The bounds must be whole numbers — a decimal bound aborts the page, see below.

## Return value

**`number`** — a random whole number within the supplied range.

Across roughly a hundred sampled calls, every returned value rendered as a bare integer; a decimal point never appeared. The value set is bounded only by the arguments you pass, so there is no fixed catalog of possible literals.

## Behaviour

**Both bounds are inclusive.** A single call proves nothing about a range, so this was settled by bulk sampling tight ranges. `Random(1, 2)` sampled 30 times produced only `1` and `2`, and produced both. `Random(1, 3)` sampled 30 times produced all of `1`, `2`, and `3` and nothing outside. Both ends of the range are genuinely reachable.

**`min == max` returns that value.** `Random(5, 5)` gives `5`.

**Argument order does not matter.** `Random(3, 1)` does not abort — the bounds are treated as an unordered pair. Sampled 20 times it produced the full inclusive `1`–`3` range, exactly like `Random(1, 3)`.

**Negative ranges work.** `Random(-2, -1)` sampled 20 times produced only `-2` and `-1`, and produced both.

**Whole-number strings are accepted.** `Random("1", "2")` sampled 20 times behaved identically to the numeric form, with both bounds reachable.

**Non-numeric input aborts the page.** A non-numeric string (`Random("abc", 3)`) and a boolean-like string (`Random("true", 3)`) each abort the CloudPage with HTTP 422.

### Decimal bounds are rejected

{% include callout.html type="warning" title="This contradicts the official documentation" content="The official reference presents the bounds as numbers that may carry a decimal part. At runtime, every decimal bound aborts the CloudPage with HTTP 422 and discards all output rendered before it." %}

Four decimal forms were tried and all four failed identically:

| Call | Result |
|---|---|
| `Random(1.2, 1.8)` | HTTP 422, page aborted |
| `Random(1, 2.5)` | HTTP 422, page aborted |
| `Random(1.0, 3.0)` | HTTP 422, page aborted |
| `Random("1.5", "3.5")` | HTTP 422, page aborted |

Note that `Random(1.0, 3.0)` fails too, even though the values are mathematically whole — writing the decimal point at all is enough to break the call. Meanwhile the equivalent whole-number calls and whole-number strings return values normally.

This is not an artefact of the test account: the same decimal calls were redeployed to the parent business unit and aborted there as well. Treat the bounds as integers only, and round or truncate before the call. The finding is catalogued on [Differs from official docs](/engagement/differs-from-docs/#random-decimal-bounds-rejected).

{% include test-script.html bundle="ampscript-functions--random" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Unlike the arithmetic functions, `Random` is filed under the utilities section of the official reference rather than the math section — its availability table was read separately and states the same API 67.0 support for Next.

## See also

- [Differs from official docs](/engagement/differs-from-docs/#random-decimal-bounds-rejected) — the decimal-bounds finding in full
- [`Mod`](/engagement/ampscript/functions/mod/) — useful for bucketing a random value
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-random.html) · [ampscript.guide](https://ampscript.guide/random/)
