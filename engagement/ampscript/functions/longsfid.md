---
layout: page
title: "LongSFID"
description: "Converts a 15-character case-sensitive Salesforce ID to the 18-character case-insensitive version. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that a non-15-character input is passed straight through unchanged instead of being validated."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/longsfid/
platforms:
  - engagement
syntax: "LongSFID(sfid15)"
return_type: string
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sfid15` | string | Yes | 15-character case-sensitive Salesforce record ID |

## Example

```ampscript
%%[
  VAR @longId
  SET @longId = LongSFID("0036000000QKv5T")
]%%
Long ID: %%=v(@longId)=%%
```

Renders `Long ID: 0036000000QKv5TAAT`.

Marketing Cloud cannot store a raw 15-character Salesforce ID in a data extension, so convert it before writing or matching on it — for example when an ID arrives on a landing-page query string:

```ampscript
%%[
  VAR @longId
  SET @longId = LongSFID(RequestParameter("id"))
]%%
```

## Return value

**`string`** — the 18-character case-insensitive Salesforce ID for a valid 15-character input.

There is no closed set of sentinel values: the result is the input ID with a computed 3-character checksum appended. For any input that is not exactly 15 characters the return is the input itself, unchanged (see below).

## Behaviour

**A valid 15-character ID gains a 3-character checksum.** `LongSFID("0036000000QKv5T")` gives `0036000000QKv5TAAT`, `LongSFID("00Q6F00001APnym")` gives `00Q6F00001APnymUAD`, and `LongSFID("001500000ABCDEF")` gives `001500000ABCDEFAQ5`. The result is always 18 characters long.

### A non-15-character input is passed through unchanged

{% include callout.html type="info" title="The docs are silent on this" content="Neither reference says what happens for anything other than a 15-character ID. In practice the function does not validate the length — it appends the checksum only to a genuine 15-character ID and otherwise returns the argument untouched, with no error." %}

| Call | Renders | Length |
|---|---|---|
| `LongSFID("0036000000QKv5TAAT")` | `0036000000QKv5TAAT` | 18 |
| `LongSFID("ABC")` | `ABC` | 3 |
| `LongSFID("")` | *(empty)* | 0 |

An already-18-character ID is returned as-is rather than transformed a second time, a too-short value comes back unchanged, and an empty string stays empty. Do not rely on the result being 18 characters, and guard the input length yourself if an invalid ID must be rejected. The finding is catalogued on [Differs from official docs](/engagement/differs-from-docs/#longsfid-non-15-char-passthrough).

{% include test-script.html bundle="ampscript-functions--longsfid" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#longsfid-non-15-char-passthrough) — the silent pass-through finding in full
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-long-sfid.html) · [ampscript.guide](https://ampscript.guide/longsfid/)
