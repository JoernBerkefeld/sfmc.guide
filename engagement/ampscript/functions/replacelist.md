---
layout: page
title: "ReplaceList"
description: "Replaces several search values with one common replacement value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the sequential passes that let a later search value rewrite what an earlier one inserted."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/replacelist/
platforms:
  - engagement
  - next
syntax: "ReplaceList(sourceString, replacementString, searchString1[, searchStringN, ...])"
return_type: string
min_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string \| number | Yes | String to search in |
| `replacementString` | string \| number | Yes | Text every match is replaced with |
| `searchString1` | string \| number | Yes | First value to look for |
| `searchStringN` | string \| number | No | Any number of further values to look for |

There is no upper bound on the argument count.

## Example

```ampscript
%%[
  VAR @path
  SET @path = ReplaceList("a-b/c", "_", "-", "/")
]%%
Key: %%=v(@path)=%%
```

Renders `Key: a_b_c`.

The everyday use is flattening a value that arrived with several different delimiters into one readable list:

```ampscript
%%[
  VAR @hobbies, @readable
  SET @hobbies = "a,b,c;d"
  SET @readable = ReplaceList(@hobbies, "+", ",", ";")
]%%
Interests: %%=v(@readable)=%%
```

That renders `Interests: a+b+c+d`.

The search values are not applied at the same time — see below before choosing a replacement value.

## Return value

**`string`** — the source with every match of every search value rewritten.

A source none of the search values matches comes back unchanged, and an empty source returns an empty string. The returned text is otherwise an open domain, so there is no closed set of values to test for.

## Behaviour

**One search value is enough, and there is no upper limit.** `ReplaceList("Hello World", "There", "World")` gives `Hello There`, while a six-argument call replacing five different digits in `a1b2c3d4e5` gives `a*b*c*d*e*`.

**A search value that is absent changes nothing.** Two search values that never occur return the source verbatim, and repeating the same search value twice is harmless — `ReplaceList("aXa", "-", "a", "a")` gives `-X-`, because the second pass finds nothing left to do.

**Empty values are benign.** An empty replacement deletes every match, so `ReplaceList("a-b/c", "", "-", "/")` gives `abc`. An empty search value inserts nothing and returns `abc` unchanged, and an empty source returns an empty string.

**Numbers are accepted in every role and handled as their text form.** Replacing the digit `0` with `9` inside the numeric literal `101101` gives `191191`, a numeric replacement is inserted as its digits, and a numeric search value matches inside a string. Booleans are not usable anywhere: a boolean source renders an empty string, and a boolean search value or replacement contributes nothing at all.

### The search values run one after another

| Call | Renders |
|---|---|
| `ReplaceList("a", "XY", "a", "X")` | `XYY` |
| `ReplaceList("abc", "-", "ab", "bc")` | `-c` |
| `ReplaceList("abc", "-", "bc", "ab")` | `a-` |
| `ReplaceList("aaa", "a", "aa")` | `aa` |
| `ReplaceList("Red BLUE green", "-", "red", "blue", "GREEN")` | `- - -` |

Each search value is applied to the result of the previous one rather than to the original source. In the first row the source `a` becomes `XY`, and the second search value then matches the `X` that the first pass had just inserted, so the result grows to `XYY`. Pick a replacement value that none of the later search values can match, or put the risky search value first.

For the same reason the order of the search values is load-bearing: `ab` before `bc` consumes the `ab` and leaves `-c`, while `bc` before `ab` consumes the `bc` and leaves `a-`.

Within a single search value the scan is still one pass, exactly like [`Replace`](/engagement/ampscript/functions/replace/) — replacing `aa` with a single `a` inside `aaa` leaves `aa` rather than collapsing further.

Matching ignores case throughout, so a lowercase search value rewrites capitalised and all-caps text alike and there is no case-sensitive variant.

Catalogued on [Differs from official docs](/engagement/differs-from-docs/#replacelist-sequential-cascade). The docs are silent on the sequencing and the casing rather than wrong about them, so the entry is not flagged as contradicting them.

{% include test-script.html bundle="ampscript-functions--replacelist" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#replacelist-sequential-cascade) — the sequencing and casing findings in full
- [`Replace`](/engagement/ampscript/functions/replace/) — one search value at a time, matching case the same way
- [`Concat`](/engagement/ampscript/functions/concat/) — the other variadic String function
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-replace-list.html) · [ampscript.guide](https://ampscript.guide/replacelist/)
