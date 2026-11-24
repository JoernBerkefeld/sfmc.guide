---
layout: page
title: "AMPscript Empty (Next)"
description: "Test whether a variable is missing or blank with AMPscript Empty in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the variable-only argument and the lowercase result."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/empty/
platforms:
  - next
syntax: "Empty(@variable)"
return_type: boolean
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: false
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement also accepts a literal or a function call (`Empty(\"\")`, `Empty(0)`, `Empty(Now())`); Next rejects such an email at save. Engagement writes the result capitalised as `True` / `False`, Next as `true` / `false`. Which values count as empty is the same on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `variable` | variable | Yes | An AMPscript variable; a literal or a nested function call in this slot makes Next reject the email at save |

Next only takes a variable here. Assign a literal or a function result to a variable first, then test the variable.

## Example

```ampscript
%%[ SET @firstName = "" ]%%
Hello %%=IIf(Empty(@firstName), "there", @firstName)=%%,
```

Renders `Hello there,`. Pairing it with [IIf](/next/ampscript/functions/iif/) is the usual way to use the result.

Written straight into the content, the result is lowercase:

```ampscript
%%[ SET @code = "x" ]%%
%%=Empty(@code)=%%
```

Renders `false`.

## Return value

**`boolean`** — `true` when the variable is missing or blank, `false` otherwise.

Both values are written in lowercase. In a condition the result compares equal to the boolean `true` and also to the string `"True"`, so both comparison styles work.

## Behaviour

**Only a variable is accepted.** An email containing `Empty("")`, `Empty("x")`, `Empty(0)` or `Empty(Now())` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid", pointing at the call. The same applies when `Empty` with a literal is nested in another function, such as `IIf(Empty(""), "T", "F")`.

**Three states count as empty:** a variable set to the empty string, a variable declared with `VAR` but never set, and a name that was never declared. All three render `true`.

**Whitespace is a value.** A variable holding whitespace renders `false` (written as a literal, the run of spaces reaches AMPscript as a single space, because the render collapses runs of spaces).

**`0`, `"0"` and `"false"` are values too.** Each of them, held in a variable, renders `false`, as does `"hello"`.

Attributes, request parameters and subscriber fields were not tested in Next, so whether a missing one counts as empty there is open.

{% include test-script.html bundle="next-ampscript-functions--empty" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--empty" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [IIf](/next/ampscript/functions/iif/) — what usually consumes the result
- [IsNull](/next/ampscript/functions/isnull/) — a different null test
- [IsNullDefault](/next/ampscript/functions/isnulldefault/) — fallback value for a null
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-empty.html)
