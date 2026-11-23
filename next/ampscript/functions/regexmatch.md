---
layout: page
title: "AMPscript RegExMatch (Next)"
description: "Pull text out of a string with a regular expression using AMPscript RegExMatch in Marketing Cloud Next. Syntax, the one call form proven in a Marketing Cloud Next email, and how it differs from Engagement."
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
engagement_note: "Engagement renders every tested form: a bare number as the group selector (`RegExMatch(\"order-4821-eu\", \"[0-9]+\", 0)` gives `4821`), capture groups, named groups, option names and a numeric source. In Next only the quoted selector `\"0\"` rendered (`4821`); every other tested call saved but made the email preview fail."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceString` | string | Yes | String to match against |
| `regExPattern` | string | Yes | Regular expression to apply |
| `returnValue` | string | Yes | Group selector as a quoted string; `"0"` returns the whole match |
| `regExOptions` | string | No | Option name such as IgnoreCase; no call with an option rendered in Next |
| `regExOptionsN` | string | No | Further option names |

At least three arguments. The only form that rendered passes the selector in quotes: a bare number as selector or as source breaks the render.

## Example

```ampscript
%%=RegExMatch("order-4821-eu", "[0-9]+", "0")=%%
```

Renders `4821`.

This is the only RegExMatch call that rendered in a Next email. Test any other pattern or selector in a preview before you rely on it.

## Return value

**`string`** — the text of the selected match.

The only proven result is a whole-pattern match with selector `"0"`. What Next returns when nothing matches is not known, because every tested non-match broke the render (see below).

## Behaviour

**Quote the group selector.** `RegExMatch("order-4821-eu", "[0-9]+", "0")` gives `4821`. The same call with a bare `0`, `RegExMatch("order-4821-eu", "[0-9]+", 0)`, saves but makes the preview fail with HTTP 500.

**Most tested calls break the render.** The email saved and published, but the preview failed (HTTP 500, or no new rendered version) for each of these calls on its own:

| Call | Engagement renders |
|---|---|
| `RegExMatch("SAVE23", "^[A-Z0-9]{5,7}$", 0)` | `SAVE23` |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-([a-z]+)", 2)` | `eu` |
| `RegExMatch("order-4821-eu", "order-([0-9]+)-", 1)` | `4821` |
| `RegExMatch("order-4821-eu", "order-(?<num>[0-9]+)-", "num")` | `4821` |
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

Most of these pass a bare number somewhere, so they do not show whether capture groups, options or a non-match would work with a quoted selector. Two calls with a string selector failed as well: the named group `"num"` and the missing group name `"nope"`.

**Bad input fails, as on Engagement.** An unclosed group, `RegExMatch("order-4821-eu", "order-([0-9]+", 0)`, breaks the render. An unknown option name, `RegExMatch("order-4821-eu", "[0-9]+", 0, "NotARealOption")`, and the two-argument call `RegExMatch("order-4821-eu", "[0-9]+")` are refused earlier: the content API answers HTTP 400 with "The AMPscript syntax isn't valid" and the email cannot be saved.

{% include test-script.html bundle="next-ampscript-functions--regexmatch" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--regexmatch" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **RegExMatch renders in Next, in one form.** The reference lists it as not available in Marketing Cloud Next, yet `RegExMatch("order-4821-eu", "[0-9]+", "0")` rendered `4821`. [Card](/next/differs-from-docs/#regexmatch-available-in-next)
- **A bare number as the group selector breaks the render.** The reference passes `0` unquoted in its examples; in Next that form, and groups `1` and `2`, made the preview fail. Only `"0"` in quotes rendered. [Card](/next/differs-from-docs/#regexmatch-numeric-group-breaks-preview)

{% include platform-compare.html %}

## See also

- [`RegExMatch` in Marketing Cloud Engagement](/engagement/ampscript/functions/regexmatch/) — how it behaves there
- [`IndexOf`](/next/ampscript/functions/indexof/) — plain substring search without a regular expression
- [`Replace`](/next/ampscript/functions/replace/) — rewrite text without a regular expression
- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-regex-match.html)
