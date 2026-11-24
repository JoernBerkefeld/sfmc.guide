---
layout: page
title: "AMPscript Domain (Next)"
description: "Return everything after the first at sign of an email address with AMPscript Domain in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/domain/
platforms:
  - next
syntax: "Domain(emailAddress)"
return_type: string
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: true
engagement: same
mcn_tested: 2026-11-23
engagement_note: "Every address shape tried renders the same in Engagement, from `example.com` for a plain address to an empty result for a string without an at sign."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `emailAddress` | string | Yes | Email address; the text after the first at sign is returned verbatim |

## Example

```ampscript
%%=Domain("tomas.q@example.com")=%%
```

Renders `example.com`.

The casing of the address is kept, so fold it before comparing against a list of domains:

```ampscript
%%=Lowercase(Domain("Tomas.Q@Example.COM"))=%%
```

Renders `example.com`.

## Return value

**`string`** — the text after the first at sign, unchanged.

The result is open text. Inputs without a usable domain part render nothing at all, so test the result for emptiness rather than comparing it with a literal.

## Behaviour

**The split happens at the first at sign.** `Domain("a@b@example.com")` gives `b@example.com`: the second at sign stays in the result.

**Multi-level domains come back whole.** `Domain("tomas.q@a.b.example.co.uk")` gives `a.b.example.co.uk`, and the six-label `Domain("tomas.q@sub.a.b.example.co.uk")` also keeps every label (`sub.a.b.example.co.uk`).

**Casing is preserved.** `Domain("Tomas.Q@Example.COM")` gives `Example.COM`.

**The address is not validated.** `Domain("tomas q@example.com")` gives `example.com` despite the space, and `Domain("hello@world")` gives `world`.

**A plus tag makes no difference.** `Domain("tomas.q+news@example.com")` gives `example.com`.

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

A call with the wrong number of arguments was not tried in Next.

{% include test-script.html bundle="next-ampscript-functions--domain" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **It works in Next although the docs say it does not.** The official availability table marks `Domain` as unsupported in Marketing Cloud Next. In a Next email it saved and rendered, for example `example.com` for a plain address. [Card](/next/differs-from-docs/#domain-available-in-next)

{% include platform-compare.html %}

## See also

- [IsEmailAddress](/next/ampscript/functions/isemailaddress/) — validate the address before splitting it
- [Empty](/next/ampscript/functions/empty/) — test a variable holding the result for emptiness
- [Lowercase](/next/ampscript/functions/lowercase/) — fold the case before comparing
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-domain.html)
