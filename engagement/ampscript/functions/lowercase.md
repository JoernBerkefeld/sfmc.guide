---
layout: page
title: "Lowercase"
description: "Converts a value to lower case. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the culture-invariant casing that maps the dotted capital I to a plain ASCII i."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lowercase/
platforms:
  - engagement
  - next
syntax: "Lowercase(sourceString)"
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

```html
%%[
  VAR @key
  SET @key = Lowercase("Hello World")
]%%
%%=v(@key)=%%
```

Renders `hello world`.

The everyday use is normalising a value before comparing or keying on it:

```html
%%[
  VAR @email
  SET @email = Lowercase(AttributeValue("EmailAddress"))
]%%
```

Casing is culture-invariant, so this is safe for keys but not for locale-aware display text.

## Return value

**`string`** — the value converted to lower case.

The result is arbitrary transformed text, so there is no closed set of sentinel values to test for.

## Behaviour

**Letters are lowercased, everything else is left alone.** A mixed-case string containing digits and punctuation came back with only the letters changed.

**An empty string returns an empty string.**

**Accented capitals map to their accented lowercase form.** The capital accented vowels 192, 201, 206, 213 and 220 came back as 224, 233, 238, 245 and 252.

**Casing is culture-invariant, not Turkish.** The dotted capital I (codepoint 304) lowercases to the plain ASCII `i` (105), not to the Turkish dotted lowercase form. Do not rely on lowercasing to normalise text for locale-aware comparison.

**Numbers are returned unchanged.** `Lowercase(12345)` gives `12345`.

**Date values are stringified, then lowercased.** `Lowercase(Now())` rendered the formatted date with the `AM` meridiem lowercased to `am` — proof that the date was converted to text and then genuinely processed rather than passed through.

**Booleans are swallowed silently.** `Lowercase(true)` returns HTTP 200 with an *empty* result. Nothing coherent about the boolean survives, so this is a rejection rather than boolean support and the parameter type stays `string | number | date`. The same happens across the String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

{% include test-script.html bundle="ampscript-functions--lowercase" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct conversion look broken. Render the input alongside the result and dump both as codepoints before drawing any conclusion." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Uppercase`](/engagement/ampscript/functions/uppercase/) — the inverse conversion, which leaves the German sharp s alone
- [`Concat`](/engagement/ampscript/functions/concat/) · [`Length`](/engagement/ampscript/functions/length/) — the other verified String functions
- [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed) — booleans are swallowed across the whole String family
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-lowercase.html) · [ampscript.guide](https://ampscript.guide/lowercase/)
