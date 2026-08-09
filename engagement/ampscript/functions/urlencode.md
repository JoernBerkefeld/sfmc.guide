---
layout: page
title: "URLEncode"
description: "URL-encodes a string for safe inclusion in a URL. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the default that leaves a value which is not a URL completely unchanged."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/urlencode/
platforms:
  - engagement
syntax: "URLEncode(urlToEncode[, encodeAllChars, encodeAllStrings])"
return_type: string
min_args: 1
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
| `urlToEncode` | string \| number | Yes | Value to make safe for use in a URL |
| `encodeAllChars` | string \| boolean \| number | No | Switches on full encoding of the query string; off by default |
| `encodeAllStrings` | string \| boolean \| number | No | Switches on encoding of the whole input, not just a query string; off by default |

Each flag accepts `1`/`0`, `true`/`false`, or any of those four words quoted as a string.

## Example

```html
%%[
  VAR @safe
  SET @safe = URLEncode("https://example.org/go?promo=spring sale&tags=a,b")
]%%
%%=v(@safe)=%%
```

Renders `https://example.org/go?promo=spring%20sale&tags=a,b`.

A bare field value needs both flags, otherwise nothing happens to it:

```html
%%[
  VAR @promo, @link
  SET @promo = "spring sale"
  SET @link = Concat("https://example.org/go?promo=", URLEncode(@promo, 1, 1))
]%%
<a href="%%=v(@link)=%%">Shop now</a>
```

That builds `https://example.org/go?promo=spring+sale`. Why the flags are needed for a plain value is the subject of the next chapter.

## Return value

**`string`** — the encoded form of the input.

Hex escapes are written in lower case (`%3d`, `%2c`). There is no closed set of sentinel values to test for: an empty input returns an empty string, and every rejected call aborts the page rather than returning a marker value.

## Behaviour

**By default only the segment after a question mark is touched, and only spaces are converted.** The literal `spring sale` comes back as `spring sale`, unchanged, while `https://example.org/go?promo=spring sale&tags=a,b` comes back as `https://example.org/go?promo=spring%20sale&tags=a,b` — the space became `%20`, and the comma, ampersand and equals sign were left alone.

**Switching `encodeAllChars` on percent-encodes the reserved query characters and turns spaces into plus signs.** The same URL then renders as `https://example.org/go?promo%3dspring+sale%26tags%3da%2cb`. The scheme and host before the question mark are never encoded, whatever the flags say.

**Switching `encodeAllStrings` on makes a non-URL input eligible.** `spring sale` renders as `spring%20sale` with the second flag alone, and as `spring+sale` when both flags are on.

**Omitting the third argument is the same as switching it off.** A two-argument call on the URL above produced exactly the value the three-argument call with a trailing off value produced.

**Numbers are accepted as the input.** Encoding the numeric literal `4821` gives `4821`, so a numeric field needs no conversion first. An empty input returns an empty string.

### The two flags have four interchangeable spellings

| Call on `spring sale` | Renders |
|---|---|
| `URLEncode(@promo, 0, 1)` | `spring%20sale` |
| `URLEncode(@promo, false, true)` | `spring%20sale` |
| `URLEncode(@promo, "0", "1")` | `spring%20sale` |
| `URLEncode(@promo, 1, 1)` | `spring+sale` |
| `URLEncode(@promo, true, true)` | `spring+sale` |
| `URLEncode(@promo, "1", "1")` | `spring+sale` |

The integer form and the boolean form are not two behaviours — all four combinations of the two flags were run in both spellings over the same input and matched character for character. The quoted spellings reach the same code path, so a flag read out of a data extension field works without conversion. A value outside the two states is accepted rather than rejected: passing `2` for both flags rendered the input untouched, i.e. it behaved like the off state.

Catalogued on [Differs from official docs](/engagement/differs-from-docs/#urlencode-flag-spellings-and-default-passthrough). The official page describes the flags as integers and the community reference as booleans; neither is contradicted by the runtime, both are simply incomplete, so the entry is not flagged as disagreeing with the docs.

{% include test-script.html bundle="ampscript-functions--urlencode" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#urlencode-flag-spellings-and-default-passthrough) — the flag spellings and the default pass-through in full
- [`Concat`](/engagement/ampscript/functions/concat/) — build the URL before encoding the part that needs it
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-url-encode.html) · [ampscript.guide](https://ampscript.guide/urlencode/)
