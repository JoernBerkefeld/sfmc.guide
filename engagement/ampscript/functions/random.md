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
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `min` | `string \| number` | Yes | Lower bound (inclusive) |
| `max` | `string \| number` | Yes | Upper bound (inclusive) |

Both parameters are typed `string | number` rather than `number` because a whole-number string is accepted at runtime and behaves exactly like the numeric literal. Both must be whole numbers — see the decimal-bounds section below.

## Return value

**`number`** — a random whole number within the supplied range.

Across roughly a hundred sampled calls, every returned value rendered as a bare integer; a decimal point never appeared. The value set is bounded only by the arguments you pass, so there is no fixed catalog of possible literals.

## Behaviour

**Exactly two arguments.** One argument aborts the page; three arguments abort the page.

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

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Unlike the arithmetic functions, `Random` is filed under the utilities section of the official reference rather than the math section — its availability table was read separately and states the same API 67.0 support for Next.

## Test script

Inclusivity cannot be proven by a single call, so the safe branches sample tight ranges inside a `FOR` loop and compare the observed value set against the closed expected set. Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=rbounds`, `?b=rd1`, and so on. A branch that renders nothing at all is the failure signal.

```html
%%[
  VAR @b, @i, @s1, @s2
  SET @b = RequestParameter("b")

  /* inclusivity: sample tight ranges in bulk, then check the value set */
  IF @b == "rbounds" THEN
    SET @s1 = ""
    FOR @i = 1 TO 30 DO
      SET @s1 = Concat(@s1, Random(1,2), ",")
    NEXT @i
    OutputLine(Concat("Random(1,2)x30=[", @s1, "]"))

    SET @s2 = ""
    FOR @i = 1 TO 30 DO
      SET @s2 = Concat(@s2, Random(1,3), ",")
    NEXT @i
    OutputLine(Concat("Random(1,3)x30=[", @s2, "]"))

    OutputLine(Concat("Random(5,5)=[", Random(5,5), "]"))
  ENDIF

  /* reversed bounds: accepted, full inclusive range still produced */
  IF @b == "rmm" THEN
    SET @s1 = ""
    FOR @i = 1 TO 20 DO
      SET @s1 = Concat(@s1, Random(3,1), ",")
    NEXT @i
    OutputLine(Concat("Random(3,1)x20=[", @s1, "]"))
  ENDIF

  /* negative range */
  IF @b == "rneg" THEN
    SET @s1 = ""
    FOR @i = 1 TO 20 DO
      SET @s1 = Concat(@s1, Random(-2,-1), ",")
    NEXT @i
    OutputLine(Concat("Random(-2,-1)x20=[", @s1, "]"))
  ENDIF

  /* whole-number strings */
  IF @b == "rstr" THEN
    SET @s1 = ""
    FOR @i = 1 TO 20 DO
      SET @s1 = Concat(@s1, Random("1","2"), ",")
    NEXT @i
    OutputLine(Concat("Random('1','2')x20=[", @s1, "]"))
  ENDIF

  /* decimal bounds: every one of these aborts the page with HTTP 422 */
  IF @b == "rd1" THEN
    OutputLine(Concat("--- rd1 start ---"))
    OutputLine(Concat("Random(1.2,1.8)=[", Random(1.2,1.8), "]"))
  ENDIF

  IF @b == "rd2" THEN
    OutputLine(Concat("--- rd2 start ---"))
    OutputLine(Concat("Random(1,2.5)=[", Random(1,2.5), "]"))
  ENDIF

  IF @b == "rd3" THEN
    OutputLine(Concat("--- rd3 start ---"))
    OutputLine(Concat("Random(1.0,3.0)=[", Random(1.0,3.0), "]"))
  ENDIF

  IF @b == "rd4" THEN
    OutputLine(Concat("--- rd4 start ---"))
    OutputLine(Concat("Random('1.5','3.5')=[", Random("1.5","3.5"), "]"))
  ENDIF

  /* arity and type rejections */
  IF @b == "fewr" THEN
    OutputLine(Concat("--- fewr start ---"))
    OutputLine(Concat("Random(1)=[", Random(1), "]"))
  ENDIF

  IF @b == "manyr" THEN
    OutputLine(Concat("--- manyr start ---"))
    OutputLine(Concat("Random(1,2,3)=[", Random(1,2,3), "]"))
  ENDIF

  IF @b == "strr" THEN
    OutputLine(Concat("--- strr start ---"))
    OutputLine(Concat("Random('abc',3)=[", Random("abc",3), "]"))
  ENDIF

  IF @b == "boolr" THEN
    OutputLine(Concat("--- boolr start ---"))
    OutputLine(Concat("Random('true',3)=[", Random("true",3), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [Differs from official docs](/engagement/differs-from-docs/#random-decimal-bounds-rejected) — the decimal-bounds finding in full
- [`Mod`](/engagement/ampscript/functions/mod/) — useful for bucketing a random value
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-random.html) · [ampscript.guide](https://ampscript.guide/random/)
