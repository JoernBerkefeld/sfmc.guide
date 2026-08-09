---
layout: page
title: "AuthenticatedEmployeeUserName"
description: "Returns the login username of the Marketing Cloud user tied to the current context. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request still gets a non-empty, email-shaped username back, so a non-empty result proves nothing about who is visiting."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedemployeeusername/
platforms:
  - engagement
syntax: "AuthenticatedEmployeeUserName()"
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
  VAR @userName
  SET @userName = AuthenticatedEmployeeUserName()
]%%
User: %%=v(@userName)=%%
```

Renders an email-shaped username — on the business unit tested, a dotted name, an `@`, then a dotted suffix.

Because the value identifies an account user, keep it out of anything a visitor can see and use it only where an internal label is wanted:

```html
%%[
  VAR @userName, @isKnown
  SET @userName = AuthenticatedEmployeeUserName()
  SET @isKnown = IsEmailAddress(@userName)
]%%
%%=v(@isKnown)=%%
```

What it does **not** support is a sign-in check — see below.

## Return value

**`string`** — a login username.

The value domain is open: a username is account-scoped free text, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary username back.

## Behaviour

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered a username at HTTP 200. `Empty()` on the same value answered false and `Length()` gave 39.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical output.

### The username is email-shaped, and unrelated to the employee ID

The value is not a bare login name. `IndexOf` found a single `@` after a 16-character local part, a `.` earlier inside that local part, and no space anywhere; `IsEmailAddress()` accepted the whole value. Treat it as account-identifying data — it belongs in internal logic, not in rendered content.

It also carries no relationship to the numeric ID from [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/). Called in the same render, the two values compared as not equal, the ID was 9 characters against the username's 39, and `IndexOf` of the ID inside the username answered `0` — its not-found result. Neither value can be derived from the other, so fetch whichever one you actually need.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedemployeeusername" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages. That authenticated path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose identity the returned username represents.

## See also

- [Differs from docs: a value without a session](/engagement/differs-from-docs/#authenticatedemployeeusername-value-without-a-session)
- [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-employee-username.html) · [ampscript.guide](https://ampscript.guide/authenticatedemployeeusername/)
