---
layout: page
title: "Replace"
description: "Replaces all occurrences of a substring with a new value. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including matching that ignores case and a single-pass scan that never revisits text it just inserted."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/replace/
platforms:
  - engagement
  - next
syntax: "Replace(sourceString, searchSubstring[, replacementSubstring])"
return_type: string
min_args: 2
max_args: 3
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
| `searchSubstring` | string \| number | Yes | Text to look for |
| `replacementSubstring` | string \| number | No | Text to put in its place; omit it to delete the match |

## Example

```ampscript
%%[
  VAR @greeting
  SET @greeting = Replace("Hello World", "World", "There")
]%%
Greeting: %%=v(@greeting)=%%
```

Renders `Greeting: Hello There`.

The everyday use is flattening a delimited value for display, which relies on every occurrence being replaced rather than just the first:

```ampscript
%%[
  VAR @tags, @readable
  SET @tags = "one,two,three"
  SET @readable = Replace(@tags, ",", " / ")
]%%
Interests: %%=v(@readable)=%%
```

That renders `Interests: one / two / three`.

Casing is not part of the match — see below before using this to swap a brand or product name.

## Return value

**`string`** — the source with every match rewritten.

A source with no match comes back unchanged, and an empty source returns an empty string. The returned text is otherwise an open domain, so there is no closed set of values to test for.

## Behaviour

**Every occurrence is replaced.** `Replace("one,two,three", ",", " / ")` rewrites both commas and gives `one / two / three`. A search string equal to the whole source works too: `Replace("abc", "abc", "xyz")` gives `xyz`.

**No match leaves the source untouched.** Searching for text that is absent returns the source verbatim, as does a search string longer than the source — neither is an error.

**Omitting the third argument deletes the match.** `Replace("abc", "b")` gives `ac`, so removing a fragment needs no empty-string placeholder. Passing an explicit empty string does the same: `Replace("a-b-c", "-", "")` gives `abc`.

**An empty search string is a no-op.** `Replace("abc", "", "X")` returns `abc` rather than interleaving `X` between the characters, and an empty source returns an empty string.

**Numbers are accepted in all three positions and handled as their text form.** Replacing the digit `0` with `9` inside the numeric literal `101101` gives `191191`, a numeric search value matches inside a string, and a numeric replacement is inserted as its digits. Booleans are not usable in any position: a boolean source renders an empty string, and a boolean search value or replacement contributes nothing at all.

**Replacement text is inserted verbatim, including non-ASCII.** In a source built as `caf` + `Char(233)` + `" time"`, which measures `9`, the accented letter is replaceable by a plain `e`, and inserting `Char(233)` back into an ASCII source produces the accented letter — confirmed by dumping the code points rather than reading the console.

### Casing is ignored, and the source is scanned once

| Call | Renders |
|---|---|
| `Replace("Hello World", "WORLD", "There")` | `Hello There` |
| `Replace("Hello World", "hELLO", "Howdy")` | `Howdy World` |
| `Replace("Cat cat CAT", "cat", "dog")` | `dog dog dog` |
| `Replace("aaa", "aa", "a")` | `aa` |
| `Replace("cat", "cat", "cat dog")` | `cat dog` |

Matching ignores case, so a lowercase search string rewrites capitalised and all-caps text alike — the same way [`IndexOf`](/engagement/ampscript/functions/indexof/) locates text. There is no case-sensitive variant, so a value whose casing carries meaning cannot be swapped selectively here.

The scan runs once over the source. Replacing `aa` with `a` inside `aaa` leaves `aa`, because the pair the replacement helped form is never revisited — this is not a normalising sweep. The same property makes a self-referential replacement safe: text you insert is never re-matched, so `Replace("cat", "cat", "cat dog")` terminates instead of looping.

Catalogued on [Differs from official docs](/engagement/differs-from-docs/#replace-case-insensitive-single-pass). The docs are silent on the casing, the optional argument and the scan order rather than wrong about them, so the entry is not flagged as contradicting them.

{% include test-script.html bundle="ampscript-functions--replace" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

{% include callout.html type="info" title="Echo the input, not just the result" content="When a case involves non-ASCII text, print the source alongside the result and check the code points. A terminal that mangles one accented letter will make a correct replacement look broken." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#replace-case-insensitive-single-pass) — the casing and single-pass findings in full
- [`IndexOf`](/engagement/ampscript/functions/indexof/) — finds the text instead of rewriting it, and matches case the same way
- [`Substring`](/engagement/ampscript/functions/substring/) — takes a portion of a string by position
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-replace.html) · [ampscript.guide](https://ampscript.guide/replace/)
