---
layout: page
title: "AMPscript IsEmailAddress (Next)"
description: "Check a value against email address syntax with AMPscript IsEmailAddress in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the lowercase result and the single-label domain it accepts."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/isemailaddress/
platforms:
  - next
syntax: "IsEmailAddress(value)"
return_type: boolean
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement writes the result as `True` / `False`; Next writes `true` / `false`. Engagement rejects an address whose domain has no dot (`tomas.q@example` gives `False`), while Next accepts it (`true`)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string | Yes | Value to validate; trim it first, as a leading or trailing space fails |

## Example

```ampscript
%%=IsEmailAddress("tomas.q@example.com")=%%
```

Renders `true`.

The result works directly as a condition:

```ampscript
%%[
  IF IsEmailAddress("tomas.q@example.com") == true THEN
    SET @state = "matches-true"
  ELSE
    SET @state = "no-match"
  ENDIF
]%%
%%=v(@state)=%%
```

Renders `matches-true`.

## Return value

**`boolean`** — `true` for an address that passes the syntax check, `false` otherwise.

Written into the email, the result is the lowercase word `true` or `false`. Compared with `== true` or `== false` in an `IF`, it behaves as a real boolean.

## Behaviour

**The result is lowercase.** Every case rendered `true` or `false`, never the capitalised form.

**A domain without a dot passes.** `IsEmailAddress("tomas.q@example")` gives `true`.

**A leading or trailing space fails.** `" tomas.q@example.com"` and `"tomas.q@example.com "` both give `false`.

**Local-part decoration is fine.** A plus tag, dots, hyphens, underscores and digits are accepted: `a.b-c_d+e9@x-y.z.example.museum` gives `true`.

**A number does not abort the call.** `IsEmailAddress(123)` gives `false`, as does the empty string.

### Which inputs are accepted

| Call | Renders |
|---|---|
| `IsEmailAddress("tomas.q@example.com")` | `true` |
| `IsEmailAddress("tomas.q+news@example.com")` | `true` |
| `IsEmailAddress("tomas.q@mail.corp.example.com")` | `true` |
| `IsEmailAddress("a.b-c_d+e9@x-y.z.example.museum")` | `true` |
| `IsEmailAddress("tomas.q@example")` | `true` |
| `IsEmailAddress("tomas.q.example.com")` | `false` |
| `IsEmailAddress(" tomas.q@example.com")` | `false` |
| `IsEmailAddress("tomas.q@example.com ")` | `false` |
| `IsEmailAddress("a@b@example.com")` | `false` |
| `IsEmailAddress("@example.com")` | `false` |
| `IsEmailAddress("a@.com")` | `false` |
| `IsEmailAddress("")` | `false` |
| `IsEmailAddress(123)` | `false` |

Calls with no argument or two arguments were not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--isemailaddress" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **It works in Next although the docs say it does not.** The official availability table marks `IsEmailAddress` as unsupported in Marketing Cloud Next. In a Next email it saved and rendered `true` or `false`, matching the result table of the official page. [Card](/next/differs-from-docs/#isemailaddress-available-in-next)

{% include platform-compare.html %}

## See also

- [Domain](/next/ampscript/functions/domain/) — extracts the domain from an address
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-is-email-address.html)
