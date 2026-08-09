---
layout: page
title: "Domain"
description: "Returns everything after the first at sign of an email address. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including multi-level domains, which come back whole rather than reduced, and the original casing, which is preserved."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/domain/
platforms:
  - engagement
syntax: "Domain(emailAddress)"
return_type: string
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
| `emailAddress` | string | Yes | Email address; the text after the first at sign is returned verbatim |

## Example

```html
%%[ VAR @d SET @d = Domain("tomas.q@example.com") ]%%
%%=v(@d)=%%
```

Renders `example.com`.

Routing on the domain means folding the case first, because the result keeps whatever casing the address had:

```html
%%[
  VAR @d
  SET @d = Lowercase(Domain(emailaddr))
]%%
%%=IIf(@d == "example.com", "internal recipient", "external recipient")=%%
```

## Return value

**`string`** — the text following the first at sign.

There is no closed set of sentinel values to test for. An input with no at sign, an empty string, a bare at sign, an at sign with nothing after it and a number all render nothing at all; the docs describe those cases as a null return, and on a page that is an empty value. Use [Empty](/engagement/ampscript/functions/empty/) to detect it rather than comparing against a literal.

## Behaviour

**The split is on the first at sign, and the rest is returned verbatim.** `Domain("a@b@example.com")` gives `b@example.com` — the second at sign is part of the result, not a reason to fail.

**A multi-level domain comes back whole.** `Domain("tomas.q@a.b.example.co.uk")` gives `a.b.example.co.uk`, and a five-label domain returns all five labels. Nothing is reduced to a registrable domain.

**The original casing is preserved.** `Domain("Tomas.Q@Example.COM")` gives `Example.COM`, so a comparison against a lowercase allow-list needs `Lowercase` around it.

**No validation happens.** Values that [IsEmailAddress](/engagement/ampscript/functions/isemailaddress/) rejects still produce a domain: `Domain("tomas q@example.com")` gives `example.com` and `Domain("hello@world")` gives `world`. Validate first if that matters.

**A plus tag in the local part changes nothing.** `Domain("tomas.q+news@example.com")` gives `example.com`.

### What comes back for each shape

| Call | Renders |
|---|---|
| `Domain("tomas.q@example.com")` | `example.com` |
| `Domain("tomas.q+news@example.com")` | `example.com` |
| `Domain("tomas.q@a.b.example.co.uk")` | `a.b.example.co.uk` |
| `Domain("a@b@example.com")` | `b@example.com` |
| `Domain("Tomas.Q@Example.COM")` | `Example.COM` |
| `Domain("hello@world")` | `world` |
| `Domain("example.com")` | *(empty)* |
| `Domain("tomas.q@")` | *(empty)* |
| `Domain("@")` | *(empty)* |
| `Domain("")` | *(empty)* |
| `Domain(123)` | *(empty)* |

{% include test-script.html bundle="ampscript-functions--domain" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [IsEmailAddress](/engagement/ampscript/functions/isemailaddress/) — validate the address before splitting it, since this function will not
- [Empty](/engagement/ampscript/functions/empty/) — how to detect the empty result
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-domain.html) · [ampscript.guide](https://ampscript.guide/domain/)
