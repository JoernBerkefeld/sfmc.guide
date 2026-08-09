---
layout: page
title: "IIf"
description: "Picks one of two values from a boolean expression. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the undocumented fact that only the selected branch is evaluated, and that a plain string condition always picks the false branch."
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

This is the most useful undocumented property of the function, and it needed a control to prove.

A call that reliably aborts the page was parked in the branch that should *not* be taken — in both directions. Both requests returned HTTP 200 with the other branch's value and both markers printed. On its own that only shows nothing bad happened; so the same deploy also called that aborting function directly in its own branch, and that request returned HTTP 422 with no output at all. The abort was reachable, and simply was never reached.

Neither reference says anything about evaluation order, so this is undocumented rather than contradicted. Practically it means a `Lookup`, a `HTTPGet` or any other costly call can sit in a branch guarded by the condition, and it will not run unless it is the answer.

### How the four Utility tests compare

The same inputs put through all four functions, on one page, in one run:

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

{% include callout.html type="warning" title="Argument-count probes need their own deploy" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including the control block and branches that were never requested. Keep arity checks out of a gated behaviour harness and give each one its own deployment, or a whole run returns uninformative HTTP 422s." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [Empty](/engagement/ampscript/functions/empty/) — the boolean this function is most often given
- [IsNull](/engagement/ampscript/functions/isnull/) — returns a boolean too, but `False` for everything a page variable holds
- [IsNullDefault](/engagement/ampscript/functions/isnulldefault/) — the fallback it looks like; pair `IIf` with `Empty` instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-iif.html) · [ampscript.guide](https://ampscript.guide/iif/)
