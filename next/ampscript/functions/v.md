---
layout: page
title: "AMPscript v (Next)"
description: "Output a value inline with AMPscript v in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including that a quoted name is written as itself."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/v/
platforms:
  - next
syntax: "v(variableName)"
return_type: string
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: true
engagement: same
mcn_tested: 2026-11-23
engagement_note: "Variables, string literals and numbers render the same on both platforms."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `variableName` | string \| number | Yes | Variable reference, literal or nested function call to output |

## Example

```ampscript
%%[ SET @word = "zeta" ]%%
<p>%%=v(@word)=%%</p>
```

Renders `<p>zeta</p>`.

## Return value

**`string`** — the value, written as text.

The value can be anything, so there is no fixed set of results to test for.

## Behaviour

**A variable is written as its value.** A variable set to `"zeta"` renders `zeta`; one set to `7` renders `7`.

**A number literal is accepted.** `v(5)` renders `5`.

**A quoted name is written as itself.** `v("p")` renders the letter `p`, not the value of a variable called `p`. A typo such as `v("id")` therefore renders the word `id` instead of failing.

**Exactly one argument.** An email with `v()` or with `v(@a, @b)` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

Nested function calls, request parameters and subscriber attributes were not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--v" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--v" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **A quoted name is written as itself.** The docs type the argument as a string naming the variable. In Next `v("p")` rendered `p`, not the value of `@p`. [Card](/next/differs-from-docs/#v-quoted-name-written-literally)

{% include platform-compare.html %}

## See also

- [Concat](/next/ampscript/functions/concat/) — join values before writing them
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-v.html)
