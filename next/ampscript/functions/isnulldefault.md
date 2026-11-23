---
layout: page
title: "AMPscript IsNullDefault (Next)"
description: "Return a value or a fallback with AMPscript IsNullDefault in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, where the fallback is returned for unset and empty values."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/isnulldefault/
platforms:
  - next
syntax: "IsNullDefault(value, defaultValue)"
return_type: string
min_args: 2
max_args: 2
verification: in-progress
differs_from_docs: true
engagement: differs
signature_differs: true
mcn_tested: 2026-11-23
engagement_note: "Engagement never returns the fallback outside Smart Capture: `IsNullDefault(\"\", \"fallback\")` and an unset variable give an empty string. Next returns the fallback for an undeclared, unset or empty value (`fallback`, `DEF`, `42`). Values that are set pass through the same on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| boolean \| date | Yes | Value to test — returned unchanged whenever it is present |
| `defaultValue` | string \| number \| boolean \| date | Yes | Fallback to return when the value is missing — in a Next email returned for an undeclared variable, an unset variable and the empty string, without Smart Capture |

## Example

```ampscript
%%[ VAR @tier ]%%
%%=IsNullDefault(@tier, "DEF")=%%
```

Renders `DEF`, because `@tier` was never set.

```ampscript
%%[ SET @tier = "hello" ]%%
%%=IsNullDefault(@tier, "DEF")=%%
```

Renders `hello`.

## Return value

**`string`** — the value when it is present, otherwise the fallback.

The result is whatever the caller passes in, so there is no fixed set of values to test for.

## Behaviour

**Unset and empty values return the fallback.** An undeclared variable, a variable declared with `VAR` and never set, and a variable set to `""` each give `DEF`. The literal call `IsNullDefault("", "fallback")` gives `fallback`.

**A number works as the fallback.** `IsNullDefault(@unset, 42)` gives `42`.

**Present values pass through.** `"hello"`, `0`, `"0"` and `"false"` come back unchanged, whether passed directly or through a variable.

**A date passes through in ISO form.** `IsNullDefault(Now(), "DEF")` gives a value like `2026-11-22T20:29:14`.

**Whitespace is not null.** A variable holding three spaces does not return the fallback. The preview showed a single space rather than three.

Request parameters, subscriber attributes and Smart Capture forms were not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--isnulldefault" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **It works in Next although the docs say it does not.** The official availability table marks `IsNullDefault` as unsupported in Marketing Cloud Next and ties it to Smart Capture forms. In a Next email it works on ordinary variables: an unset or empty value returns the fallback. [Card](/next/differs-from-docs/#isnulldefault-available-in-next)

{% include platform-compare.html %}

## See also

- [`IsNullDefault` in Marketing Cloud Engagement](/engagement/ampscript/functions/isnulldefault/) — how it behaves there
- [IsNull](/next/ampscript/functions/isnull/) — the same null test without the fallback
- [Empty](/next/ampscript/functions/empty/) — the other missing-value test
- [IIf](/next/ampscript/functions/iif/) — build a fallback from any condition
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-is-null-default.html)
