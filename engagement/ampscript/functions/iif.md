---
layout: page
title: "IIf"
description: "Picks one of two values from a boolean expression. Covers the undocumented fact that only the selected branch is evaluated, and that a plain string condition always picks the false branch."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/iif/
platforms:
  - engagement
  - next
syntax: "IIf(expression, trueValue, falseValue)"
return_type: string
min_args: 3
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
| `expression` | boolean | Yes | Boolean expression to evaluate — a non-boolean value always selects the false branch |
| `trueValue` | string \| number \| boolean \| date | Yes | Value returned when true; evaluated only when true is selected |
| `falseValue` | string \| number \| boolean \| date | Yes | Value returned when false; evaluated only when false is selected |

## Example

The condition has to be a real comparison or a boolean-returning function:

```html
%%[
  VAR @firstName
  SET @firstName = AttributeValue("FirstName")
]%%
Hello %%=IIf(Empty(@firstName), "there", @firstName)=%%,
```

Passing the value itself does not work. This renders `anonymous` even when the name is present, because a plain string never selects the true branch:

```html
%%=IIf(@firstName, @firstName, "anonymous")=%%
```

Because only the selected branch runs, an expensive or fragile call is safe in the branch that is not taken:

```html
%%=IIf(Empty(@key), "no lookup needed", Lookup("Preferences", "Tier", "SubscriberKey", @key))=%%
```

## Return value

**`string`** — whichever branch argument was selected, returned unconverted.

The domain is whatever the caller passes, so there is no set of literals to test for. The run rendered `T`, `F`, `42` and a full date-time string from this function.

## Behaviour

**A comparison selects correctly in both directions.** `1 == 1` took the true branch, `1 == 2` the false one. A boolean-returning function works as the condition too, including negated with `NOT`.

**There is no truthiness.** Eight non-boolean conditions — an undeclared variable, a variable declared but never assigned, the empty string, three spaces, `0`, `"0"`, `"false"` and the plain string `hello` — every one selected the false branch. Since the references type the first parameter as a string, writing `IIf(@name, ...)` and expecting a non-empty name to be true is an easy mistake, and it fails silently.

**Branch values pass through unconverted.** A number came back as `42`, a date as its full date-time string.

### Only the selected branch is evaluated

This is the most useful undocumented property of the function.

A call that reliably aborts the page can sit in the branch that is *not* taken — in either direction. The page still returns HTTP 200 with the other branch's value: the unselected branch is never evaluated, so the aborting call simply never runs.

Neither reference says anything about evaluation order, so this is undocumented rather than contradicted. Practically it means a `Lookup`, a `HTTPGet` or any other costly call can sit in a branch guarded by the condition, and it will not run unless it is the answer.

### How the four Utility tests compare

The same inputs compared across all four functions:

| Input | `Empty` | `IsNull` | `IsNullDefault(x, "DEF")` | `IIf(x, "T", "F")` |
|---|---|---|---|---|
| undeclared variable | True | False | *(empty)* | F |
| declared, never set | True | False | *(empty)* | F |
| `""` | True | False | *(empty)* | F |
| `"   "` | False | False | `   ` | F |
| `0` | False | False | `0` | F |
| `"0"` | False | False | `0` | F |
| `"false"` | False | False | `false` | F |
| `"hello"` | False | False | `hello` | F |

The last column is constant, which is the point: feed this function a value and it always answers false. Feed it `Empty(value)` — the first column — and it answers the question that was actually meant.

{% include test-script.html bundle="ampscript-functions--iif" chapter="behaviour" %}

{% include callout.html type="warning" title="A wrong argument count breaks the whole page" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including branches that are never selected. There is no way to catch the failure, so keep any argument-count check in its own page rather than mixing it with behaviour you need to render." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [Empty](/engagement/ampscript/functions/empty/) — the boolean this function is most often given
- [IsNull](/engagement/ampscript/functions/isnull/) — returns a boolean too, but `False` for everything a page variable holds
- [IsNullDefault](/engagement/ampscript/functions/isnulldefault/) — the fallback it looks like; pair `IIf` with `Empty` instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-iif.html)
- [ampscript.guide](https://ampscript.guide/iif/)
