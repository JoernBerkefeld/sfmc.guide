---
layout: page
title: "ProperCase"
description: "Converts a value to proper (title) case. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that every letter after the first of a word is forced to lower case."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/propercase/
platforms:
  - engagement
  - next
syntax: "ProperCase(sourceString)"
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
  VAR @name
  SET @name = ProperCase("BARB BROWN")
]%%
%%=v(@name)=%%
```

Renders `Barb Brown`.

The safe use is tidying a field that arrives in all caps, where there is no casing to lose:

```ampscript
%%[
  VAR @city
  SET @city = ProperCase(Trim(AttributeValue("City")))
]%%
```

Running it over mixed-case text is a different matter — the conversion destroys capitals inside a word, see below.

## Return value

**`string`** — the value with the first letter of each word capitalized and the rest lower-cased.

The result is arbitrary cased text, so there is no closed set of sentinel values to test for.

## Behaviour

**Whitespace is preserved exactly.** `ProperCase("  spaced   out  ")` gives `  Spaced   Out  ` — the padding and the inner run of spaces both survive, so this is not a substitute for [`Trim`](/engagement/ampscript/functions/trim/).

**An empty string returns an empty string**, and a single-letter word is capitalized — `ProperCase("x")` gives `X`.

**Accented letters are cased like any other.** A leading accented lowercase vowel came back as its accented capital, and the German sharp s is returned unchanged rather than expanding.

**Numbers and dates are accepted and handled as their string form.** `ProperCase(12345)` gives `12345`, and `ProperCase(Now())` returned the formatted date with the `PM` meridiem re-cased as `Pm` — proof that the value was stringified and genuinely processed.

**Booleans are swallowed silently.** `ProperCase(true)` returns HTTP 200 with an *empty* result, so this is a rejection rather than boolean support and the parameter type stays `string | number | date`. The same happens across the String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

### The conversion is destructive, not additive

This is the load-bearing finding. Raising the first letter of a word is only half of what happens — every remaining letter in that word is forced down.

| Call | Renders |
|---|---|
| `ProperCase("iPhone")` | `Iphone` |
| `ProperCase("McDONALD")` | `Mcdonald` |
| `ProperCase("HTML and CSS")` | `Html And Css` |
| `ProperCase("o'neill mcdonald-smith")` | `O'neill Mcdonald-smith` |
| `ProperCase("a1b c2d")` | `A1b C2d` |

The last two rows show that word boundaries are narrower than they look: a letter directly after an apostrophe, hyphen, full stop or comma is *not* raised, so this cannot format names like `O'Neill` or `McDonald-Smith` correctly. A digit does not block the word either — `ProperCase("3rd street")` gives `3rd Street`.

So the function is safe on all-caps input and lossy on anything else. If the source may already carry meaningful capitals, leave it alone or case it yourself.

The behaviour is catalogued on [Differs from official docs](/engagement/differs-from-docs/#propercase-lowercases-the-rest). The official reference is silent about the lower-casing rather than wrong about it, so the entry is not flagged as contradicting the docs.

{% include test-script.html bundle="ampscript-functions--propercase" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct conversion look broken. Render the input alongside the result and dump both as codepoints before drawing any conclusion." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#propercase-lowercases-the-rest) — the destructive lower-casing in full
- [`Uppercase`](/engagement/ampscript/functions/uppercase/) · [`Lowercase`](/engagement/ampscript/functions/lowercase/) — the non-destructive whole-string conversions
- [`Trim`](/engagement/ampscript/functions/trim/) — remove padding before casing a field
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-propercase.html) · [ampscript.guide](https://ampscript.guide/propercase/)
