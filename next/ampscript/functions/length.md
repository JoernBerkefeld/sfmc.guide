---
layout: page
title: "AMPscript Length (Next)"
description: "Measure a string with AMPscript Length in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the UTF-16 counting unit and the number argument that fails there."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/length/
platforms:
  - next
syntax: "Length(sourceString)"
return_type: number
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Text and dates measure the same on both, in UTF-16 code units (an emoji counts as `2`). Engagement measures a number by its text (`Length(12345)` gives `5`) and returns `0` for a boolean; in Next both make the email preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| date | Yes | Value to measure |

A number or boolean argument saves but makes the email fail to render — see below.

## Example

```ampscript
%%=Length("Hello")=%%
```

Renders `5`.

An empty string measures zero:

```ampscript
%%=Length("")=%%
```

Renders `0`.

## Return value

**`number`** — the count of UTF-16 code units in the value.

Every successful call rendered a plain non-negative whole number. There is no fixed set of special values.

## Behaviour

**Plain ASCII counts one per character.** `Length("Hello World")` gives `11` and `Length("abcd")` gives `4`.

**The unit is the UTF-16 code unit.** `Length("café")` gives `4` and `Length("Straße")` gives `6`, because each of those letters is one code unit. A single emoji such as 😀 gives `2`: it is one visible character but two code units. A character limit enforced with `Length` therefore allows one character fewer for each emoji.

**Dates are measured as text.** `Length(Now())` gave `19`, the length of a value like `2026-11-23T00:21:32`.

**Numbers and booleans break the preview.** An email with `Length(12345)` or `Length(true)` saves, but rendering it fails with HTTP 500. Measure numbers as text by passing them as a string.

**No argument or two arguments cannot be saved.** `Length()` and `Length("a", "b")` are rejected at save with HTTP 400 "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--length" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--length" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The unit is the UTF-16 code unit.** The reference does not name a unit; in Next `Length("😀")` is `2`. [Card](/next/differs-from-docs/#length-counts-utf16-units)
- **Numbers and booleans break the render.** The reference does not rule them out, but `Length(12345)` and `Length(true)` made the Next preview fail with HTTP 500. [Card](/next/differs-from-docs/#length-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Concat`](/next/ampscript/functions/concat/) — builds the string you are measuring
- [`Uppercase`](/next/ampscript/functions/uppercase/) — in Next the sharp s expands when uppercased, so the length grows
- [`IndexOf`](/next/ampscript/functions/indexof/) — positions use the same counting unit
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-length.html)
