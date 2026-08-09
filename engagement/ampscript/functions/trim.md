---
layout: page
title: "Trim"
description: "Removes leading and trailing whitespace from a value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that tabs, line breaks and the non-breaking space all count as whitespace."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/trim/
platforms:
  - engagement
  - next
syntax: "Trim(sourceString)"
return_type: string
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
| `sourceString` | string \| number \| date | Yes | Value to trim |

## Example

```ampscript
%%[
  VAR @name
  SET @name = Trim("  hello  ")
]%%
%%=v(@name)=%%
```

Renders `hello`.

The everyday use is cleaning a field before storing or comparing it, where the padding is invisible in the source data:

```ampscript
%%[
  VAR @city
  SET @city = Trim(AttributeValue("City"))
]%%
```

## Return value

**`string`** — the value with whitespace removed from both ends.

The result is arbitrary trimmed text, so there is no closed set of sentinel values to test for.

## Behaviour

**Only the outer edges are touched.** `Trim("  a  b  ")` gives `a  b` — the two inner spaces survive. This never collapses or normalises spacing inside the value.

**A value with no padding comes back unchanged.** `Trim("noPad")` gives `noPad`.

**An empty string and an all-whitespace string both return an empty string.** Trimming five spaces measured `Length` `0`.

**Numbers and dates are accepted and handled as their string form.** `Trim(12345)` gives `12345`, and `Trim(Now())` returns the formatted date. A numeric string trims like any other string — `Trim("  42  ")` gives `42`.

**Booleans are swallowed silently.** `Trim(true)` returns HTTP 200 with an *empty* result, so this is a rejection rather than boolean support and the parameter type stays `string | number | date`. The same happens across the String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

### Whitespace is more than the space character

The tab (9), line feed (10), carriage return (13) and the non-breaking space (160) are all stripped. Each case padded a single letter and measured the result, because the characters are invisible in rendered output:

| Padding around one letter | `Length` after trimming |
|---|---|
| tab | 1 |
| line feed | 1 |
| carriage return | 1 |
| non-breaking space | 1 |
| mixed tab, line feed, space and carriage return | 1 |

The non-breaking space matters most in practice: it survives most copy-paste cleanup and looks identical to a space, so a value that appears untrimmable is often padded with it. Non-ASCII characters *inside* the value are preserved exactly — an accented three-letter payload came back with its codepoints unchanged and `Length` `3`.

{% include test-script.html bundle="ampscript-functions--trim" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="Whitespace and non-ASCII characters are invisible or ambiguous in rendered output. Measure the result with `Length` and dump it as codepoints rather than judging it by eye." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`ProperCase`](/engagement/ampscript/functions/propercase/) — cases a value without trimming it
- [`Length`](/engagement/ampscript/functions/length/) — how to measure whether a trim actually removed anything
- [`Concat`](/engagement/ampscript/functions/concat/) — joins values without touching their padding
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-trim.html) · [ampscript.guide](https://ampscript.guide/trim/)
