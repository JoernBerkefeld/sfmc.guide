---
layout: page
title: "RegExMatch"
description: "Returns the first occurrence of a regular expression match in a string, selected by capture group. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the case-sensitive matching that sets it apart from every other String function."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/regexmatch/
platforms:
  - engagement
syntax: "RegExMatch(sourceString, regExPattern, returnValue[, regExOptions, ...])"
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
| `sourceString` | string \| number | Yes | String to match against |
| `regExPattern` | string | Yes | Regular expression to apply |
| `returnValue` | string \| number | Yes | Index or name of the capture group to return; 0 returns the whole match |
| `regExOptions` | string | No | A .NET RegexOptions member name such as IgnoreCase or Multiline |
| `regExOptionsN` | string | No | Any number of further RegexOptions member names |

There is no upper bound on the number of option names.

## Example

```html
%%[
  VAR @digits
  SET @digits = RegExMatch("order-4821-eu", "[0-9]+", 0)
]%%
Number: %%=v(@digits)=%%
```

Renders `Number: 4821`.

A capture group is the usual way to pull one part out of a structured value:

```html
%%[
  VAR @region
  SET @region = RegExMatch("order-4821-eu", "order-([0-9]+)-([a-z]+)", 2)
]%%
Region: %%=v(@region)=%%
```

That renders `Region: eu`.

A pattern that matches nothing looks exactly like a pattern that matched but selected a group that does not exist — see below before treating an empty result as a failed match.

## Return value

**`string`** — the text of the selected capture group.

The empty string is the only sentinel value, and it is returned for three different reasons: the pattern found nothing, the requested capture group does not exist, or the source was empty. Matched text is otherwise an open domain, so there is no closed set of values to test for.

## Behaviour

**A group selector of `0` returns the whole match, and a higher index returns that capture group.** Against `order-4821-eu`, the pattern `[0-9]+` with selector `0` gives `4821`, while `order-([0-9]+)-([a-z]+)` gives `4821` for selector `1` and `eu` for selector `2`.

**The selector may be a number, the same number as a string, or a named capture group.** Passing `"0"` in quotes gives `4821` just as the bare `0` does, and a pattern declaring a named group returns `4821` when the group's name is passed as the selector.

**Only the first match is returned.** The pattern `[a-z][0-9]` against `a1 b2 c3` gives `a1`; there is no way to reach the later matches from a single call.

**Numbers are accepted as the source.** Matching `[0-9]+` against the numeric literal `4821` gives `4821`, so a numeric field needs no conversion first.

### Matching is case-sensitive, unlike the other String functions

| Call | Renders |
|---|---|
| `RegExMatch("ORDER-4821", "order", 0)` | *(empty)* |
| `RegExMatch("ORDER-4821", "order", 0, "IgnoreCase")` | `ORDER` |
| `RegExMatch("ORDER-4821", "order", 0, "ignorecase")` | `ORDER` |

[`IndexOf`](/engagement/ampscript/functions/indexof/), [`Replace`](/engagement/ampscript/functions/replace/) and [`ReplaceList`](/engagement/ampscript/functions/replacelist/) all ignore case, so a search value moved from one of them into a regular expression silently stops matching. Append the `IgnoreCase` option, or write the pattern to accept both casings. The option name itself is not case-sensitive — the all-lowercase spelling works the same way.

More than one option may be passed: two option names and five option names were both accepted on a single call, which is why the argument count has no upper bound.

### An empty result does not mean the pattern failed

| Call | Renders | Why |
|---|---|---|
| `RegExMatch("order-4821-eu", "[0-9][0-9][0-9][0-9][0-9][0-9]", 0)` | *(empty)* | no match |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", 5)` | *(empty)* | index past the last group |
| `RegExMatch("order-4821-eu", "[0-9]+", 1)` | *(empty)* | the pattern declares no group |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", "nope")` | *(empty)* | no group of that name |
| `RegExMatch("", "[0-9]+", 0)` | *(empty)* | empty source |

All five return the same value at HTTP 200, so a caller cannot tell a mis-typed group selector from a genuine non-match by the result alone. Two inputs behave differently and abort the page instead: a malformed pattern such as an unclosed group, and an option name that is not a real RegexOptions member. Both discard everything the page had already rendered, so keep them out of production paths rather than relying on an empty return.

Catalogued on [Differs from official docs](/engagement/differs-from-docs/#regexmatch-case-sensitive-and-variadic-options). The docs are silent on the casing and on the option count rather than wrong about them, so the entry is not flagged as contradicting them.

{% include test-script.html bundle="ampscript-functions--regexmatch" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#regexmatch-case-sensitive-and-variadic-options) — the casing and option-count findings in full
- [`IndexOf`](/engagement/ampscript/functions/indexof/) — plain substring search, matching case-insensitively
- [`Replace`](/engagement/ampscript/functions/replace/) — pair with it to rewrite what a pattern found
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-regex-match.html) · [ampscript.guide](https://ampscript.guide/regexmatch/)
