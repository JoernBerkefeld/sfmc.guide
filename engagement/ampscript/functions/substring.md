---
layout: page
title: "Substring"
description: "Extracts a portion of a string starting at the given index for the specified length. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including a start position below 1 that clamps silently while a negative length aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/substring/
platforms:
  - engagement
  - next
syntax: "Substring(sourceString, startPosition[, substringLength])"
return_type: string
min_args: 2
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| number | Yes | String to take a portion of |
| `startPosition` | string \| number | Yes | 1-based position to start at, as a whole number |
| `substringLength` | string \| number | No | Number of characters to take, as a whole number |

## Example

```ampscript
%%[
  VAR @part
  SET @part = Substring("Hello World", 1, 5)
]%%
Part: %%=v(@part)=%%
```

Renders `Part: Hello`.

The usual pattern pairs it with [`IndexOf`](/engagement/ampscript/functions/indexof/) to cut a value at a separator — note the guard, because a missing separator would otherwise produce a negative length:

```ampscript
%%[
  VAR @fullName, @space, @first
  SET @fullName = "Dale Cameron"
  SET @space = IndexOf(@fullName, " ")
  IF @space > 1 THEN
    SET @first = Substring(@fullName, 1, Subtract(@space, 1))
  ELSE
    SET @first = @fullName
  ENDIF
]%%
```

That guard is not optional — a negative length aborts the page, see below.

## Return value

**`string`** — the requested portion of the source.

An empty string is the only sentinel: it comes back when the start position is past the end of the source, when the requested length is `0`, and when the source itself is empty. The returned text is otherwise an open domain, so there is no closed set of values to test for.

## Behaviour

**Positions are 1-based and the extraction runs forward.** `Substring("Hello World", 1, 5)` gives `Hello`, starting at `7` gives `Wor` for a length of `3`, and position `11` is the trailing `d`.

**Omitting the length returns the remainder.** `Substring("Hello World", 7)` gives `World`, and starting at the final position gives just `d`.

**A start past the end returns an empty string, and an over-long length is capped.** Starting at `20` in an eleven-character source returns nothing at all, while asking for `99` characters from position `7` returns the five that remain rather than failing.

**Numbers are accepted for all three parameters and numeric strings for the two numeric ones.** Taking two characters from position `3` of the numeric literal `9876543` gives `76`, and quoting the start, the length, or both gives the same result as the bare numbers. A boolean source renders an empty string — it never becomes extractable text — and a boolean in either numeric position aborts the page, as do a decimal and a lettered string.

**Counting is in UTF-16 code units, the same unit [`Length`](/engagement/ampscript/functions/length/) counts.** In a source built as `caf` + `Char(233)` + `" time"`, which measures `9`, taking one character at position `4` yields a value whose own `Length` is `1`, and starting at `6` lands exactly on the following word.

### The two numeric arguments disagree about negatives

| Call | Renders |
|---|---|
| `Substring("Hello World", 1, 5)` | `Hello` |
| `Substring("Hello World", 0, 5)` | `Hello` |
| `Substring("Hello World", -3, 5)` | `Hello` |
| `Substring("Hello World", 3, 0)` | *(empty)* |
| `Substring("Hello World", 3, -2)` | *page aborts* |

A start position below `1` is silently clamped to the first character, so an off-by-one in the position is invisible. A negative *length* is not tolerated: it aborts the page with HTTP 422 and discards everything already rendered. Since lengths are usually computed by subtracting two positions, guard the arithmetic before the call rather than expecting the same forgiveness the start position gets.

Catalogued on [Differs from official docs](/engagement/differs-from-docs/#substring-negative-arguments-disagree). The docs are silent on both bounds rather than wrong about them, so the entry is not flagged as contradicting them.

{% include test-script.html bundle="ampscript-functions--substring" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#substring-negative-arguments-disagree) — the negative-argument asymmetry in full
- [`IndexOf`](/engagement/ampscript/functions/indexof/) — locates the position to start at
- [`Length`](/engagement/ampscript/functions/length/) — the counting unit positions and lengths use
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-substring.html) · [ampscript.guide](https://ampscript.guide/substring/)
