---
layout: page
title: "AMPscript URLEncode (Next)"
description: "Make a value safe for a URL with AMPscript URLEncode in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including what each flag changes."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/urlencode/
platforms:
  - next
syntax: "URLEncode(urlToEncode[, encodeAllChars, encodeAllStrings])"
return_type: string
min_args: 1
max_args: 3
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "With `encodeAllChars` on, Engagement encodes the whole query string and writes spaces as `+` (`promo%3dspring+sale%26tags%3da%2cb`, `spring+sale`); Next keeps `=` and `&`, writes spaces as `%20` and encodes only the comma, as `%2C` (`promo=spring%20sale&tags=a%2Cb`, `spring%20sale`). A flag value of `2` acts as off in Engagement (`spring sale`) but encodes in Next (`spring%20sale`)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `urlToEncode` | string \| number | Yes | Value to make safe for use in a URL |
| `encodeAllChars` | string \| boolean \| number | No | Switches on full encoding of the query string; off by default. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |
| `encodeAllStrings` | string \| boolean \| number | No | Switches on encoding of the whole input, not just a query string; off by default. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

One to three arguments. Each flag gave the same result whether written as `1`/`0`, `true`/`false` or as one of those words in quotes.

## Example

```ampscript
%%=URLEncode("https://example.org/go?promo=spring sale&tags=a,b")=%%
```

Renders `https://example.org/go?promo=spring%20sale&tags=a,b`.

A value that is not a URL needs `encodeAllStrings`, otherwise it comes back unchanged:

```ampscript
%%=URLEncode("spring sale", 0, 1)=%%
```

Renders `spring%20sale`.

## Return value

**`string`** — the encoded form of the input.

An empty input gives an empty string. There is no special value to test for.

## Behaviour

**Argument count.** An email that calls `URLEncode()` or passes four arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**By default only spaces after the question mark change.** `https://example.org/go?promo=spring sale&tags=a,b` renders as `https://example.org/go?promo=spring%20sale&tags=a,b`. A value without a question mark comes back untouched: `spring sale` stays `spring sale`, and `a b&c` stays `a b&c`. Passing both flags as off (`0, 0` or `false, false`), or only the first flag as off, gives the same result.

**`encodeAllChars` also encodes the comma.** With the first flag on and the second off or left out, the URL renders as `https://example.org/go?promo=spring%20sale&tags=a%2Cb`. The `=` and `&` stay as they are, spaces stay `%20`, and the escape is written in upper case.

**`encodeAllStrings` makes any input eligible.** `URLEncode("spring sale", 0, 1)` renders `spring%20sale`. With both flags on the result is the same, `spring%20sale`: spaces are never written as `+`.

**Flag spellings are interchangeable.** `1`, `true`, `"1"` and `"true"` all act as on; `0`, `false`, `"0"` and `"false"` all act as off.

**A flag value of `2` acts as on.** `URLEncode("spring sale", 2, 2)` renders `spring%20sale`.

**Numbers and empty strings are accepted.** `URLEncode(4821)` gives `4821`, and `URLEncode("")` gives an empty string.

{% include test-script.html bundle="next-ampscript-functions--urlencode" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--urlencode" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Available in Next.** The official reference marks URLEncode as not available in Marketing Cloud Next. It saved and rendered correctly in a Next email (see the examples above). [Details](/next/differs-from-docs/#urlencode-available-in-next)
- **`encodeAllChars` output.** The official examples show `=` escaped as `%3d` and spaces written as `+` once the flag is on. In Next, `=` and `&` are kept, spaces stay `%20`, and only the comma is escaped, as `%2C`; with both flags on, `spring sale` becomes `spring%20sale`. [Details](/next/differs-from-docs/#urlencode-encodeallchars-output)

{% include platform-compare.html %}

## See also

- [`URLEncode` in Marketing Cloud Engagement](/engagement/ampscript/functions/urlencode/) — how it behaves there
- [`Concat`](/next/ampscript/functions/concat/) — build the URL around the encoded part
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-url-encode.html)
