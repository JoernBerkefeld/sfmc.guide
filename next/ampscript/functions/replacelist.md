---
layout: page
title: "AMPscript ReplaceList (Next)"
description: "Swap several search values for one replacement with AMPscript ReplaceList in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/replacelist/
platforms:
  - next
syntax: "ReplaceList(sourceString, replacementString, searchString1[, searchStringN, ...])"
return_type: string
min_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "String calls give the same results on both platforms, including the sequential passes (`ReplaceList(\"a\", \"XY\", \"a\", \"X\")` gives `XYY`). Engagement also accepts numbers in every role (`ReplaceList(101101, \"9\", \"0\")` gives `191191`) and swallows booleans, while in Next a number or boolean argument makes the email preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to search in |
| `replacementString` | string | Yes | Text every match is replaced with |
| `searchString1` | string | Yes | First value to look for |
| `searchStringN` | string | No | Any number of further values to look for |

At least three arguments, with no upper bound. Pass every argument as a string: a number or boolean literal breaks the render.

## Example

```ampscript
%%=ReplaceList("a-b/c", "_", "-", "/")=%%
```

Renders `a_b_c`.

A value that arrived with mixed delimiters can be flattened in one call:

```ampscript
%%=ReplaceList("a,b,c;d", "+", ",", ";")=%%
```

Renders `a+b+c+d`.

## Return value

**`string`** — the source with every match of every search value rewritten.

A source that none of the search values match comes back unchanged, and an empty source gives an empty string. Otherwise the result is free text, so there is no fixed set of special values to test for.

## Behaviour

**Three arguments is the minimum.** An email containing `ReplaceList()`, `ReplaceList("abc")` or `ReplaceList("abc", "z")` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

**One search value is enough, and more are fine.** `ReplaceList("Hello World", "There", "World")` gives `Hello There`. A seven-argument call swapping five digits in `a1b2c3d4e5` for `*` gives `a*b*c*d*e*`.

**Absent and repeated search values change nothing.** `ReplaceList("Hello World", "!", "zzz", "qqq")` gives `Hello World`, and `ReplaceList("aXa", "-", "a", "a")` gives `-X-`: the second `a` finds nothing left.

**Empty values are harmless.** An empty replacement deletes every match: `ReplaceList("a-b/c", "", "-", "/")` gives `abc`. An empty search value leaves `abc` unchanged, and an empty source gives an empty string.

**Numbers and booleans break the render.** The email saves, but the preview fails (HTTP 500) when an argument is a bare number or boolean: `ReplaceList(101101, "9", "0")`, `ReplaceList("a-b", 7, "-")`, `ReplaceList("a1b", "-", 1)`, `ReplaceList(true, "X", "ru")`, `ReplaceList("a-b", true, "-")` and `ReplaceList("is true here", "X", true)` all failed. Quote numeric values.

### The search values run one after another

| Call | Renders |
|---|---|
| `ReplaceList("a", "XY", "a", "X")` | `XYY` |
| `ReplaceList("abc", "-", "ab", "bc")` | `-c` |
| `ReplaceList("abc", "-", "bc", "ab")` | `a-` |
| `ReplaceList("aaa", "a", "aa")` | `aa` |
| `ReplaceList("Red BLUE green", "-", "red", "blue", "GREEN")` | `- - -` |

Each search value works on the output of the one before it. In the first row `a` turns into `XY`, and the next search value then hits the `X` just inserted, giving `XYY`. So order matters: `ab` before `bc` leaves `-c`, the reverse leaves `a-`. Within one search value the scan is a single pass, so `aaa` with `aa` → `a` stays `aa`. Matching ignores case: `ReplaceList("Hello World", "There", "WORLD")` and `ReplaceList("Cat cat CAT", "dog", "cat")` give `Hello There` and `dog dog dog`.

{% include test-script.html bundle="next-ampscript-functions--replacelist" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--replacelist" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Matching ignores case.** Not stated in the reference; in Next `ReplaceList("Cat cat CAT", "dog", "cat")` gives `dog dog dog`. [Card](/next/differs-from-docs/#replacelist-ignores-case)
- **Search values apply in sequence.** The reference does not say so; in Next `ReplaceList("a", "XY", "a", "X")` gives `XYY` because the second value matches text the first one inserted. [Card](/next/differs-from-docs/#replacelist-search-values-chain)
- **Numbers and booleans break the render.** The reference does not rule them out, but `ReplaceList("a1b", "-", 1)` made the Next preview fail with HTTP 500. [Card](/next/differs-from-docs/#replacelist-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Replace`](/next/ampscript/functions/replace/) — one search value with its own replacement
- [`Concat`](/next/ampscript/functions/concat/) — the other variadic String function
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-replace-list.html)
