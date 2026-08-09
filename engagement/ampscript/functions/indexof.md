---
layout: page
title: "IndexOf"
description: "Returns the 1-based position of a substring, matching case-insensitively. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including an undocumented third argument that selects which occurrence to locate."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/indexof/
platforms:
  - engagement
  - next
syntax: "IndexOf(sourceString, substring[, occurrence])"
return_type: number
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
| `substring` | string \| number | Yes | Substring to find |
| `occurrence` | string \| number | No | Which occurrence to locate, as a whole number |

## Example

```ampscript
%%[
  VAR @pos
  SET @pos = IndexOf("Hello World", "World")
]%%
Position: %%=v(@pos)=%%
```

Renders `Position: 7`.

The common pattern is splitting a value at a known separator — take the position, then subtract one to get the length of the part before it:

```ampscript
%%[
  VAR @fullName, @space, @first
  SET @fullName = "Dale Cameron"
  SET @space = IndexOf(@fullName, " ")
  IF @space > 0 THEN
    SET @first = Substring(@fullName, 1, Subtract(@space, 1))
  ENDIF
]%%
```

The search ignores letter case, and a third argument can reach past the first match — see below.

## Return value

**`number`** — the 1-based position at which the substring starts.

`0` is the only sentinel: it is returned when the substring is absent, when either argument is empty, and when a requested occurrence does not exist. Positions themselves are an open domain, so there is no closed set of values to test for beyond checking against `0`.

## Behaviour

**Positions are 1-based.** The leading character of `Hello World` is position `1`, `World` starts at `7`, and the trailing `d` is `11`. A needle equal to the whole source returns `1`, and a needle longer than the source returns `0`.

**Without a third argument only the first match is reported.** `IndexOf("banana", "na")` gives `3` even though `na` also occurs at `5`.

**Any empty argument returns `0`.** An empty substring, an empty source, and both empty all return `0` rather than the position `1` some string APIs give for an empty needle.

**Numbers are accepted for both text parameters and searched by their string form.** Searching the numeric literal `9876543` for `"65"` gives `4`. Booleans are not usable text: passing `true` as the source and searching for a fragment of the word it would spell returns `0`, as does searching a string that literally contains that word for a boolean needle.

**Positions count UTF-16 code units, the same unit [`Length`](/engagement/ampscript/functions/length/) counts.** In a source built as `caf` + `Char(233)` + `" time"`, which measures `9`, the accented letter is at `4` and the following word at `6`.

**Argument counts outside two or three abort the page.** Zero, one and four arguments each returned HTTP 422 with nothing rendered — including the markers printed before the call — so there is no error value to test for.

### The search is case-insensitive

This is the finding most likely to bite, because no source mentions it and every published example happens to search with matching case.

| Call | Returns |
|---|---|
| `IndexOf("Hello World", "World")` | `7` |
| `IndexOf("Hello World", "WORLD")` | `7` |
| `IndexOf("Hello World", "world")` | `7` |
| `IndexOf("Hello World", "h")` | `1` |

There is no flag to make the match case-sensitive. When case matters, extract the located text with [`Substring`](/engagement/ampscript/functions/substring/) and compare it yourself rather than expecting `IndexOf` to return `0` on a case mismatch.

### The undocumented third argument selects an occurrence

A third argument does not abort the way a fourth does — it succeeds and chooses which match to report.

| Call | Returns |
|---|---|
| `IndexOf("Hello World", "o", 1)` | `5` |
| `IndexOf("Hello World", "o", 2)` | `8` |
| `IndexOf("Hello World", "o", 3)` | `0` |
| `IndexOf("aaaa", "aa", 2)` | `3` |
| `IndexOf("abcabcabc", "abc", -1)` | `7` |

Overlapping matches are not counted separately, which is why the second `aa` inside `aaaa` is at `3` rather than `2`. A count past the last match returns `0`. `0` selects the first match, while a negative value resolves to the **last** match whatever its magnitude — `-1`, `-2` and `-9` all returned the third and final match above.

A numeric string works in that position; a decimal, a boolean, and a non-numeric string each abort the page. The argument is undocumented, so it carries no compatibility guarantee.

Both findings are catalogued on [Differs from official docs](/engagement/differs-from-docs/#indexof-is-case-insensitive). The docs are silent rather than wrong in both cases, so the entry is not flagged as contradicting them.

{% include test-script.html bundle="ampscript-functions--indexof" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#indexof-is-case-insensitive) — the case-insensitivity and the occurrence argument in full
- [`Length`](/engagement/ampscript/functions/length/) — the counting unit the returned positions use
- [`Concat`](/engagement/ampscript/functions/concat/) — builds the strings you search
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-index-of.html) · [ampscript.guide](https://ampscript.guide/indexof/)
