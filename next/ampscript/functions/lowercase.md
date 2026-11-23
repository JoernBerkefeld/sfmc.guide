---
layout: page
title: "AMPscript Lowercase (Next)"
description: "Convert a value to lower case with AMPscript Lowercase in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including booleans and the dotted capital I."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/lowercase/
platforms:
  - next
syntax: "Lowercase(sourceString)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement turns the dotted capital `İ` into a plain `i` and returns an empty string for a boolean. Next gives `i` followed by a combining dot above (two code units) and renders `Lowercase(true)` as `true`. A date is lowercased in each platform's own format, `2026-11-23t00:21:32` in Next."
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
%%=Lowercase("HELLO")=%%
```

Renders `hello`.

Digits and symbols pass through untouched:

```ampscript
%%=Lowercase("HeLLo123!@#")=%%
```

Renders `hello123!@#`.

## Return value

**`string`** — the value converted to lower case.

The result is arbitrary text, so there is no fixed set of special values to test for.

## Behaviour

**Only letters change.** `Lowercase("HeLLo123!@#")` gives `hello123!@#`, and `Lowercase("I")` gives `i`.

**An empty string gives an empty string.**

**Accented capitals get their accented lower-case form.** `Lowercase("CAFÉ")` gives `café` and `Lowercase("ÀÉÎÕÜ")` gives `àéîõü`.

**The dotted capital I becomes two code units.** `Lowercase("İ")` gives a plain `i` (105) followed by a combining dot above (775). It looks like one letter but measures `Length` `2`, and it does not equal a plain `i` in a comparison.

**Numbers are unchanged.** `Lowercase(12345)` gives `12345`.

**Dates are turned into text, then lowercased.** `Lowercase(Now())` gave a value like `2026-11-23t00:21:32`: the `T` between date and time comes out as a lower-case `t`.

**Booleans become their word.** `Lowercase(true)` gives `true`.

**No argument or two arguments cannot be saved.** `Lowercase()` and `Lowercase("a", "b")` are rejected at save with HTTP 400 "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--lowercase" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--lowercase" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The dotted capital I grows.** The reference does not mention it; in Next `Lowercase("İ")` gives `i` plus a combining dot, two characters long. [Card](/next/differs-from-docs/#lowercase-dotted-capital-i)

{% include platform-compare.html %}

## See also

- [`Lowercase` in Marketing Cloud Engagement](/engagement/ampscript/functions/lowercase/) — how it behaves there
- [`Uppercase`](/next/ampscript/functions/uppercase/) — the inverse conversion
- [`ProperCase`](/next/ampscript/functions/propercase/) — capitalises the first letter of each word
- [`Length`](/next/ampscript/functions/length/) — check the result's size when non-ASCII letters are involved
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-lowercase.html)
