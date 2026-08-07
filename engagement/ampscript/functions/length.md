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
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| number \| date | Yes | Value to measure |

## Example

```ampscript
%%[
  VAR @size
  SET @size = Length("Hello")
]%%
Length: %%=v(@size)=%%
```

Renders `Length: 5`.

The usual use is guarding an optional field before rendering it:

```ampscript
%%[
  IF Length(AttributeValue("FirstName")) > 0 THEN
]%%
  Hi %%=v(AttributeValue("FirstName"))=%%,
%%[ ELSE ]%%
  Hi there,
%%[ ENDIF ]%%
```

The count is in UTF-16 code units, so an emoji counts as two — see below before using it as a character limit.

## Return value

**`number`** — the count of UTF-16 code units in the value.

Every successful call rendered a bare non-negative integer. There is no closed set of sentinel values.

## Behaviour

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

{% include test-script.html bundle="ampscript-functions--length" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct count look wrong. Render the input alongside the count and dump both as codepoints before drawing any conclusion." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#length-counts-utf16-code-units) — the counting-unit finding in full
- [`Concat`](/engagement/ampscript/functions/concat/) — builds the string you are measuring
- [`Uppercase`](/engagement/ampscript/functions/uppercase/) — the sharp s survives uppercasing, so the measured length does not change
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-length.html) · [ampscript.guide](https://ampscript.guide/length/)
