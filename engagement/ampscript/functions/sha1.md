---
layout: page
title: "SHA1"
description: "Returns the SHA-1 hash of the input value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the bytes hashed are the UTF-8 encoding of the input, and that an unrecognised encoding name aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/sha1/
platforms:
  - engagement
syntax: "SHA1(stringToConvert[, charSet])"
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
| `stringToConvert` | string \| number \| date | Yes | The value to hash; a number or date is hashed as the text it renders as |
| `charSet` | string | No | Name of the character encoding applied before hashing; defaults to UTF-8 |

## Example

```html
%%[
  VAR @digest
  SET @digest = SHA1("Hash probe 2026")
]%%
%%=v(@digest)=%%
```

Renders `20903bc0c930c22be005bfb1ede7db6722452ee7`.

A typical use is a checksum over a value you send elsewhere and want to compare later:

```html
%%[
  VAR @payload, @check
  SET @payload = Concat("order-4417", "|", "reader@example.org")
  SET @check = SHA1(@payload)
]%%
<p>Reference %%=Substring(@check, 1, 10)=%%</p>
```

Build the string you hash explicitly, as above — the digest changes with every separator and every space.

## Return value

**`string`** — 40 lowercase hexadecimal characters with no separators, measured with `Length()` on the page rather than assumed.

There is no closed set of sentinel values to test for: every accepted input produces a digest, and every rejected one aborts the page instead of returning an error token.

## Behaviour

**The digest is the real SHA-1 of the input.** Every value here was compared character for character against the same digest computed independently outside Marketing Cloud, over the same bytes. `SHA1("Hash probe 2026")` gave `20903bc0c930c22be005bfb1ede7db6722452ee7`, and the official reference's own example value reproduced exactly.

**The bytes hashed are the UTF-8 encoding of the input.** Hashing a string containing `ß`, `€` and `ä` gave `57418a4484a6e50107c9c73d57333982344f4ebd`, the digest of its UTF-8 bytes rather than of the UTF-16 form the engine holds internally. An ASCII-only test can never establish this, because ASCII text has only one plausible encoding.

**The second argument genuinely changes the value.** The same input under `UTF-16` gave `12ebd4a9b721eda440d263131f1e29fad920fede`, which is what UTF-16 little-endian bytes produce.

**The empty string is hashed, not refused.** `SHA1("")` returned `da39a3ee5e6b4b0d3255bfef95601890afd80709`, the well-known digest of zero bytes.

### The encoding argument is stricter than it looks

`ASCII` is accepted and silently replaces every character it cannot represent with a question mark before hashing: the non-ASCII string above came back as `601fc90e786918f662cece34acf5cdb0b1f8fade`, the digest of `Grus? ??`. Nothing warns you.

An unrecognised name is rejected outright — passing `banana` aborted the page with HTTP 422 rather than falling back to the default.

{% include test-script.html bundle="ampscript-functions--sha1" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="When a case involves non-ASCII characters, print the input string alongside the digest. A mangled test string produces a perfectly valid digest of the wrong bytes, which is indistinguishable from a function defect unless the input is visible in the same output." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [MD5](/engagement/ampscript/functions/md5/) · [SHA256](/engagement/ampscript/functions/sha256/) · [SHA512](/engagement/ampscript/functions/sha512/) — the same signature, different digest lengths
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-sha1.html) · [ampscript.guide](https://ampscript.guide/sha1/)
