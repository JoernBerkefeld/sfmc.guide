---
layout: page
title: "AMPscript IIf (Next)"
description: "Pick one of two values from a condition with AMPscript IIf in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including which plain values count as true and the evaluation of both branches."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/iif/
platforms:
  - next
syntax: "IIf(expression, trueValue, falseValue)"
return_type: string
min_args: 3
max_args: 3
verification: in-progress
differs_from_docs: true
engagement: differs
signature_differs: true
mcn_tested: 2026-11-23
engagement_note: "In Engagement every plain value selects the false branch; in Next a non-empty string such as `\"hello\"`, `\"0\"` or whitespace selects the true branch (`T`). Engagement evaluates only the selected branch, so a `RaiseError` in the other branch is harmless; in Next the same email fails to render. Engagement's `==` and `!=` compare strings with regard to case; in Next they ignore case (`IIf(\"abc\" == \"ABC\", \"eq\", \"ne\")` gives `eq`)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `expression` | boolean | Yes | Condition to evaluate — in Next some non-boolean values select the true branch (`"hello"`, `"0"`, whitespace) and others the false one (`""`, `0`, `"false"`) |
| `trueValue` | string \| number \| boolean \| date | Yes | Value returned when true; evaluated in Next even when false is selected |
| `falseValue` | string \| number \| boolean \| date | Yes | Value returned when false; evaluated in Next even when true is selected |

## Example

```ampscript
%%[ SET @firstName = "" ]%%
Hello %%=IIf(Empty(@firstName), "there", @firstName)=%%,
```

Renders `Hello there,`.

A comparison works in both directions:

```ampscript
%%=IIf(1 == 1, "yes", "no")=%%
```

Renders `yes`; with `1 == 2` the call gives the false branch.

## Return value

**`string`** — the selected branch, passed through as it is.

The result is whatever the branches hold, so there is no fixed set of values. Calls in Next rendered `T`, `F`, `42` and a date-time.

## Behaviour

**Comparisons and boolean functions work as conditions.** `1 == 1` picks the true branch and `1 == 2` the false one. `Empty(@var)` works too, also negated as `NOT Empty(@var)`.

**`==` and `!=` ignore case on strings.** `IIf("abc" == "ABC", "eq", "ne")` gives `eq`, two variables holding `Hello` and `hello` compare as equal, and `"abc" != "ABC"` is false; `"abc" == "abd"` is still false. Engagement compares with regard to case, so a condition that tells `ABC` from `abc` there does not in Next.

**Some non-empty strings count as true.** Used directly as the condition, a variable holding `"hello"`, `"0"` or whitespace selects the true branch (written as a literal, the run of spaces reaches AMPscript as a single space, because the render collapses runs of spaces).

**These count as false:** an undeclared variable, a variable declared but never set, the empty string, the number `0` and the string `"false"`.

| Condition variable | `IIf(@x, "T", "F")` |
|---|---|
| undeclared | `F` |
| declared, never set | `F` |
| `""` | `F` |
| `" "` (whitespace) | `T` |
| `0` | `F` |
| `"0"` | `T` |
| `"false"` | `F` |
| `"hello"` | `T` |

Testing a value directly is therefore not a reliable presence check. Use `Empty(@x)` as the condition.

**Branch values are not converted.** `IIf(1 == 1, 42, 7)` gives `42`. A date in the selected branch comes out as `2026-11-22T20:27:28`: ISO form with a `T` between date and time.

**Both branches are evaluated.** With `RaiseError` in the branch that is not selected, in either direction, the email saves but its preview fails with HTTP 500. Do not rely on the condition to keep a failing or costly call from running.

{% include test-script.html bundle="next-ampscript-functions--iif" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--iif" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Both branches are evaluated.** The docs describe `IIf` as returning one of two values and do not mention that the other branch runs. In Next a `RaiseError` in the branch that is not selected makes the preview fail with HTTP 500. [Card](/next/differs-from-docs/#iif-evaluates-both-branches)
- **Plain strings as the condition follow undocumented rules.** The docs type the condition as a string without saying which values are true. In Next `"hello"`, `"0"` and whitespace select the true branch; `""`, `0` and `"false"` the false one. [Card](/next/differs-from-docs/#iif-string-condition-truthiness)

{% include platform-compare.html %}

## See also

- [Empty](/next/ampscript/functions/empty/) — the condition to use for a presence check
- [IsNull](/next/ampscript/functions/isnull/) — another boolean test
- [RaiseError](/next/ampscript/functions/raiseerror/) — runs even in the branch that is not selected
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-iif.html)
