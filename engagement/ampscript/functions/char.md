---
layout: page
title: "Char"
description: "Returns the character for a numeric character code. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that the code domain is not capped at 255."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/char/
platforms:
  - engagement
syntax: "Char(characterCode[, numRepetitions])"
return_type: string
min_args: 1
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `characterCode` | string \| number | Yes | Character code, as a whole number |
| `numRepetitions` | string \| number | No | Number of times to repeat the returned character, as a whole number |

## Example

```ampscript
%%[
  VAR @letter
  SET @letter = Char(65)
]%%
Letter: %%=v(@letter)=%%
```

Renders `Letter: A`.

The usual reason to reach for it is a character you cannot type into the source safely — a quote inside a quoted string, or a line break:

```ampscript
%%[
  VAR @quoted
  SET @quoted = Concat(Char(34), AttributeValue("ProductName"), Char(34))
]%%
```

## Return value

**`string`** — the character for the supplied code, repeated when a repetition count is given.

The value domain is open: any code that resolves produces its character, and a repetition count of `0` produces the empty string. There is no closed set of sentinel values to test for.

## Behaviour

**The optional second argument repeats the character.** `Char(65,3)` gives `AAA` and `Char(65,1)` gives `A`. A count of `0` produces an empty string — `Length(Char(65,0))` is `0`.

**Numeric strings are accepted for both parameters.** `Char("65")` gives the same `A` as the numeric literal, and `Char(65,"3")` gives the same `AAA`.

**Extended-ASCII codes resolve to their Latin-1 character.** `Char(190)` and `Char(255)` each render a single character, confirmed by dumping the response codepoints as 190 and 255 rather than a multi-byte misread.

**Control codes are produced verbatim.** `Char(0)`, `Char(9)`, `Char(10)`, `Char(13)` and `Char(32)` each return one character — including the NUL byte, which renders as codepoint 0 in the response and measures `Length` `1`. They are invisible in rendered output, so measure them rather than looking at them.

**A decimal code, a decimal repeat count, a negative repeat count, a boolean, and a non-numeric string all abort the page.** `Char(65.7)`, `Char(65,2.5)`, `Char(65,-1)`, `Char(true)` and `Char("abc")` each returned HTTP 422 with no start marker rendered, so nothing on the page survives. There is no error value to test for — guard the arguments before the call.

### The code domain is not capped at 255

This is the load-bearing finding, and the official reference frames the domain as extended ASCII without saying what a larger number does.

| Call | Renders |
|---|---|
| `Char(256)` | the character at codepoint 256 |
| `Char(9731)` | the character at codepoint 9731 |
| `Char(-1)` | the character at codepoint 65535 |
| `Char(65601)` | `A` — codepoint 65 |
| `Char(128512)` | the character at codepoint 62976 |

Codes are treated as 16-bit code-unit values, not as bytes and not as full Unicode codepoints. Anything at or above 65536 wraps: `65601` is `65601 - 65536 = 65`, which is why it renders `A`, and a code in the astral range collapses to a single unrelated code unit instead of the emoji a caller might expect. Every one of these returned `Length` `1`, so the function never produces a surrogate pair.

Each literal above was read from a per-character codepoint dump of the response rather than from a console, because an extended-ASCII character and a mis-decoded multi-byte sequence are indistinguishable by eye.

The capability is catalogued on [Differs from official docs](/engagement/differs-from-docs/#char-codes-above-255-work). The docs are silent here rather than wrong, so the entry is not flagged as contradicting them — but a code outside 0–255 has no documented contract, so do not lean on it for portability.

{% include test-script.html bundle="ampscript-functions--char" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns a non-ASCII character into mojibake and can make a correct result look wrong. Dump the rendered value as codepoints before drawing any conclusion." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#char-codes-above-255-work) — the uncapped code domain in full
- [`Concat`](/engagement/ampscript/functions/concat/) — joins the characters you build with `Char`
- [`Length`](/engagement/ampscript/functions/length/) — how the resulting characters are counted
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-char.html) · [ampscript.guide](https://ampscript.guide/char/)
