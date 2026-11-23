---
layout: page
title: "AMPscript ProperCase (Next)"
description: "Convert a value to proper (title) case with AMPscript ProperCase in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including spaces, the sharp s and booleans."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/propercase/
platforms:
  - next
syntax: "ProperCase(sourceString)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement keeps runs of spaces (`ProperCase(\"  spaced   out  \")` gives `  Spaced   Out  `), leaves a leading sharp s alone (`ßtrasse`) and returns an empty string for a boolean. In the Next email the same call gave ` Spaced Out ` (length 12), a leading `ß` became `SS` (`SStrasse`), and `ProperCase(true)` gives `True`."
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
%%=ProperCase("BARB BROWN")=%%
```

Renders `Barb Brown`.

The rest of each word is forced to lower case, so existing capitals inside a word are lost:

```ampscript
%%=ProperCase("HTML and CSS")=%%
```

Renders `Html And Css`.

## Return value

**`string`** — the value with every word starting in upper case and all its other letters in lower case.

The result is arbitrary text, so there is no fixed set of special values to test for.

## Behaviour

**Capitals inside a word are lowered.** `ProperCase("iPhone")` gives `Iphone` and `ProperCase("McDONALD")` gives `Mcdonald`. The function is safe on all-caps input and lossy on anything that already has meaningful capitals.

**Only a space starts a new word.** A letter after an apostrophe, hyphen, full stop or comma stays lower case: `ProperCase("o'neill mcdonald-smith")` gives `O'neill Mcdonald-smith` and `ProperCase("a.b,c")` gives `A.b,c`. Letters after a digit are not raised either: `ProperCase("abc3def")` gives `Abc3def`, `ProperCase("3rd street")` gives `3rd Street`.

**Runs of spaces came back as single spaces.** In the test email, `ProperCase("  spaced   out  ")` rendered ` Spaced Out ` and `Length` of the result was `12`, not `16`. The test did not show whether the function or the saved email content collapsed the spaces; do not rely on the original spacing surviving.

**Accented letters are cased like any other.** `é`, `à` and `ü` at the start of a word become `É`, `À` and `Ü`.

**A leading sharp s expands.** `ProperCase(Concat(Char(223), "trasse"))` gives `SStrasse`, so the result (`Length` `8`) is one character longer than the input.

**An empty string gives an empty string**, and a one-letter word is capitalised: `ProperCase("x")` gives `X`.

**Numbers are unchanged.** `ProperCase(12345)` gives `12345`.

**Dates are turned into text, then cased.** `ProperCase(Now())` gave a value like `2026-11-23t00:20:52`: the `T` between date and time sits inside a word, so it is lowered.

**Booleans become their word.** `ProperCase(true)` gives `True`.

**No argument or two arguments cannot be saved.** `ProperCase()` and `ProperCase("a b", "c d")` are rejected at save with HTTP 400 "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--propercase" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--propercase" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Only a space starts a word.** The reference does not define a word; in Next `ProperCase("o'neill mcdonald-smith")` gives `O'neill Mcdonald-smith`. [Card](/next/differs-from-docs/#propercase-only-spaces-start-words)
- **A leading ß becomes `SS`.** Not mentioned in the reference; the result is one character longer than the input. [Card](/next/differs-from-docs/#propercase-sharp-s-expands)

{% include platform-compare.html %}

## See also

- [`ProperCase` in Marketing Cloud Engagement](/engagement/ampscript/functions/propercase/) — how it behaves there
- [`Uppercase`](/next/ampscript/functions/uppercase/)
- [`Lowercase`](/next/ampscript/functions/lowercase/) — the whole-string conversions
- [`Trim`](/next/ampscript/functions/trim/) — remove padding before casing a field
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-propercase.html)
