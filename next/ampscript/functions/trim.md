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
engagement_note: "Engagement strips the non-breaking space; Next leaves `Char(160)` in place. For `Trim(\"  a  b  \")` Engagement gives `a  b` (length 4) and the Next test email gave `a b` (length 3), but the double spaces in the literal may have been collapsed before AMPscript ran, so this is not proven to be Trim's doing. Engagement also accepts numbers (`Trim(12345)` gives `12345`) and returns an empty string for a boolean, while in Next both make the email preview fail."
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
%%=Trim("  hello  ")=%%
```

Renders `hello`.

A numeric value trims fine when it is quoted:

```ampscript
%%=Trim("  42  ")=%%
```

Renders `42`.

## Return value

**`string`** — the value with whitespace removed from both ends.

The result is free text, so there is no fixed set of special values to test for.

## Behaviour

**Leading and trailing spaces go.** `Trim("  hi there  ")` gives `hi there`, and `Trim("noPad")` comes back unchanged.

**Runs of inner spaces came back as one.** In the test email, `Trim("  a  b  ")` gave `a b`, and `Length` of that result was `3`, so the result held a single inner space. Runs of spaces in a literal may be collapsed before AMPscript runs: in other Next test emails `ProperCase` lost a leading space and `IsNullDefault` on three spaces gave one. The cause was not isolated, so do not rely on inner spacing surviving.

**Empty and all-space values give an empty string.** `Trim("")` and `Trim("     ")` render nothing, and `Length(Trim("     "))` is `0`.

**Tab, line feed and carriage return count as whitespace.** A single letter padded with `Char(9)`, `Char(10)`, `Char(13)`, or a mix of them and spaces, measures `Length` `1` after trimming.

**The non-breaking space is not stripped.** `Length(Trim(Concat(Char(160), "x", Char(160))))` is `3`: both `Char(160)` characters survive. Remove them first with [`Replace`](/next/ampscript/functions/replace/) if your data contains them.

**Non-ASCII text inside the value is kept.** Trimming `Concat("  ", Char(233), Char(224), Char(252), "  ")` gives `éàü` with `Length` `3`.

**Dates are written in ISO form.** `Trim(Now())` gives a value like `2026-11-22T21:03:22`.

**Numbers and booleans break the render.** The email saves, but the preview fails for `Trim(12345)` and `Trim(true)`.

**One argument only.** `Trim()` and `Trim("  a  ", "  b  ")` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--trim" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--trim" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The non-breaking space survives.** The reference says whitespace is removed from both ends; in Next `Char(160)` at either end is kept. [Card](/next/differs-from-docs/#trim-keeps-non-breaking-space)
- **Numbers and booleans break the render.** The reference does not rule them out, but `Trim(12345)` and `Trim(true)` made the Next preview fail. [Card](/next/differs-from-docs/#trim-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Trim` in Marketing Cloud Engagement](/engagement/ampscript/functions/trim/) — how it behaves there
- [`Length`](/next/ampscript/functions/length/) — check whether a trim removed anything
- [`Replace`](/next/ampscript/functions/replace/) — remove characters Trim keeps, such as the non-breaking space
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-trim.html)
