---
layout: page
title: "AMPscript Uppercase (Next)"
description: "Convert a value to upper case with AMPscript Uppercase in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the German sharp s and booleans."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/uppercase/
platforms:
  - next
syntax: "Uppercase(sourceString)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement leaves the German sharp s alone (`Uppercase(\"Straße\")` gives `STRAßE`, length 6) and returns an empty string for a boolean. Next expands it to `STRASSE` (length 7) and renders `Uppercase(false)` as `FALSE`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| number \| date \| boolean | Yes | Value to convert |

## Example

```ampscript
%%=Uppercase("abc123!")=%%
```

Renders `ABC123!`.

Mixed case is raised throughout:

```ampscript
%%=Uppercase("HeLLo123!@#")=%%
```

Renders `HELLO123!@#`.

## Return value

**`string`** — the value converted to upper case.

The result is arbitrary text, so there is no fixed set of special values to test for.

## Behaviour

**Only letters change.** Digits and symbols pass through, as in `Uppercase("abc123!")` giving `ABC123!`.

**An empty string gives an empty string.**

**Accented letters get their accented capital.** `Uppercase("café")` gives `CAFÉ` and `Uppercase("àéîõü")` gives `ÀÉÎÕÜ`.

**The German sharp s expands to two letters.** `Uppercase("Straße")` gives `STRASSE`, and `Length` of the result is `7` where the input measured `6`. Allow for the longer result when the output has a size limit.

**The dotless i becomes a plain capital I.** `Uppercase("ı")` and `Uppercase("i")` both give `I`.

**Numbers are unchanged.** `Uppercase(12345)` gives `12345`.

**Dates are turned into text.** `Uppercase(Now())` gave a value like `2026-11-23T00:21:32`.

**Booleans become their word in capitals.** `Uppercase(false)` gives `FALSE`.

**No argument or two arguments cannot be saved.** `Uppercase()` and `Uppercase("a", "b")` are rejected at save with HTTP 400 "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--uppercase" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--uppercase" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **ß expands to `SS`.** The reference does not mention it; in Next `Uppercase("Straße")` gives `STRASSE`, one character longer. [Card](/next/differs-from-docs/#uppercase-sharp-s-expands)

{% include platform-compare.html %}

## See also

- [`Uppercase` in Marketing Cloud Engagement](/engagement/ampscript/functions/uppercase/) — how it behaves there
- [`Lowercase`](/next/ampscript/functions/lowercase/) — the inverse conversion
- [`ProperCase`](/next/ampscript/functions/propercase/) — capitalises the first letter of each word
- [`Length`](/next/ampscript/functions/length/) — the sharp s makes the uppercased result longer
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-uppercase.html)
