---
layout: page
title: "AMPscript Substring (Next)"
description: "Take part of a string by position with AMPscript Substring in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/substring/
platforms:
  - next
syntax: "Substring(sourceString, startPosition[, substringLength])"
return_type: string
min_args: 2
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement clamps a start below 1 (`Substring(\"Hello World\", 0, 5)` gives `Hello`), returns an empty string for a start past the end, and accepts numeric sources and quoted numbers; in Next all of these make the email preview fail. Engagement aborts on a decimal position or length, while Next drops the fraction (`Substring(\"Hello World\", 2.5, 3)` gives `ell`)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to take a portion of |
| `startPosition` | number | Yes | 1-based position to start at, inside the source |
| `substringLength` | number | No | Number of characters to take |

Pass the source as a string and both positions as unquoted numbers. A numeric source, a quoted number or a start outside the source breaks the render.

## Example

```ampscript
%%=Substring("Hello World", 1, 5)=%%
```

Renders `Hello`.

Leave out the length to take everything from the start position on:

```ampscript
%%=Substring("Hello World", 7)=%%
```

Renders `World`.

## Return value

**`string`** — the requested portion of the source.

An empty string comes back for a length of `0` and for an empty source. Otherwise the result is free text, so there is no fixed set of special values to test for.

## Behaviour

**Positions are 1-based.** `Substring("Hello World", 1, 5)` gives `Hello`, `Substring("Hello World", 7, 3)` gives `Wor`, and `Substring("Hello World", 11, 1)` gives the final `d`.

**Without a length, the rest of the string is returned.** `Substring("Hello World", 7)` gives `World` and `Substring("Hello World", 11)` gives `d`.

**A length past the end is capped.** `Substring("Hello World", 7, 99)` gives `World`.

**A length of `0` or an empty source give an empty string.** `Substring("Hello World", 3, 0)` and `Substring("", 1, 3)` both render nothing.

**The start must lie inside the source.** The email saves, but the preview fails (HTTP 500, or no new rendered version) for a start of `0`, a negative start such as `-3`, and a start past the end: `Substring("Hello World", 20, 3)` and `Substring("Hello World", 12)` both failed. Check the position against [`Length`](/next/ampscript/functions/length/) before the call.

**A negative length breaks the render too.** `Substring("Hello World", 3, -2)` failed in the preview.

**Decimals are cut down to whole numbers.** `Substring("Hello World", 2.5, 3)` gives `ell` and `Substring("Hello World", 1, 3.7)` gives `Hel`: the fraction is dropped rather than rejected.

**Only strings as the source, only numbers as positions.** The preview failed for a numeric source (`Substring(9876543, 3, 2)`), a boolean source (`Substring(true, 1, 2)`), quoted positions (`Substring("Hello World", "7", 3)`, `Substring("Hello World", 7, "3")`, `Substring("Hello World", "1", "5")`), a boolean position and a lettered position such as `"abc"`.

**Counting matches [`Length`](/next/ampscript/functions/length/).** In a source built as `Concat("caf", Char(233), " time")`, one character taken at position `4` has a `Length` of `1`, and starting at `6` gives `time`.

**Two or three arguments.** `Substring()`, `Substring("Hello World")` and a four-argument call cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--substring" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--substring" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **A start past the end does not give an empty string.** The reference promises an empty string there; in Next `Substring("Hello World", 12)` and `Substring("Hello World", 20, 3)` made the preview fail, as did a start of `0` or below. [Card](/next/differs-from-docs/#substring-start-past-end-fails)
- **Positions as text and numeric sources break the render.** The reference does not cover them; in Next `Substring("Hello World", "7", 3)` and `Substring(9876543, 3, 2)` made the preview fail. [Card](/next/differs-from-docs/#substring-strict-argument-types)

{% include platform-compare.html %}

## See also

- [`Substring` in Marketing Cloud Engagement](/engagement/ampscript/functions/substring/) — how it behaves there
- [`IndexOf`](/next/ampscript/functions/indexof/) — finds the position to start at
- [`Length`](/next/ampscript/functions/length/) — measures the source before you cut it
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-substring.html)
