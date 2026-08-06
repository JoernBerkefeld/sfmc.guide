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
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | `string \| number \| date` | Yes | Value to convert |

The parameter is typed `string | number | date` rather than `string` because numbers and date values are both accepted and stringified rather than rejected.

## Return value

**`string`** — the value converted to lower case.

The result is arbitrary transformed text, so there is no closed set of sentinel values to test for.

## Behaviour

**Exactly one argument.** Zero arguments abort the page; two arguments abort the page. Both cases return HTTP 422 and discard everything rendered before the call.

**Letters are lowercased, everything else is left alone.** A mixed-case string containing digits and punctuation came back with only the letters changed.

**An empty string returns an empty string.**

**Accented capitals map to their accented lowercase form.** The capital accented vowels 192, 201, 206, 213 and 220 came back as 224, 233, 238, 245 and 252.

**Casing is culture-invariant, not Turkish.** The dotted capital I (codepoint 304) lowercases to the plain ASCII `i` (105), not to the Turkish dotted lowercase form. Do not rely on lowercasing to normalise text for locale-aware comparison.

**Numbers are returned unchanged.** `Lowercase(12345)` gives `12345`.

**Date values are stringified, then lowercased.** `Lowercase(Now())` rendered the formatted date with the `AM` meridiem lowercased to `am` — proof that the date was converted to text and then genuinely processed rather than passed through.

**Booleans are swallowed silently.** `Lowercase(true)` returns HTTP 200 with an *empty* result. Nothing coherent about the boolean survives, so this is a rejection rather than boolean support and the parameter type stays `string | number | date`. The same happens across the String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed).

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=safe`, `?b=nau`, `?b=lo0`, and so on. The arity branches have to be isolated because they abort the whole page; a branch that renders nothing at all is the failure signal. Fetch with UTF-8 decoding or the non-ASCII branches are unreadable.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* safe sweep: ASCII letters change, digits and punctuation do not */
  IF @b == "safe" THEN
    OutputLine(Concat("LO1=[", Lowercase("HeLLo123!@#"), "]"))
  ENDIF

  /* empty string */
  IF @b == "empty" THEN
    OutputLine(Concat("LOE=[", Lowercase(""), "]"))
  ENDIF

  /* accented capitals: echo the input too so both sides can be codepoint-dumped */
  IF @b == "nau" THEN
    OutputLine(Concat("NAU_ECHO_CAFE=[", "CAFÉ", "]"))
    OutputLine(Concat("NAU_LO_CAFE=[", Lowercase("CAFÉ"), "]"))
    OutputLine(Concat("NAU_ECHO_ACC=[", "ÀÉÎÕÜ", "]"))
    OutputLine(Concat("NAU_LO_ACC=[", Lowercase("ÀÉÎÕÜ"), "]"))
  ENDIF

  /* invariant, not Turkish: the dotted capital I becomes a plain ASCII i */
  IF @b == "tr" THEN
    OutputLine(Concat("TR_ECHO_DOTI=[", "İ", "]"))
    OutputLine(Concat("TR_LO_DOTI=[", Lowercase("İ"), "]"))
    OutputLine(Concat("TR_LO_I=[", Lowercase("I"), "]"))
  ENDIF

  /* numbers pass through unchanged */
  IF @b == "lon" THEN
    OutputLine(Concat("LON=[", Lowercase(12345), "]"))
  ENDIF

  /* date: the AM meridiem comes back lowercased */
  IF @b == "lod" THEN
    OutputLine(Concat("LOD=[", Lowercase(Now()), "]"))
  ENDIF

  /* boolean: HTTP 200 but nothing renders between the brackets */
  IF @b == "lob" THEN
    OutputLine(Concat("LOB=[", Lowercase(true), "]"))
  ENDIF

  /* each arity branch aborts the page: the start marker never renders */
  IF @b == "lo0" THEN
    OutputLine(Concat("--- lo0 start ---"))
    OutputLine(Concat("LO0=[", Lowercase(), "]"))
  ENDIF

  IF @b == "lo2" THEN
    OutputLine(Concat("--- lo2 start ---"))
    OutputLine(Concat("LO2=[", Lowercase("a", "b"), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="A console that is not reading the response as UTF-8 turns non-ASCII input into mojibake and can make a correct conversion look broken. Render the input alongside the result and dump both as codepoints before drawing any conclusion." %}

## See also

- [`Uppercase`](/engagement/ampscript/functions/uppercase/) — the inverse conversion, which leaves the German sharp s alone
- [`Concat`](/engagement/ampscript/functions/concat/) · [`Length`](/engagement/ampscript/functions/length/) — the other verified String functions
- [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed) — booleans are swallowed across the whole String family
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-lowercase.html) · [ampscript.guide](https://ampscript.guide/lowercase/)
