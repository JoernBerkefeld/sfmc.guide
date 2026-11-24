---
layout: page
title: "AMPscript Concat (Next)"
description: "Join values into a string with AMPscript Concat in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/concat/
platforms:
  - next
syntax: "Concat(string1, string2[, stringN, ...])"
return_type: string
min_args: 2
verification: verified
differs_from_docs: false
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement accepts a single argument (`Concat(\"only\")` gives `only`); Next rejects that email at save. Booleans are dropped in Engagement (`Concat(true, false)` gives an empty string) but joined as text in Next (`truefalse`). A date is written as `M/d/yyyy h:mm:ss AM` in Engagement and as `2026-11-22T23:21:17` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `string1` | string \| number \| date \| boolean | Yes | First value to join |
| `string2` | string \| number \| date \| boolean | Yes | Second value to join |
| `stringN` | string \| number \| date \| boolean | No | Any number of further values |

At least two values are needed. There is no upper bound on the argument count.

## Example

```ampscript
%%=Concat("Hello", "World")=%%
```

Renders `HelloWorld`.

Nothing is inserted between the values, so a separator is an argument of its own:

```ampscript
%%=Concat("a", "-", "b")=%%
```

Renders `a-b`.

## Return value

**`string`** — every value turned into text and joined in order, with no separator.

The result is arbitrary text, so there is no fixed set of special values to test for.

## Behaviour

**Two arguments is the minimum.** An email that calls `Concat("only")` or `Concat()` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid", pointing at the call. Pass a second value, even an empty string, when you only have one.

**Variadic.** Two, three, twelve and twenty arguments all join in order: `Concat("a", "b", "c")` gives `abc`, and a twenty-argument call gives `abcdefghijklmnopqrst`.

**Numbers join as written.** `Concat(12, 3.5)` gives `123.5`. No arithmetic happens.

**Booleans join as text.** `Concat(true, false)` gives `truefalse`.

**Dates are written in ISO form.** `Concat(Now(), "X")` gives a value like `2026-11-22T23:21:17X`: date and time joined by a `T`, no time zone suffix.

**Empty strings add nothing.** `Concat("", "")` gives an empty string, not an error.

{% include test-script.html bundle="next-ampscript-functions--concat" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--concat" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [Differs from official docs (Next)](/next/differs-from-docs/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-concat.html)
