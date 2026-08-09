---
layout: page
title: "StringToHex"
description: "Converts a string to its hexadecimal representation. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that it renders the UTF-8 bytes of the input in lowercase with no separators, and that the charSet argument accepts four names beyond the two documented."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/stringtohex/
platforms:
  - engagement
syntax: "StringToHex(sourceString[, charSet])"
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
| `sourceString` | string | Yes | The string to render as hexadecimal; the empty string yields the empty string |
| `charSet` | string | No | Name of the character encoding applied before conversion; defaults to UTF-8 |

## Example

```html
%%[
  VAR @hex
  SET @hex = StringToHex("SFMC AMPscript 2026")
]%%
%%=v(@hex)=%%
```

Renders `53464d4320414d507363726970742032303236`.

It is most useful when a receiving system specifies a hex-encoded value, in which case the encoding usually has to be named explicitly:

```html
%%[
  VAR @signature
  SET @signature = StringToHex(Concat("order-", AttributeValue("OrderId")), "UTF-16")
]%%
<img src="https://example.org/px?sig=%%=v(@signature)=%%" width="1" height="1">
```

Agree the encoding with the receiving system first — the same string produces a completely different hex value under each one.

## Return value

**`string`** — lowercase hexadecimal digits with no separators, two per byte of the encoded input.

There is no closed set of sentinel values to test for: every accepted input produces a hex string, and a rejected encoding name aborts the page instead of returning an error token.

## Behaviour

**The output is lowercase and completely unseparated.** `StringToHex("SFMC AMPscript 2026")` gave `53464d4320414d507363726970742032303236` — 38 characters measured on the page for a 19-byte input. There is no `0x` prefix, no space and no delimiter of any kind, and the letters are lowercase: the `M` of `SFMC` is `4d`, never `4D`.

**The bytes rendered are the UTF-8 form of the input.** A string containing `é` and `€` gave `636166c3a9e282ac`, in which `é` occupies two bytes (`c3a9`) and `€` three (`e282ac`). The function renders bytes, not code points — `é` never appears as `e9` under the default.

**The empty string yields the empty string.** It is converted, not refused, and the page returns HTTP 200.

### The charSet argument accepts more than is documented

Both our catalog and the official reference list `UTF-8` and `UTF-16`. Four more names work exactly as well, each rendering the hex of precisely those bytes:

| Call on the same non-ASCII input | Renders |
|---|---|
| `StringToHex(@s, "UTF-8")` | `636166c3a9e282ac` |
| `StringToHex(@s, "UTF-16")` | `630061006600e900ac20` |
| `StringToHex(@s, "UTF-16BE")` | `00630061006600e920ac` |
| `StringToHex(@s, "UTF-32")` | `630000006100000066000000e9000000ac200000` |
| `StringToHex(@s, "ASCII")` | `6361663f3f` |
| `StringToHex(@s, "ISO-8859-1")` | `636166e93f` |

`UTF-16` means little-endian. The last two rows are lossy and silent about it: `3f` is a question mark, substituted for every character the encoding cannot represent — `ISO-8859-1` keeps `é` as `e9` but loses `€`. This is the same accepted domain the [hash family](/engagement/ampscript/functions/sha256/) proved.

An unrecognised name is rejected outright — `banana` aborted the page with HTTP 422 rather than falling back to the default.

{% include test-script.html bundle="ampscript-functions--stringtohex" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="When a case involves non-ASCII characters, print the input string alongside the hex value. A mangled test string produces a perfectly valid rendering of the wrong bytes, which is indistinguishable from a function defect unless the input is visible in the same output." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Base64Encode](/engagement/ampscript/functions/base64encode/) · [Base64Decode](/engagement/ampscript/functions/base64decode/) — the same bytes in a denser alphabet, and reversible
- [SHA256](/engagement/ampscript/functions/sha256/) — the same charSet domain, applied before hashing
- [Encoding names are wider than documented](/engagement/differs-from-docs/#stringtohex-wider-charset-domain)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-to-hex.html) · [ampscript.guide](https://ampscript.guide/stringtohex/)
