---
layout: page
title: "AMPscript Base64Encode (Next)"
description: "Encode a value as Base64 with AMPscript Base64Encode in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including which encoding names Next accepts."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/base64encode/
platforms:
  - next
syntax: "Base64Encode(value[, encoding])"
return_type: string
min_args: 1
max_args: 2
verification: verified
differs_from_docs: false
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement also accepts the encoding names `UTF-16BE` (giving `AGMAYQBmAOkgrA==` for `café€`) and `ISO-8859-1` (giving `Y2Fm6T8=`); Next rejects an email with either name at save. The default UTF-8, `UTF-16`, `UTF-32` and `ASCII` give the same output on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string | Yes | The value to encode; the empty string encodes to the empty string |
| `encoding` | string | No | Name of the character encoding applied before encoding; defaults to UTF-8. Next accepts `UTF-8`, `UTF-16`, `UTF-32` and `ASCII`; other names are rejected at save |

## Example

```ampscript
%%=Base64Encode("SFMC AMPscript 2026")=%%
```

Renders `U0ZNQyBBTVBzY3JpcHQgMjAyNg==`.

## Return value

**`string`** — the Base64 form of the input, padded with `=` to a multiple of four characters.

There is no error token to test for: every accepted call returns an encoded string.

## Behaviour

**The output is standard Base64.** `Base64Encode("Hello")` gives `SGVsbG8=`, and `Length(Base64Encode("SFMC AMPscript 2026"))` gives `28`.

**Padding comes out right for every length.** `Man` gives `TWFu` with no padding, `Ma` gives `TWE=`, and `M` gives `TQ==`.

**UTF-8 bytes are encoded by default.** `Base64Encode("café€")` gives `Y2Fmw6nigqw=`, and naming `"UTF-8"` gives the same.

**Four encoding names work.** For the same `café€` input:

| Call | Renders |
|---|---|
| `Base64Encode("café€", "UTF-16")` | `YwBhAGYA6QCsIA==` |
| `Base64Encode("café€", "UTF-32")` | `YwAAAGEAAABmAAAA6QAAAKwgAAA=` |
| `Base64Encode("café€", "ASCII")` | `Y2FmPz8=` |

`UTF-16` and `UTF-32` are little-endian. `ASCII` replaces `é` and `€` with question marks before encoding, without any warning.

**Other encoding names are refused at save.** An email containing `UTF-16BE`, `ISO-8859-1`, `banana` or an empty string as the encoding cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**The empty string encodes to the empty string.**

**Wrong argument counts are refused at save.** `Base64Encode()` and a call with three arguments are rejected the same way.

{% include test-script.html bundle="next-ampscript-functions--base64encode" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--base64encode" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [Base64Decode](/next/ampscript/functions/base64decode/) — the inverse
- [StringToHex](/next/ampscript/functions/stringtohex/) — the same bytes as hexadecimal
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-base64-encode.html)
