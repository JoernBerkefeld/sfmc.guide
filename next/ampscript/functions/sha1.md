---
layout: page
title: "AMPscript SHA1 (Next)"
description: "Hash a value with AMPscript SHA1 in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including which character sets Next accepts."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/sha1/
platforms:
  - next
syntax: "SHA1(stringToConvert[, charSet])"
return_type: string
min_args: 1
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts `ASCII` as the character set (`SHA1(\"Grusß €ä\", \"ASCII\")` gives `601fc90e786918f662cece34acf5cdb0b1f8fade`, the digest of `Grus? ??`); Next rejects an email with that call at save. Digests for UTF-8 and `UTF-16` are identical on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `stringToConvert` | string \| number \| date | Yes | The value to hash |
| `charSet` | string | No | Name of the character encoding applied before hashing; defaults to UTF-8. Next accepted `UTF-16`; `ASCII` and unknown names are rejected at save |

## Example

```ampscript
%%=SHA1("Hash example 2026")=%%
```

Renders `93135d2253cdf62bb977c529a47739baaa649db4`.

## Return value

**`string`** — 40 lowercase hexadecimal characters with no separators.

There is no error token to test for: every accepted call returns a digest.

## Behaviour

**The digest is standard SHA-1.** `SHA1("abc")` gives `a9993e364706816aba3e25717850c26c9cd0d89d`, and `Length(SHA1("Hash probe 2026"))` gives `40`.

**The empty string is hashed.** `SHA1("")` gives `da39a3ee5e6b4b0d3255bfef95601890afd80709`, the digest of zero bytes.

**UTF-8 bytes are hashed by default.** `SHA1("Grusß €ä")` gives `57418a4484a6e50107c9c73d57333982344f4ebd`.

**`UTF-16` changes the digest.** `SHA1("Grusß €ä", "UTF-16")` gives `94b0370f99d4327e50edf287eca69e945f3741d7`, and `SHA1("Hash probe 2026", "UTF-16")` gives `12ebd4a9b721eda440d263131f1e29fad920fede`.

**`ASCII` and unknown names are refused at save.** An email containing `SHA1("Grusß €ä", "ASCII")` or `SHA1("Hash probe 2026", "banana")` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Wrong argument counts are refused at save.** `SHA1()` and a call with three arguments are rejected the same way.

{% include test-script.html bundle="next-ampscript-functions--sha1" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--sha1" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Available in Next.** The official reference marks SHA1 as not available in Marketing Cloud Next. It saved and rendered correctly in a Next email (see the examples above). [Details](/next/differs-from-docs/#sha1-available-in-next)

{% include platform-compare.html %}

## See also

- [`SHA1` in Marketing Cloud Engagement](/engagement/ampscript/functions/sha1/) — how it behaves there
- [MD5](/next/ampscript/functions/md5/)
- [SHA256](/next/ampscript/functions/sha256/)
- [SHA512](/next/ampscript/functions/sha512/) — the same signature, different digest lengths
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-sha1.html)
