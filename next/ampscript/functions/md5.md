---
layout: page
title: "AMPscript MD5 (Next)"
description: "Hash a value with AMPscript MD5 in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including which character sets Next accepts and how dates are hashed."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/md5/
platforms:
  - next
syntax: "MD5(stringToConvert[, charSet])"
return_type: string
min_args: 1
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement also accepts `ASCII` as the character set (`MD5(\"Grusß €ä\", \"ASCII\")` gives `1a7a47e1752ce663f442793ac4b38476`, the digest of `Grus? ??`) and further names such as `UTF-16BE`, `UTF-32` and `ISO-8859-1`; Next rejects an email with any of them at save. Digests for UTF-8, `UTF-16`, numbers and dates are identical on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `stringToConvert` | string \| number \| date | Yes | The value to hash; a number or date is hashed as text |
| `charSet` | string | No | Name of the character encoding applied before hashing; defaults to UTF-8. Next accepts only `UTF-8` and `UTF-16`, in any letter case; other names are rejected at save |

## Example

```ampscript
%%=MD5("abc")=%%
```

Renders `900150983cd24fb0d6963f7d28e17f72`.

## Return value

**`string`** — 32 lowercase hexadecimal characters with no separators.

There is no error token to test for: every accepted call returns a digest.

## Behaviour

**The digest is standard MD5.** `MD5("abc")` gives `900150983cd24fb0d6963f7d28e17f72`, and `Length(MD5("SFMC-Probe-2026"))` gives `32`.

**The empty string is hashed.** `MD5("")` gives `d41d8cd98f00b204e9800998ecf8427e`, the digest of zero bytes.

**UTF-8 bytes are hashed by default.** `MD5("Grusß €ä")` gives `45e83c6ea8202aae452acf5f61f0d660`, and naming `"UTF-8"` (or `"utf-8"`) gives the same digest as leaving it out.

**`UTF-16` changes the digest.** `MD5("Grusß €ä", "UTF-16")` gives `75300cf3b34da08a0cfd6958b26e1bae`; the lowercase spelling `"utf-16"` behaves the same.

**Numbers are hashed as their digits.** `MD5(12345)` gives `827ccb0eea8a706c4c34a16891f84e7b` and `MD5(2026)` gives `c92a10324374fac681719d63979d00fe`.

**Dates are hashed in `M/d/yyyy h:mm:ss AM` form.** `MD5(StringToDate("2026-03-04T09:05:07"))` gives `f78066a00e33be48d6f2f9914f6b6066`, exactly the digest of the text `3/4/2026 9:05:07 AM`. This holds even though Next writes the same kind of date as `2026-11-22T22:41:45` when you output it with [Concat](/next/ampscript/functions/concat/), so hashing a date and hashing its printed form give different digests.

**Only two character sets are accepted.** An email that passes `UTF-16BE`, `UTF-32`, `ASCII`, `ISO-8859-1`, the dashless `UTF8`, `banana`, an empty string, a number or a boolean as the second argument cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**Wrong argument counts are refused at save.** `MD5()` and a call with three arguments are rejected the same way.

{% include test-script.html bundle="next-ampscript-functions--md5" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--md5" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Available in Next.** The official reference marks MD5 as not available in Marketing Cloud Next. It saved and rendered correctly in a Next email (see the examples above). [Details](/next/differs-from-docs/#md5-available-in-next)

{% include platform-compare.html %}

## See also

- [`MD5` in Marketing Cloud Engagement](/engagement/ampscript/functions/md5/) — how it behaves there
- [SHA1](/next/ampscript/functions/sha1/)
- [SHA256](/next/ampscript/functions/sha256/)
- [SHA512](/next/ampscript/functions/sha512/) — the same signature, longer digests
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-md5.html)
