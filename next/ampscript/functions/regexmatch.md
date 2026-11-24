---
layout: page
title: "AMPscript RegExMatch (Next)"
description: "Pull text out of a string with a regular expression using AMPscript RegExMatch in Marketing Cloud Next. Syntax, the call forms proven in a Marketing Cloud Next email, and how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/regexmatch/
platforms:
  - next
syntax: "RegExMatch(sourceString, regExPattern, returnValue[, regExOptions, ...])"
return_type: string
min_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement renders every tested form: a bare number as the group selector (`RegExMatch(\"order-4821-eu\", \"[0-9]+\", 0)` gives `4821`), capture groups, named groups, option names and a numeric source. In Next two forms rendered: the quoted selector `\"0\"` (`4821`) and a named group chosen by name (`\"num\"` gives `4821`, as on Engagement) when the pattern's `<` and `>` are built with `Char()`, because the email save strips `<num>` from a literal pattern as if it were a tag. Every other tested call saved but made the email preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to match against |
| `regExPattern` | string | Yes | Regular expression to apply |
| `returnValue` | string | Yes | Group selector as a quoted string; `"0"` returns the whole match, a group name returns that named group |
| `regExOptions` | string | No | Option name such as IgnoreCase; no call with an option rendered in Next |
| `regExOptionsN` | string | No | Further option names |

At least three arguments. The forms that rendered pass the selector in quotes: a bare number as selector or as source breaks the render.

## Example

```ampscript
%%=RegExMatch("order-4821-eu", "[0-9]+", "0")=%%
```

Renders `4821`.

A named group works too. Build the `<` and `>` around the group name with `Char()`, because saving the email strips `<num>` out of a literal pattern as if it were a tag:

```ampscript
%%=RegExMatch("order-4821-eu", Concat("order-(?", Char(60), "num", Char(62), "[0-9]+)-"), "num")=%%
```

Renders `4821`.

These are the only RegExMatch forms that rendered in a Next email. Test any other pattern or selector in a preview before you rely on it.

## Return value

**`string`** — the text of the selected match.

The proven results are a whole-pattern match with selector `"0"` and a named group chosen by its name. What Next returns when nothing matches is not known, because every tested non-match broke the render (see below).

## Behaviour

**Quote the group selector.** `RegExMatch("order-4821-eu", "[0-9]+", "0")` gives `4821`. The same call with a bare `0`, `RegExMatch("order-4821-eu", "[0-9]+", 0)`, saves but makes the preview fail with HTTP 500.

**Named groups work when the pattern is built with `Char()`.** `RegExMatch("order-4821-eu", Concat("order-(?", Char(60), "num", Char(62), "[0-9]+)-"), "num")` gives `4821`, as on Engagement. Typed as the literal `"order-(?<num>[0-9]+)-"`, the pattern loses `<num>` when the email is saved, because the save strips anything that looks like a tag out of string literals.

**Most tested calls break the render.** The email saved and published, but the preview failed (HTTP 500, or no new rendered version) for each of these calls on its own:

| Call | Engagement renders |
|---|---|
| `RegExMatch("SAVE23", "^[A-Z0-9]{5,7}$", 0)` | `SAVE23` |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-([a-z]+)", 2)` | `eu` |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", 1)` | `4821` |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", "nope")` | *(empty)* |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", 5)` | *(empty)* |
| `RegExMatch("order-4821-eu", "[0-9]+", 1)` | *(empty)* |
| `RegExMatch("order-4821-eu", "[0-9][0-9][0-9][0-9][0-9][0-9]", 0)` | *(empty)* |
| `RegExMatch("a1 b2 c3", "[a-z][0-9]", 0)` | `a1` |
| `RegExMatch("", "[0-9]+", 0)` | *(empty)* |
| `RegExMatch(4821, "[0-9]+", 0)` | `4821` |
| `RegExMatch("ORDER-4821", "order", 0)` | *(empty)* |
| `RegExMatch("ORDER-4821", "order", 0, "IgnoreCase")` | `ORDER` |
| `RegExMatch("ORDER-4821", "order", 0, "ignorecase")` | `ORDER` |
| `RegExMatch("ORDER-4821", "order.4821", 0, "IgnoreCase", "Singleline")` | `ORDER-4821` |

Most of these pass a bare number somewhere, so they do not show whether capture groups, options or a non-match would work with a quoted selector. One call with a string selector failed as well: the missing group name `"nope"`.

**Bad input fails, as on Engagement.** An unclosed group, `RegExMatch("order-4821-eu", "order-([0-9]+", 0)`, breaks the render. An unknown option name, `RegExMatch("order-4821-eu", "[0-9]+", 0, "NotARealOption")`, and the two-argument call `RegExMatch("order-4821-eu", "[0-9]+")` are refused earlier: the content API answers HTTP 400 with "The AMPscript syntax isn't valid" and the email cannot be saved.

{% include test-script.html bundle="next-ampscript-functions--regexmatch" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--regexmatch" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **RegExMatch renders in Next, with a quoted selector.** The reference lists it as not available in Marketing Cloud Next, yet `RegExMatch("order-4821-eu", "[0-9]+", "0")` rendered `4821`, and a named group chosen by name rendered too. [Card](/next/differs-from-docs/#regexmatch-available-in-next)
- **A bare number as the group selector breaks the render.** The reference passes `0` unquoted in its examples; in Next that form, and groups `1` and `2`, made the preview fail. Only quoted selectors rendered (`"0"` and a group name). [Card](/next/differs-from-docs/#regexmatch-numeric-group-breaks-preview)

{% include platform-compare.html %}

## See also

- [`IndexOf`](/next/ampscript/functions/indexof/) — plain substring search without a regular expression
- [`Replace`](/next/ampscript/functions/replace/) — rewrite text without a regular expression
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-regex-match.html)
