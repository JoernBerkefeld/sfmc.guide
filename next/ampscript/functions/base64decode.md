---
layout: page
title: "AMPscript Base64Decode (Next)"
description: "Decode a Base64 string with AMPscript Base64Decode in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the missing-padding case where Next and Engagement part ways."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/base64decode/
platforms:
  - next
syntax: "Base64Decode(encodedString[, encoding, abortOnFailure])"
return_type: string
min_args: 1
max_args: 3
verification: verified
differs_from_docs: false
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement aborts the page with HTTP 422 for `Base64Decode(\"SGVsbG8\")`, a value that only lacks its `=` padding; Next decodes it to `Hello`. Well-formed input, the `UTF-16` encoding, the abort flag and other malformed values such as `not!base64###` behave alike on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `encodedString` | string | Yes | Base64 to decode; a value missing its `=` padding is still decoded, other malformed input makes the render fail |
| `encoding` | string | No | Name of the character encoding the decoded bytes are read as; defaults to UTF-8 |
| `abortOnFailure` | string \| boolean \| number | No | Truthy makes the render fail when the value cannot be decoded, falsy returns an empty string instead; only a failed decode is affected. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

## Example

```ampscript
%%=Base64Decode("U0ZNQyBBTVBzY3JpcHQgMjAyNg==")=%%
```

Renders `SFMC AMPscript 2026`.

Paired with [Base64Encode](/next/ampscript/functions/base64encode/), the value comes back unchanged:

```ampscript
%%=Base64Decode(Base64Encode("SFMC AMPscript 2026"))=%%
```

Renders `SFMC AMPscript 2026`.

## Return value

**`string`** — the decoded text, read from the decoded bytes in the requested encoding.

There is no error token to test for: a value that cannot be decoded either makes the render fail or, with a falsy third argument, returns an empty string.

## Behaviour

**Standard Base64 decodes as expected.** `Base64Decode("SGVsbG8=")` gives `Hello`, and the empty string gives the empty string.

**The round trip is exact, non-ASCII included.** `Base64Decode(Base64Encode("café€"))` returns `café€`.

**The bytes are read as UTF-8 unless you name another encoding.** Passing `"UTF-8"` explicitly gives the same result as leaving it out. A payload that holds UTF-16 bytes decodes correctly with `"UTF-16"`; without it, the output carries a NUL character after every letter.

**The third argument only matters when decoding fails.** All eight literals `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"` and `"0"` are accepted, and a valid value decodes to the same text whichever one you pass. For malformed input, `Base64Decode("not!base64###", "UTF-8", 0)` returns an empty string, while the same call with `1` makes the render fail.

**Missing padding is tolerated.** `Base64Decode("SGVsbG8")`, the Base64 of `Hello` without its trailing `=`, renders `Hello`.

**Other malformed input breaks the render.** An email containing `Base64Decode("not!base64###")` or `Base64Decode("SGVsbG8=====")` saves, but its preview fails. Check values from outside sources before decoding them, or pass a falsy third argument.

**Wrong argument counts are refused at save.** An email with `Base64Decode()` or with four arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--base64decode" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--base64decode" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [`Base64Decode` in Marketing Cloud Engagement](/engagement/ampscript/functions/base64decode/) — how it behaves there
- [Base64Encode](/next/ampscript/functions/base64encode/) — the inverse
- [StringToHex](/next/ampscript/functions/stringtohex/) — the same bytes as hexadecimal
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-base64-decode.html)
