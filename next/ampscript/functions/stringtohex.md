---
layout: page
title: "AMPscript StringToHex (Next)"
description: "Convert a string to hexadecimal with AMPscript StringToHex in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including which character sets Next accepts."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/stringtohex/
platforms:
  - next
syntax: "StringToHex(sourceString[, charSet])"
return_type: string
min_args: 1
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement also accepts `UTF-16BE`, `UTF-32`, `ASCII` and `ISO-8859-1` as the character set (for `café€`, for example, `00630061006600e920ac` and `6361663f3f`); Next rejects an email with any of them at save. The default UTF-8 and `UTF-16` give the same hex on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | The string to render as hexadecimal; the empty string yields the empty string |
| `charSet` | string | No | Name of the character encoding applied before conversion; defaults to UTF-8. Next accepts only `UTF-8` and `UTF-16`; other names are rejected at save |

## Example

```ampscript
%%=StringToHex("SFMC AMPscript 2026")=%%
```

Renders `53464d4320414d507363726970742032303236`.

## Return value

**`string`** — lowercase hexadecimal digits with no separators, two per byte of the encoded input.

There is no error token to test for: every accepted call returns a hex string.

## Behaviour

**Lowercase, no separators.** `StringToHex("A")` gives `41`, and `Length(StringToHex("SFMC AMPscript 2026"))` gives `38`, two digits for each of the 19 characters.

**UTF-8 bytes by default.** `StringToHex("café€")` gives `636166c3a9e282ac`: `é` takes two bytes and `€` three. Naming `"UTF-8"` gives the same.

**`UTF-16` is little-endian.** `StringToHex("café€", "UTF-16")` gives `630061006600e900ac20`.

**No other character set is accepted.** An email that passes `UTF-16BE`, `UTF-32`, `ASCII`, `ISO-8859-1` or `banana` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**The empty string yields the empty string.**

**Wrong argument counts are refused at save.** `StringToHex()` and a call with three arguments are rejected the same way.

{% include test-script.html bundle="next-ampscript-functions--stringtohex" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--stringtohex" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Available in Next.** The official reference marks StringToHex as not available in Marketing Cloud Next. It saved and rendered correctly in a Next email (see the examples above). [Details](/next/differs-from-docs/#stringtohex-available-in-next)

{% include platform-compare.html %}

## See also

- [`StringToHex` in Marketing Cloud Engagement](/engagement/ampscript/functions/stringtohex/) — how it behaves there
- [Base64Encode](/next/ampscript/functions/base64encode/) — the same bytes in Base64
- [Base64Decode](/next/ampscript/functions/base64decode/)
- [SHA256](/next/ampscript/functions/sha256/) — hashes bytes chosen by a similar character-set argument
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-to-hex.html)
