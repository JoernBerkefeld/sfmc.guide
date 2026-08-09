---
layout: page
title: "Base64Encode"
description: "Encodes a value as a Base64 string. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the bytes encoded are the UTF-8 form of the input, and that the encoding argument accepts far more names than any source lists."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/base64encode/
platforms:
  - engagement
syntax: "Base64Encode(value[, encoding])"
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
| `value` | string | Yes | The value to encode; the empty string encodes to the empty string |
| `encoding` | string | No | Name of the character encoding applied before encoding; defaults to UTF-8 |

## Example

```html
%%[
  VAR @encoded
  SET @encoded = Base64Encode("SFMC AMPscript 2026")
]%%
%%=v(@encoded)=%%
```

Renders `U0ZNQyBBTVBzY3JpcHQgMjAyNg==`.

The usual reason to reach for it is packing a value into somewhere that only tolerates a limited character set, such as a link:

```html
%%[
  VAR @payload, @token
  SET @payload = Concat(AttributeValue("EmailAddress"), "|", Now())
  SET @token = Base64Encode(@payload)
]%%
<a href="https://example.org/claim?t=%%=v(@token)=%%">Claim your offer</a>
```

Base64 is an encoding, not a secret: anyone can reverse it. Sign or encrypt anything that must not be tampered with.

## Return value

**`string`** — the Base64 form of the input, padded with `=` to a multiple of four characters.

There is no closed set of sentinel values to test for: every accepted input produces an encoded string, and every rejected one aborts the page instead of returning an error token.

## Behaviour

**The output is standard Base64, verified against an independent implementation.** `Base64Encode("SFMC AMPscript 2026")` gave `U0ZNQyBBTVBzY3JpcHQgMjAyNg==`, 28 characters measured on the page, character for character the same value the same string produces outside Marketing Cloud.

**All three padding shapes come out right.** A three-byte input needs no padding (`Man` → `TWFu`), a two-byte input takes one `=` (`Ma` → `TWE=`), and a one-byte input takes two (`M` → `TQ==`).

**The bytes encoded are the UTF-8 form of the input.** A string containing `é` and `€` gave `Y2Fmw6nigqw=`, the encoding of its UTF-8 bytes, not of the UTF-16 form the engine holds internally. This is the detail that decides whether a value survives a round trip through a partner system.

**The empty string is encoded, not refused.** It returns the empty string, at HTTP 200.

### The encoding argument accepts more than is documented

Six names were accepted and each changed the output to the Base64 of exactly those bytes: `UTF-8`, `UTF-16` (little-endian), `UTF-16BE`, `UTF-32`, `ASCII` and `ISO-8859-1`. The same non-ASCII input gave `YwBhAGYA6QCsIA==` under `UTF-16` and `AGMAYQBmAOkgrA==` under `UTF-16BE` — a domain identical to the one the [hash family](/engagement/ampscript/functions/sha256/) accepts.

`ASCII` and `ISO-8859-1` are lossy and silent about it: they replace every character they cannot represent with a question mark before encoding, giving `Y2FmPz8=` and `Y2Fm6T8=` respectively. Nothing warns you.

An unrecognised name is rejected outright — `banana` aborted the page with HTTP 422 rather than falling back to the default, and so did an empty encoding name.

{% include test-script.html bundle="ampscript-functions--base64encode" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="When a case involves non-ASCII characters, print the input string alongside the encoded value. A mangled test string produces a perfectly valid encoding of the wrong bytes, which is indistinguishable from a function defect unless the input is visible in the same output." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Base64Decode](/engagement/ampscript/functions/base64decode/) — the inverse; the pair round-trips exactly
- [StringToHex](/engagement/ampscript/functions/stringtohex/) — the same bytes in hexadecimal instead
- [Encoding names are wider than documented](/engagement/differs-from-docs/#base64encode-wider-encoding-domain)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-base64-encode.html) · [ampscript.guide](https://ampscript.guide/base64encode/)
