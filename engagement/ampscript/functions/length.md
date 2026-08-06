---
layout: page
title: "Length"
description: "Measures the size of a string. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the counting unit, which is UTF-16 code units rather than user-visible characters."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/length/
platforms:
  - engagement
  - next
syntax: "Length(sourceString)"
return_type: number
min_args: 1
max_args: 1
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | `string \| number \| date` | Yes | Value to measure |

The parameter is typed `string | number | date` rather than `string` because numbers and date values are both accepted and measured by their string form rather than rejected.

## Return value

**`number`** — the count of UTF-16 code units in the value.

Every successful call rendered a bare non-negative integer. There is no closed set of sentinel values.

## Behaviour

**Exactly one argument.** Zero arguments abort the page; two arguments abort the page. Both cases return HTTP 422 and discard everything rendered before the call.

**Plain ASCII counts one per character.** `Length("Hello")` gives `5` and `Length("Hello World")` gives `11`.

**An empty string measures `0`.**

**Numbers are measured by their string form.** `Length(12345)` gives `5`.

**Date values are measured by their formatted string.** `Length(Now())` gave `19`, matching the length of the rendered date.

**Booleans are swallowed silently.** `Length(true)` returns HTTP 200 and renders `0` — the boolean contributes nothing measurable. That is a rejection rather than boolean support, so the parameter type stays `string | number | date`. The same swallowing happens across the String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

### The counting unit is UTF-16 code units

This is the load-bearing finding for this function, and the official reference does not define the unit at all.

| Call | Renders |
|---|---|
| a four-letter ASCII word | `4` |
| a four-letter word ending in a precomposed accented `e` | `4` |
| a six-letter German word containing the sharp s | `6` |
| a single emoji from outside the Basic Multilingual Plane | `2` |

The emoji is one user-visible character but two code units, and `Length` reports `2`. This was settled by dumping the codepoints of the *echoed* input alongside the returned count: the emoji echoed as the surrogate pair 55357/56832, the accented letter echoed as the single codepoint 233, so a mis-decoding console could not have manufactured the result.

The practical consequence is truncation and validation. A limit enforced with `Length` accepts one fewer user-visible character as soon as an emoji is involved, and cutting a string at a code-unit position can split a surrogate pair. The finding is catalogued on [Differs from official docs](/engagement/differs-from-docs/#length-counts-utf16-code-units).

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=safe`, `?b=nal`, `?b=l0`, and so on. The arity branches have to be isolated because they abort the whole page; a branch that renders nothing at all is the failure signal. Fetch with UTF-8 decoding or the non-ASCII branch is unreadable.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* safe sweep: plain ASCII */
  IF @b == "safe" THEN
    OutputLine(Concat("L5=[", Length("Hello"), "]"))
    OutputLine(Concat("L11=[", Length("Hello World"), "]"))
  ENDIF

  /* counting unit: echo the input next to the count so the codepoints can be dumped */
  IF @b == "nal" THEN
    OutputLine(Concat("NAL_ASCII4=[", Length("abcd"), "]"))
    OutputLine(Concat("NAL_ECHO_CAFE=[", "café", "]"))
    OutputLine(Concat("NAL_CAFE=[", Length("café"), "]"))
    OutputLine(Concat("NAL_ECHO_SS=[", "Straße", "]"))
    OutputLine(Concat("NAL_SS=[", Length("Straße"), "]"))
    OutputLine(Concat("NAL_ECHO_EMO=[", "😀", "]"))
    OutputLine(Concat("NAL_EMO=[", Length("😀"), "]"))
  ENDIF

  /* empty string */
  IF @b == "empty" THEN
    OutputLine(Concat("LE=[", Length(""), "]"))
  ENDIF

  /* numbers and dates are measured by their string form */
  IF @b == "ln" THEN
    OutputLine(Concat("LN=[", Length(12345), "]"))
  ENDIF

  IF @b == "ld" THEN
    OutputLine(Concat("LD_ECHO=[", Now(), "]"))
    OutputLine(Concat("LD=[", Length(Now()), "]"))
  ENDIF

  /* boolean: HTTP 200, renders 0 */
  IF @b == "lb" THEN
    OutputLine(Concat("LB=[", Length(true), "]"))
  ENDIF

  /* each arity branch aborts the page: the start marker never renders */
  IF @b == "l0" THEN
    OutputLine(Concat("--- l0 start ---"))
    OutputLine(Concat("L0=[", Length(), "]"))
  ENDIF

  IF @b == "l2" THEN
    OutputLine(Concat("--- l2 start ---"))
    OutputLine(Concat("L2=[", Length("a", "b"), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct count look wrong. Render the input alongside the count and dump both as codepoints before drawing any conclusion." %}

## See also

- [Differs from official docs](/engagement/differs-from-docs/#length-counts-utf16-code-units) — the counting-unit finding in full
- [`Concat`](/engagement/ampscript/functions/concat/) — builds the string you are measuring
- [`Uppercase`](/engagement/ampscript/functions/uppercase/) — the sharp s survives uppercasing, so the measured length does not change
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-length.html) · [ampscript.guide](https://ampscript.guide/length/)
