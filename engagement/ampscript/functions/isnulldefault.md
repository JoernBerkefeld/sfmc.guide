---
layout: page
title: "IsNullDefault"
description: "Returns a value, or a fallback when it is null. Runtime-proven on a live Marketing Cloud Engagement CloudPage — where the fallback was never reached and every empty-ish input returned the empty string instead."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/isnulldefault/
platforms:
  - engagement
syntax: "IsNullDefault(value, defaultValue)"
return_type: string
min_args: 2
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| boolean \| date | Yes | Value to test — returned unchanged whenever it is present |
| `defaultValue` | string \| number \| boolean \| date | Yes | Fallback to return when the value is null — only reached in a Smart Capture form context |

## Example

The shape it is built for is a Smart Capture form field, repopulating an input after a failed submit:

```html
%%[
  VAR @tier
  SET @tier = RequestParameter("tier")
]%%
<input name="tier" value="%%=IsNullDefault(@tier, 'Basic')=%%">
```

Outside that context the fallback does not arrive. Requested without a `tier` parameter, the page rendered `value=""` — not `Basic`. Where a fallback really is needed, build it from a test that works everywhere:

```html
%%=IIf(Empty(@tier), "Basic", @tier)=%%
```

## Return value

**`string`** — the original value when it is present, otherwise the empty string on a CloudPage.

The domain is whatever the caller passes, so there is no set of literals to test for. The run rendered `hello`, three spaces, `0`, `false`, a full date-time string and the empty string from this one function.

## Behaviour

**A present value comes back unchanged and unconverted.** Whitespace survives verbatim, `0` renders as `0`, and the string `"false"` comes back lowercase — distinguishable from the capitalised `False` that [Empty](/engagement/ampscript/functions/empty/) renders.

**A non-string argument is accepted in either position.** `IsNullDefault(Now(), "DEF")` returned the full date-time string rather than aborting, and a number was accepted in the fallback position.

**The fallback was never returned.** Six distinct empty-ish inputs — undeclared variable, unset variable, the empty string, an absent request parameter, an attribute that does not exist, and the `firstname` profile token — each returned the empty string. The fallback literal appeared zero times in the entire run.

**That agrees with both references rather than contradicting them.** The official page scopes the function to Smart Capture forms from its first sentence, and the community guide states outright that it will not return a null-occurrence value in another context. The Smart Capture context cannot be reached from a plain page request, so the other half of that behaviour is untested here rather than disproven.

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

The third column is a pass-through with an empty string where the fallback was expected — and no error to signal it.

{% include test-script.html bundle="ampscript-functions--isnulldefault" chapter="behaviour" %}

{% include callout.html type="warning" title="It fails quietly" content="Reaching for this as a general fallback returns the empty string instead of the supplied default, at HTTP 200 and with no error. The bug surfaces as a blank on the rendered page, which is easy to mistake for a data problem. Use `IIf(Empty(x), fallback, x)` outside Smart Capture." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Empty](/engagement/ampscript/functions/empty/) — the test that actually separates missing from present on a page
- [IsNull](/engagement/ampscript/functions/isnull/) — the same null definition without the fallback argument
- [IIf](/engagement/ampscript/functions/iif/) — pair it with `Empty` to build the fallback this function does not deliver
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-is-null-default.html) · [ampscript.guide](https://ampscript.guide/isnulldefault/)
