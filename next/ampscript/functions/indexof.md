---
layout: page
title: "AMPscript IndexOf (Next)"
description: "Find the 1-based position of a substring with AMPscript IndexOf in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the third argument Next rejects."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/indexof/
platforms:
  - next
syntax: "IndexOf(sourceString, substring)"
return_type: number
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts a third argument that picks the occurrence (`IndexOf(\"Hello World\",\"o\",2)` gives `8`); Next rejects any third argument at save. An empty substring gives `0` in Engagement but `1` in Next, and a number or boolean argument, which Engagement searches as text, makes the Next preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to search in |
| `substring` | string | Yes | Substring to find |

Exactly two arguments. Pass text: a number or boolean in either position makes the email fail to render.

## Example

```ampscript
%%=IndexOf("Hello World", "World")=%%
```

Renders `7`.

The search ignores letter case:

```ampscript
%%=IndexOf("Hello World", "WORLD")=%%
```

Also renders `7`.

## Return value

**`number`** — the 1-based position where the substring starts.

`0` means the substring was not found, or the source string is empty. Note that an empty substring in a non-empty source gives `1`, not `0`.

## Behaviour

**Positions start at 1.** In `Hello World`, `H` is at `1` and the final `d` at `11`. A substring equal to the whole source gives `1`.

**The match ignores case.** `"WORLD"`, `"world"` and `"World"` all give `7` in `Hello World`, and `"h"` gives `1`.

**Only the first match counts.** `IndexOf("banana", "na")` gives `3`, although `na` occurs again at `5`.

**Not found gives `0`.** `IndexOf("Hello World", "zzz")` and a substring longer than the source (`IndexOf("ab", "abcdef")`) both give `0`.

**Empty values.** An empty source gives `0` (`IndexOf("", "a")` and `IndexOf("", "")`), but an empty substring in a non-empty source gives `1` (`IndexOf("Hello", "")`). Check for an empty substring yourself if `1` would be read as a match.

**Positions count UTF-16 code units, like [`Length`](/next/ampscript/functions/length/).** In `Concat("caf", Char(233), " time")`, which measures `9`, the `é` is at `4` and `time` at `6`.

**There is no third argument.** Every email with a third argument was rejected at save with HTTP 400 "The AMPscript syntax isn't valid": `1`, `2`, `3`, `0`, `-1`, `-9`, the string `"2"`, a decimal, a boolean and `"abc"`. To find a later occurrence, search the rest of the string after the first match with [`Substring`](/next/ampscript/functions/substring/).

**Numbers and booleans break the preview.** `IndexOf(9876543, "65")`, `IndexOf("a1b2c3", 2)`, `IndexOf(true, "ru")` and `IndexOf("is true here", true)` each save, but the email does not render (HTTP 500).

**Too few or too many arguments cannot be saved.** `IndexOf()`, `IndexOf("Hello World")` and a four-argument call are rejected at save.

{% include test-script.html bundle="next-ampscript-functions--indexof" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--indexof" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Matching ignores case.** The reference does not say whether case matters. In Next, `IndexOf("Hello World", "WORLD")` gives `7` and `IndexOf("Hello World", "h")` gives `1`. [Card](/next/differs-from-docs/#indexof-ignores-case)
- **An empty search value counts as found.** The reference does not cover it; Next returns `1` for `IndexOf("Hello", "")`. [Card](/next/differs-from-docs/#indexof-empty-substring)
- **Numbers and booleans break the render.** The reference does not rule them out, but `IndexOf(9876543, "65")` and `IndexOf("a1b2c3", 2)` made the Next preview fail with HTTP 500. [Card](/next/differs-from-docs/#indexof-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Length`](/next/ampscript/functions/length/) — the counting unit the returned positions use
- [`Substring`](/next/ampscript/functions/substring/) — cut the text at the position you found
- [`Concat`](/next/ampscript/functions/concat/) — builds the strings you search
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-index-of.html)
