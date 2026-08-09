---
layout: page
title: "GUID"
description: "Generates a new globally unique identifier. Runtime-proven on a live Marketing Cloud Engagement CloudPage — 36 lowercase characters, hyphenated, no braces, and a different value on every call within the same render."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/guid/
platforms:
  - engagement
  - next
syntax: "GUID()"
return_type: string
min_args: 0
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

This function takes no parameters. A call with an argument aborts the surrounding block with HTTP 422 while the rest of the page still renders.

## Example

```html
%%[
  VAR @token
  SET @token = GUID()
]%%
<input type="hidden" name="token" value="%%=v(@token)=%%">
```

Renders a value such as `1f3a9c02-5e7b-4d18-9a6c-2b40e8f7d135`.

Store the result if the same identifier is needed twice — a second call returns a different value.

## Return value

**`string`** — a 36-character identifier.

The value is an open domain, so there is no set of tokens to test against. What is fixed is the shape:

| Property | Value |
|---|---|
| Length | 36 characters |
| Groups | 8, 4, 4, 4, 12 |
| Hyphen positions | 9, 14, 19, 24 |
| Hex digits | lowercase |
| Braces | none |

## Behaviour

**The format is stable across samples.** Four values produced in a single render were each 36 characters long, and slicing one of them into its five groups gave lengths of 8, 4, 4, 4 and 12 with a hyphen at each of positions 9, 14, 19 and 24.

**There are no surrounding braces.** Searching a sample for an opening or a closing brace returned 0 on the same value whose hyphen search returned 9 — so the 0 means absent, not found-at-the-start.

**The hex digits are genuinely lowercase.** The value equals its own lowercased form and does **not** equal its own uppercased form. A comparison that is merely case-insensitive would have matched both.

**Every call returns a different value.** Three assignments plus one inline call in the same render produced four distinct values, and comparing the first against the second and against the third both answered *different*. There is no per-render caching to rely on.

**No argument is accepted.** A one-argument call aborts its own block while the rest of the page continues to render, so the argument count is exactly zero.

{% include test-script.html bundle="ampscript-functions--guid" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Output](/engagement/ampscript/functions/output/) — writing a generated value into the content
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-guid.html) · [ampscript.guide](https://ampscript.guide/guid/)
