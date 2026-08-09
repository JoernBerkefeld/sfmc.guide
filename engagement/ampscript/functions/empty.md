---
layout: page
title: "Empty"
description: "Tests whether a value is missing or blank. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including which inputs count as empty, and the exact literals True and False that the function renders."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/empty/
platforms:
  - engagement
  - next
syntax: "Empty(value)"
return_type: boolean
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| boolean \| date | Yes | Value to test — a variable, literal, attribute or nested function call |

## Example

```html
%%[
  VAR @firstName
  SET @firstName = AttributeValue("FirstName")
]%%
Hello %%=IIf(Empty(@firstName), "there", @firstName)=%%,
```

For a subscriber without a first name this renders `Hello there,`. That pairing with [IIf](/engagement/ampscript/functions/iif/) is the everyday use — `Empty` produces the boolean, `IIf` picks the wording.

Rendered on its own, the function shows its two literals directly:

```html
%%=Empty("")=%%   renders True
%%=Empty("x")=%%  renders False
```

## Return value

**`boolean`** — `True` when the value is missing or blank, `False` otherwise.

Both literals are capitalised. The returned value compares equal to the boolean `true` and to the string `"True"`, so either form works in a comparison — but if the result is written straight into the page, the visible text is `True` or `False`, never `true`, `1` or an empty string.

## Behaviour

**Three inputs count as empty: the empty string, a variable declared but never assigned, and a name that was never declared at all.** Everything else is a value.

**Whitespace is a value.** A variable holding three spaces returned `False`. A form field the user filled with spaces will pass an `Empty` check, so trim before testing when the input comes from a person.

**Neither `0` nor `"0"` nor `"false"` is empty.** All three returned `False`, as a variable and as an inline literal. There is no falsiness here — only presence.

**A non-string argument is accepted.** Both `Empty(0)` and `Empty(Now())` rendered `False` at HTTP 200 rather than aborting, even though every source types the parameter as a string.

**Missing context reads as empty.** An attribute that does not exist, a query-string parameter that was not supplied, `_subscriberkey` and `firstname` on an anonymous page request all returned `True`. That makes this the right test for "did this personalisation resolve".

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

Only `Empty` distinguishes a missing value from a present one. That is the whole reason to reach for it rather than its neighbours.

{% include test-script.html bundle="ampscript-functions--empty" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so a marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes (since 67) |

## See also

- [IsNull](/engagement/ampscript/functions/isnull/) — the narrower test; it returned `False` for every input above, so it is not a substitute
- [IsNullDefault](/engagement/ampscript/functions/isnulldefault/) — looks like a fallback, but outside a Smart Capture form it never returns the default
- [IIf](/engagement/ampscript/functions/iif/) — what usually consumes the boolean this function produces
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-empty.html) · [ampscript.guide](https://ampscript.guide/empty/)
