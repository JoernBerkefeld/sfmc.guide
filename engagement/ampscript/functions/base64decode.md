---
layout: page
title: "Base64Decode"
description: "Decodes a Base64-encoded string. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that malformed input aborts the whole page with HTTP 422 rather than returning an empty value."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/base64decode/
platforms:
  - engagement
syntax: "Base64Decode(encodedString[, encoding, abortOnFailure])"
return_type: string
min_args: 1
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `encodedString` | string | Yes | Well-formed Base64 to decode; anything else aborts the page |
| `encoding` | string | No | Name of the character encoding the decoded bytes are read as; defaults to UTF-8 |
| `abortOnFailure` | number \| boolean | No | Send-time failure flag; accepted in every spelling and without effect on a successful decode |

## Example

```html
%%[
  VAR @decoded
  SET @decoded = Base64Decode("U0ZNQyBBTVBzY3JpcHQgMjAyNg==")
]%%
%%=v(@decoded)=%%
```

Renders `SFMC AMPscript 2026`.

Reading a Base64 value out of a link is the common case, and it is the case that needs guarding, because a visitor can put anything in a query string:

```html
%%[
  VAR @raw, @plain
  SET @raw = RequestParameter("t")
  IF Not Empty(@raw) AND Mod(Length(@raw), 4) == 0 THEN
    SET @plain = Base64Decode(@raw)
  ENDIF
]%%
%%=v(@plain)=%%
```

A malformed value takes the entire page down rather than returning empty — see below.

## Return value

**`string`** — the decoded text, read from the decoded bytes using the requested encoding.

There is no closed set of sentinel values to test for. In particular there is no error token: a value that cannot be decoded aborts the page instead of returning one.

## Behaviour

**The pair round-trips exactly, in both alphabets.** `Base64Decode(Base64Encode(x))` returned the original string unchanged for a plain ASCII value, and for a value containing `é` and `€` the returned characters were compared by code point against the input — 99, 97, 102, 233, 8364 in and the same out. Nothing is lost in either direction.

**The decoded bytes are read as UTF-8 by default.** Decoding a UTF-16 payload without naming its encoding returns text with a NUL between every character, which renders as `S F M C   A M P s c r i p t   2 0 2 6`. Passing `UTF-16` for that same payload returns it correctly, so the second argument is a real character-encoding name and not a formality.

**The third argument does not change the value.** All four spellings — `0`, `1`, `true`, `false` — were accepted and every one returned the identical decoded string. Its documented effect concerns aborting a send, which a CloudPage cannot exercise.

**The empty string decodes to the empty string.** It is the one malformed-looking input that is accepted rather than rejected.

### Malformed Base64 aborts the page

There is no lenient path. Three separate malformed shapes each returned HTTP 422 with nothing rendered at all — not an empty string, not a partial result, not garbage:

| Call | Result |
|---|---|
| `Base64Decode("not!base64###")` | HTTP 422, page discarded |
| `Base64Decode("SGVsbG8")` | HTTP 422, page discarded |
| `Base64Decode("SGVsbG8=====")` | HTTP 422, page discarded |

The middle case is the one that bites: that is the correct payload for `Hello` with its single `=` stripped, so a value that merely lost its padding in transit is fatal. Since AMPscript has no `try`/`catch`, validate any externally supplied value — at minimum a non-empty check and a length divisible by four — before it reaches this function.

{% include test-script.html bundle="ampscript-functions--base64decode" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Echo the input, not just the result" content="When a case involves non-ASCII characters, print the input string alongside the decoded value. A mangled test string decodes perfectly into the wrong characters, which is indistinguishable from a function defect unless the input is visible in the same output." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Base64Encode](/engagement/ampscript/functions/base64encode/) — the inverse; the pair round-trips exactly
- [StringToHex](/engagement/ampscript/functions/stringtohex/) — a reversible encoding whose malformed inputs cannot arise the same way
- [Malformed input aborts the page](/engagement/differs-from-docs/#base64decode-malformed-input-aborts)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-base64-decode.html) · [ampscript.guide](https://ampscript.guide/base64decode/)
