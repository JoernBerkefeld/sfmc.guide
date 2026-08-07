---
layout: page
title: "Uppercase"
description: "Converts a value to upper case. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the German sharp s, which is returned untouched instead of expanding to a double S."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/uppercase/
platforms:
  - engagement
  - next
syntax: "Uppercase(sourceString)"
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
| `sourceString` | string \| number \| date | Yes | Value to convert |

## Example

```ampscript
%%[
  VAR @shout
  SET @shout = Uppercase("Hello World")
]%%
%%=v(@shout)=%%
```

Renders `HELLO WORLD`.

Typical use is a country or currency code that has to render consistently regardless of how it was stored:

```ampscript
%%[
  VAR @country
  SET @country = Uppercase(AttributeValue("CountryCode"))
]%%
```

## Return value

**`string`** — the value converted to upper case.

The result is arbitrary transformed text, so there is no closed set of sentinel values to test for.

## Behaviour

**Letters are uppercased, everything else is left alone.** A mixed-case string containing digits and punctuation came back with only the letters changed.

**An empty string returns an empty string.**

**Accented lowercase letters map to their accented capital form.** The lowercase accented vowels 224, 233, 238, 245 and 252 came back as 192, 201, 206, 213 and 220.

**Casing is culture-invariant, not Turkish.** The dotless i (codepoint 305) uppercases to the plain ASCII `I` (73), not to the dotted capital a Turkish locale would produce.

**Numbers are returned unchanged.** `Uppercase(12345)` gives `12345`.

**Date values are stringified, then uppercased.** `Uppercase(Now())` returned HTTP 200 with the formatted date; the matching `Lowercase` call rendered the same meridiem as `am`, confirming the transformation really ran.

**Booleans are swallowed silently.** `Uppercase(false)` returns HTTP 200 with an *empty* result. Nothing coherent about the boolean survives, so this is a rejection rather than boolean support and the parameter type stays `string | number | date`. See [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

### The German sharp s is not expanded

Uppercasing a six-letter German word containing the sharp s returned the codepoints 83, 84, 82, 65, 223, 69 — the sharp s (223) sat unchanged between the surrounding capitals. The result is still six characters, not the seven a caller expecting an `SS` expansion would get, so [`Length`](/engagement/ampscript/functions/length/) of the result is unchanged as well.

This is a specific gap rather than non-ASCII input being ignored wholesale: the accented vowels in the same sweep *were* mapped correctly. The official reference makes no claim about the sharp s, so this is undocumented behaviour rather than a contradiction. It is catalogued on [Differs from official docs](/engagement/differs-from-docs/#uppercase-sharp-s-not-expanded).

{% include test-script.html bundle="ampscript-functions--uppercase" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct conversion look broken. Render the input alongside the result and dump both as codepoints before drawing any conclusion." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#uppercase-sharp-s-not-expanded) — the sharp-s finding in full
- [`Lowercase`](/engagement/ampscript/functions/lowercase/) — the inverse conversion
- [`Concat`](/engagement/ampscript/functions/concat/) · [`Length`](/engagement/ampscript/functions/length/) — the other verified String functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-uppercase.html) · [ampscript.guide](https://ampscript.guide/uppercase/)
