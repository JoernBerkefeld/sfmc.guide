---
layout: page
title: "AMPscript Trim (Next)"
description: "Strip leading and trailing whitespace with AMPscript Trim in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/trim/
platforms:
  - next
syntax: "Trim(sourceString)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement strips the non-breaking space; Next leaves `Char(160)` in place. Engagement also accepts numbers (`Trim(12345)` gives `12345`) and returns an empty string for a boolean, while in Next both make the email preview fail. Spaces are handled the same: both keep runs of inner spaces (`a  b`, length 4) and strip leading and trailing runs. In a Next email, write runs of spaces with `Char(32)`, because the render collapses runs typed into the email before AMPscript runs."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| date | Yes | Value to trim |

Exactly one argument. A number or boolean literal breaks the render; quote numeric values.

## Example

```ampscript
%%=Trim(Concat(Char(32), Char(32), "hello", Char(32), Char(32)))=%%
```

Renders `hello`.

A number written as text trims fine:

```ampscript
%%=Trim(Concat(Char(32), Char(32), "42", Char(32), Char(32)))=%%
```

Renders `42`.

## Return value

**`string`** — the value with whitespace removed from both ends.

The result is free text, so there is no fixed set of special values to test for.

## Behaviour

**Write runs of spaces with `Char(32)`.** The Next render collapses a run of spaces typed into the email to one space before AMPscript runs: `Length("a  b")` gives `3`, while `Length(Concat("a", Char(32), Char(32), "b"))` gives `4`. Build padding or inner runs with `Char(32)` when the exact spacing matters.

**Leading and trailing spaces go.** `Trim(Concat(Char(32), Char(32), "hi there", Char(32), Char(32)))` gives `hi there`, and `Trim("noPad")` comes back unchanged.

**Runs of inner spaces are kept.** Two spaces, `a`, two spaces, `b`, two spaces, all built with `Char(32)`, trim to `a  b` with `Length` `4`, as on Engagement.

**Empty and all-space values give an empty string.** `Trim("")` renders nothing, and so does five `Char(32)` in a row; `Length` of that trimmed value is `0`.

**Tab, line feed and carriage return count as whitespace.** A single letter padded with `Char(9)`, `Char(10)`, `Char(13)`, or a mix of them and spaces, measures `Length` `1` after trimming.

**The non-breaking space is not stripped.** `Length(Trim(Concat(Char(160), "x", Char(160))))` is `3`: both `Char(160)` characters survive. Remove them first with [`Replace`](/next/ampscript/functions/replace/) if your data contains them.

**Non-ASCII text inside the value is kept.** Trimming `éàü` padded with two `Char(32)` on each side gives `éàü` with `Length` `3`.

**Dates are written in ISO form.** `Trim(Now())` gives a value like `2026-11-22T21:03:22`.

**Numbers and booleans break the render.** The email saves, but the preview fails for `Trim(12345)` and `Trim(true)`.

**One argument only.** `Trim()` and a call with two arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--trim" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--trim" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The non-breaking space survives.** The reference says whitespace is removed from both ends; in Next `Char(160)` at either end is kept. [Card](/next/differs-from-docs/#trim-keeps-non-breaking-space)
- **Numbers and booleans break the render.** The reference does not rule them out, but `Trim(12345)` and `Trim(true)` made the Next preview fail. [Card](/next/differs-from-docs/#trim-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Length`](/next/ampscript/functions/length/) — check whether a trim removed anything
- [`Replace`](/next/ampscript/functions/replace/) — remove characters Trim keeps, such as the non-breaking space
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-trim.html)
