---
layout: page
title: "AuthenticatedEmployeeID"
description: "Returns the numeric employee ID of the Marketing Cloud user tied to the current context. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request still gets a non-empty ID back, so a non-empty result proves nothing about who is visiting."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedemployeeid/
platforms:
  - engagement
syntax: "AuthenticatedEmployeeID()"
return_type: string
min_args: 0
max_args: 0
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

This function takes no parameters.

## Example

```html
%%[
  VAR @employeeId
  SET @employeeId = AuthenticatedEmployeeID()
]%%
User: %%=v(@employeeId)=%%
```

Renders a nine-digit numeric ID — on the business unit tested, the same value on every request, including anonymous ones.

The value is an ordinary string, so it composes normally:

```html
%%[
  VAR @employeeId, @label
  SET @employeeId = AuthenticatedEmployeeID()
  SET @label = Concat("employee-", @employeeId)
]%%
%%=v(@label)=%%
```

What it does **not** support is a sign-in check — see below.

## Return value

**`string`** — a numeric employee ID.

The value domain is open: an ID is an account-scoped number, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary ID back.

## Behaviour

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered a nine-digit ID at HTTP 200. `Empty()` on the same value answered false and `Length()` gave nine.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical digits.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedemployeeid" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages. That authenticated path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose identity the returned ID represents.

## See also

- [Differs from docs: a value without a session](/engagement/differs-from-docs/#authenticatedemployeeid-value-without-a-session)
- [AttributeValue](/engagement/ampscript/functions/attributevalue/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-employee-id.html) · [ampscript.guide](https://ampscript.guide/authenticatedemployeeid/)
