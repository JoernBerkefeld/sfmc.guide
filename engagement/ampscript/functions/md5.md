---
layout: page
title: "MD5"
description: "Returns the MD5 hash of the input value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the bytes hashed are the UTF-8 encoding of the input, and that the encoding argument accepts far more names than either reference lists."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/md5/
platforms:
  - engagement
syntax: "MD5(stringToConvert[, charSet])"
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
  SET @digest = MD5("Hash probe 2026")
]%%
%%=v(@digest)=%%
```

Renders `2bfdbd320b3b56c0d8c4be16462a96b7`.

The usual reason to reach for a hash is a stable, non-reversible key for a value you do not want to put in a URL:

```html
%%[
  VAR @email, @token
  SET @email = "reader@example.org"
  SET @token = MD5(Lowercase(Trim(@email)))
]%%
<a href="https://example.org/prefs?id=%%=v(@token)=%%">Manage preferences</a>
```

Normalise before hashing, as above — a digest of a differently-cased or space-padded value is a different digest entirely.

## Return value

**`string`** — 32 lowercase hexadecimal characters with no separators, measured with `Length()` on the page rather than assumed.

There is no closed set of sentinel values to test for: every input that is accepted produces a digest, and every input that is rejected aborts the page instead of returning an error token.

## Behaviour

**The digest is the real MD5 of the input, not a look-alike.** Every value on this page was compared character for character against the same digest computed independently outside Marketing Cloud, over the same bytes. `MD5("Hash probe 2026")` gave `2bfdbd320b3b56c0d8c4be16462a96b7`, and the official reference's own example value reproduced exactly.

**The bytes hashed are the UTF-8 encoding of the input.** That cannot be seen with an ASCII string, because ASCII text has only one plausible encoding. Hashing a string containing `ß`, `€` and `ä` gave `45e83c6ea8202aae452acf5f61f0d660`, which is the digest of its UTF-8 bytes and not of the UTF-16 form the engine uses internally.

**The second argument genuinely changes the value.** The same input under `UTF-16` gave `75300cf3b34da08a0cfd6958b26e1bae` — a completely different digest, and the one you get from UTF-16 little-endian bytes. Encoding names are matched without regard to case: `utf-8` and `utf-16` behaved identically to their upper-case spellings.

**The empty string is hashed, not refused.** `MD5("")` returned `d41d8cd98f00b204e9800998ecf8427e`, the well-known digest of zero bytes.

**A number is accepted and hashed as its decimal text.** `MD5(2026)` gave `c92a10324374fac681719d63979d00fe`, which is the digest of the four characters `2026`.

### The encoding argument is stricter than it looks

`ASCII` is accepted, and it silently replaces every character it cannot represent with a question mark before hashing. The non-ASCII string above came back as `1a7a47e1752ce663f442793ac4b38476` — the digest of `Grus? ??`. Nothing warns you; the value is simply wrong for the input you passed.

An unrecognised name is not tolerated at all. `banana`, the dashless spelling `UTF8`, an empty string, and a number in that position each aborted the page with HTTP 422 rather than falling back to the default.

{% include test-script.html bundle="ampscript-functions--md5" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="When a case involves non-ASCII characters, print the input string alongside the digest. A mangled test string produces a perfectly valid digest of the wrong bytes, which is indistinguishable from a function defect unless the input is visible in the same output." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [SHA1](/engagement/ampscript/functions/sha1/) · [SHA256](/engagement/ampscript/functions/sha256/) · [SHA512](/engagement/ampscript/functions/sha512/) — the same signature, longer digests
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-md5.html) · [ampscript.guide](https://ampscript.guide/md5/)
