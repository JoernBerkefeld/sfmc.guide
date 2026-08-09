---
layout: page
title: "IsEmailAddress"
description: "Checks a value against email address syntax only. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including a domain without a top-level domain, which the official reference documents as valid and the engine rejects."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/isemailaddress/
platforms:
  - engagement
syntax: "IsEmailAddress(value)"
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
| `value` | string | Yes | Value to validate; trim it first, as a leading or trailing space fails |

## Example

```html
%%[ VAR @ok SET @ok = IsEmailAddress("tomas.q@example.com") ]%%
%%=v(@ok)=%%
```

Renders `True`.

Validating a form field means trimming it first — the raw value from a query string keeps its spaces, and a space is enough to fail the check:

```html
%%[
  VAR @input, @ok
  SET @input = Trim(RequestParameter("email"))
  SET @ok = IsEmailAddress(@input)
]%%
%%=IIf(@ok, "thanks", "please check that address")=%%
```

## Return value

**`boolean`** — `True` for a syntactically valid address, `False` otherwise.

Both literals were produced in the same render, as the capitalised words `True` and `False`. They are genuine booleans: each compares equal to the corresponding boolean value, so `IIf` and `IF` consume the result directly.

## Behaviour

**The check is syntax only.** A well-formed address at a domain that resolves to nothing still returns `True`, so nothing here says the mailbox can receive mail.

**A leading or trailing space fails.** `IsEmailAddress(" tomas.q@example.com")` and the same address with a trailing space both return `False`, while the trimmed form returns `True`. No source mentions this, and an untrimmed form field is the usual way to meet it.

**Local-part decoration is fine.** A plus tag, dots, hyphens, underscores and digits are all accepted — `a.b-c_d+e9@x-y.z.example.museum` returns `True`.

**Multi-label domains are accepted.** `tomas.q@mail.corp.example.com` returns `True`.

**A number does not abort the call.** `IsEmailAddress(123)` returns `False`, as does the empty string.

### Which inputs are accepted

| Call | Renders |
|---|---|
| `IsEmailAddress("tomas.q@example.com")` | `True` |
| `IsEmailAddress("tomas.q+news@example.com")` | `True` |
| `IsEmailAddress("tomas.q@mail.corp.example.com")` | `True` |
| `IsEmailAddress("a.b-c_d+e9@x-y.z.example.museum")` | `True` |
| `IsEmailAddress("tomas.q@example")` | `False` |
| `IsEmailAddress("tomas.q.example.com")` | `False` |
| `IsEmailAddress(" tomas.q@example.com")` | `False` |
| `IsEmailAddress("tomas.q@example.com ")` | `False` |
| `IsEmailAddress("a@b@example.com")` | `False` |
| `IsEmailAddress("@example.com")` | `False` |
| `IsEmailAddress("a@.com")` | `False` |
| `IsEmailAddress("")` | `False` |

### A domain with no top-level domain is rejected

The official reference lists an address whose domain is a single label — no `.com`, no dot at all — as a valid result, with a note that such domains do exist. The engine returns `False` for that shape. Every other example in the same table matched what the engine did. See the [differs-from-docs card](/engagement/differs-from-docs/#isemailaddress-single-label-domain-rejected).

{% include test-script.html bundle="ampscript-functions--isemailaddress" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Domain](/engagement/ampscript/functions/domain/) — extracts the domain from an address, and performs no validation of its own
- [IsPhoneNumber](/engagement/ampscript/functions/isphonenumber/) — the sibling format check for telephone numbers
- [The single-label domain the docs accept](/engagement/differs-from-docs/#isemailaddress-single-label-domain-rejected)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-is-email-address.html) · [ampscript.guide](https://ampscript.guide/isemailaddress/)
