---
layout: page
title: "AMPscript Replace (Next)"
description: "Swap every occurrence of a substring with AMPscript Replace in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/replace/
platforms:
  - next
syntax: "Replace(sourceString, searchSubstring, replacementSubstring)"
return_type: string
min_args: 3
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts the two-argument form (`Replace(\"abc\", \"b\")` gives `ac`); Next rejects that email at save. Engagement also takes numbers in every position (`Replace(101101, \"0\", \"9\")` gives `191191`) and swallows booleans, while in Next a number or boolean argument makes the email preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to search in |
| `searchSubstring` | string | Yes | Text to look for |
| `replacementSubstring` | string | Yes | Text to put in its place; pass `""` to delete the match |

Exactly three arguments. Pass them as strings: a number or boolean literal in any position breaks the render.

## Example

```ampscript
%%=Replace("Hello World", "World", "There")=%%
```

Renders `Hello There`.

Every occurrence is rewritten, which makes it handy for turning a delimited value into readable text:

```ampscript
%%=Replace("one,two,three", ",", " / ")=%%
```

Renders `one / two / three`.

## Return value

**`string`** — the source with every match rewritten.

A source without a match comes back unchanged, and an empty source gives an empty string. Otherwise the result is free text, so there is no fixed set of special values to test for.

## Behaviour

**Three arguments, always.** An email containing `Replace("abc", "b")` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid", pointing at the call. To delete a fragment, pass an empty string as the third argument: `Replace("a-b-c", "-", "")` gives `abc`. Calls with no argument, one argument or four arguments are rejected at save the same way.

**Every occurrence is replaced.** `Replace("one,two,three", ",", " / ")` rewrites both commas. A search value equal to the whole source works too: `Replace("abc", "abc", "xyz")` gives `xyz`.

**No match leaves the source as it was.** `Replace("Hello World", "zzz", "!")` gives `Hello World`, and a search value longer than the source, `Replace("ab", "abcdef", "z")`, gives `ab`.

**Empty values do nothing harmful.** An empty search value is a no-op: `Replace("abc", "", "X")` and `Replace("abc", "", "")` both give `abc`. An empty source gives an empty string.

**Numbers and booleans break the render.** The email saves, but the preview fails (HTTP 500) when any argument is a bare number or boolean: `Replace(101101, "0", "9")`, `Replace("a1b1c", 1, "-")`, `Replace("a-b", "-", 7)`, `Replace(true, "ru", "X")`, `Replace("is true here", true, "X")` and `Replace("a-b", "-", true)` all failed. Quote numeric values.

**Non-ASCII text is replaced and inserted as written.** In a source built as `Concat("caf", Char(233), " time")`, replacing `Char(233)` with `e` gives `cafe time`, and `Replace("cafe time", "e t", Concat(Char(233), " T"))` gives `café Time`.

### Casing is ignored, and the source is scanned once

| Call | Renders |
|---|---|
| `Replace("Hello World", "WORLD", "There")` | `Hello There` |
| `Replace("Hello World", "world", "There")` | `Hello There` |
| `Replace("Hello World", "hELLO", "Howdy")` | `Howdy World` |
| `Replace("Cat cat CAT", "cat", "dog")` | `dog dog dog` |
| `Replace("aaa", "aa", "a")` | `aa` |
| `Replace("cat", "cat", "cat dog")` | `cat dog` |

The search value matches regardless of case. The scan runs once from left to right and never looks again at text it has just inserted, so `aaa` becomes `aa` rather than `a`, and a replacement that contains the search value does not loop.

{% include test-script.html bundle="next-ampscript-functions--replace" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--replace" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Matching ignores case.** The reference does not say so; in Next `Replace("Cat cat CAT", "cat", "dog")` gives `dog dog dog`. [Card](/next/differs-from-docs/#replace-ignores-case)
- **Numbers and booleans break the render.** The reference does not rule them out, but `Replace("a-b", "-", 7)` and `Replace(101101, "0", "9")` made the Next preview fail with HTTP 500. [Card](/next/differs-from-docs/#replace-number-breaks-preview)

{% include platform-compare.html %}

## See also

- [`Replace` in Marketing Cloud Engagement](/engagement/ampscript/functions/replace/) — how it behaves there
- [`ReplaceList`](/next/ampscript/functions/replacelist/) — several search values with one replacement
- [`Substring`](/next/ampscript/functions/substring/) — takes a portion of a string by position
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-replace.html)
