---
layout: page
title: "AMPscript IsNull (Next)"
description: "Test a value for null with AMPscript IsNull in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, where an unset variable and the empty string count as null."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/isnull/
platforms:
  - next
syntax: "IsNull(value)"
return_type: boolean
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement returns `False` for every value a variable can hold, including an undeclared variable, an unset one and the empty string. Next returns `true` for those three and `false` for the rest, written in lowercase."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| boolean \| date | Yes | Value to test — typically a data extension field value retrieved with `Lookup` |

In a Next email it also works on page variables: an unset variable or the empty string counts as null.

## Example

```ampscript
%%[ VAR @nickname ]%%
%%=IsNull(@nickname)=%%
```

Renders `true`, because the variable was declared and never set.

```ampscript
%%[ SET @word = "hello" ]%%
%%=IsNull(@word)=%%
```

Renders `false`.

## Return value

**`boolean`** — `true` when the value is null or empty, `false` otherwise.

Written into the email, the result is the lowercase word `true` or `false`.

## Behaviour

**Unset and empty count as null.** An undeclared variable, a variable declared with `VAR` but never set, and a variable set to `""` each give `true`.

**Whitespace and zero do not.** Three spaces, `0`, `"0"`, `"false"`, an ordinary string like `"hello"` and `Now()` each give `false`. So do the literals `"x"` and `0` passed directly.

**`v()` passes the empty value through.** `IsNull(v(@unset))` gives `true`.

**`Concat` with one argument cannot be nested.** An email with `IsNull(Concat(@unset))` is rejected at save with HTTP 400, "The AMPscript syntax isn't valid". That is a [Concat](/next/ampscript/functions/concat/) rule: it needs at least two arguments in Next.

Data extension fields, subscriber attributes and request parameters were not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--isnull" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--isnull" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The empty string counts as null.** The docs say `IsNull`, unlike `Empty`, does not treat the empty string as null. In Next a variable set to `""` gave `true`. [Card](/next/differs-from-docs/#isnull-empty-string-is-null)

{% include platform-compare.html %}

## See also

- [`IsNull` in Marketing Cloud Engagement](/engagement/ampscript/functions/isnull/) — how it behaves there
- [Empty](/next/ampscript/functions/empty/) — the other missing-value test
- [IsNullDefault](/next/ampscript/functions/isnulldefault/) — returns a fallback for a null value
- [IIf](/next/ampscript/functions/iif/) — what usually consumes the boolean
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-is-null.html)
