---
layout: page
title: "IsNull"
description: "Tests a value for a genuine null. Runtime-proven on a live Marketing Cloud Engagement CloudPage — where it returned False for every input a page variable can hold, including the unset variable the official example says returns true."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/isnull/
platforms:
  - engagement
  - next
syntax: "IsNull(value)"
return_type: boolean
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| boolean \| date | Yes | Value to test — typically a data extension field value retrieved with `Lookup` |

## Example

The intended use is a data extension field that may carry no value at all:

```html
%%[
  VAR @nickname
  SET @nickname = Lookup("Preferences", "Nickname", "SubscriberKey", _subscriberkey)
]%%
%%=IIf(IsNull(@nickname), "no nickname on file", @nickname)=%%
```

Reaching for it anywhere else silently takes the false branch. On a CloudPage this renders `present` even though nothing was ever assigned:

```html
%%[ VAR @maybe ]%%
%%=IIf(IsNull(@maybe), "missing", "present")=%%
```

Use [Empty](/engagement/ampscript/functions/empty/) for that check — for the same variable it renders `True`.

## Return value

**`boolean`** — `False` when the value is not null.

Only the `False` literal was observed. Every one of the sixteen inputs probed rendered it, and the true token was never produced — so no set of return literals is claimed here, even though the sibling `Empty` proved the engine renders `True` readily for a boolean-returning Utility function.

## Behaviour

**Nothing a page variable can hold is null.** An undeclared variable, a variable declared but never assigned, the empty string, three spaces, `0`, `"0"`, `"false"`, an ordinary string and a date value each returned `False`.

**Missing context is not null either.** An attribute that does not exist, a query-string parameter that was not supplied, `_subscriberkey`, `firstname`, `_messagecontext` and `jobid` on an anonymous page request all returned `False` — as did an unset variable routed through `v()` and through `Concat()`, in case the accessor rather than the value decided the answer.

**A non-string argument is accepted.** `IsNull(0)` and `IsNull(Now())` both rendered at HTTP 200 rather than aborting.

**The community guide's framing matches what was observed:** the function answers a question about data extension field values, and reports false everywhere else.

### The unset variable the official example promises

The official reference's own usage example declares a variable with `VAR`, never assigns it, and states the result is true. That exact shape returned `False`. The gate printed its own start and done markers at HTTP 200 alongside a known-good control block, so the page ran to completion — this is a result, not a swallowed abort. See the [differs-from-docs card](/engagement/differs-from-docs/#isnull-unset-variable-not-null).

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

The `IsNull` column is constant. That is the practical summary: for a missing-value test on a page, this is the wrong function.

{% include test-script.html bundle="ampscript-functions--isnull" chapter="behaviour" %}

{% include callout.html type="info" title="One check could not be closed" content="Proving the true literal needs a data extension field holding a genuine database null. Two attempts to build one — inserting a row with unset columns, then a bare lookup against the same data extension — both aborted the page at compile time, including on a plain request with no branch selected. Nothing from those deploys was attributed to the function, and the check remains open rather than guessed at." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [Empty](/engagement/ampscript/functions/empty/) — what to use instead for a missing-value test; it separates the inputs this function cannot
- [IsNullDefault](/engagement/ampscript/functions/isnulldefault/) — the same null definition with a fallback value bolted on
- [IIf](/engagement/ampscript/functions/iif/) — what usually consumes the boolean
- [The unset variable is not reported as null](/engagement/differs-from-docs/#isnull-unset-variable-not-null)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-is-null.html) · [ampscript.guide](https://ampscript.guide/isnull/)
