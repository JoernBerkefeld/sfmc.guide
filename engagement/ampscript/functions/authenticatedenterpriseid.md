---
layout: page
title: "AuthenticatedEnterpriseID"
description: "Returns the enterprise ID (EID) of the Marketing Cloud account tied to the current context. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request gets the account's parent MID back even when the page itself runs on a child business unit."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedenterpriseid/
platforms:
  - engagement
syntax: "AuthenticatedEnterpriseID()"
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
  VAR @enterpriseId
  SET @enterpriseId = AuthenticatedEnterpriseID()
]%%
Account: %%=v(@enterpriseId)=%%
```

Renders a short run of digits with no punctuation — on the account tested, seven digits.

Because the digits behave as a real number, the value can be matched against a MID you already know without any string juggling:

```html
%%[
  VAR @enterpriseId, @isExpectedAccount
  SET @enterpriseId = AuthenticatedEnterpriseID()
  SET @isExpectedAccount = IIf(@enterpriseId == "1234567", "yes", "no")
]%%
%%=v(@isExpectedAccount)=%%
```

The MID it hands back is the account's, not the running business unit's — see below.

## Return value

**`string`** — an enterprise ID.

The value domain is open: an account ID is account-scoped and varies per Marketing Cloud account, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary ID back.

## Behaviour

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered an ID at HTTP 200. `Empty()` on the same value answered false and `Length()` gave 7.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical output.

**It is digits, and they are numeric.** `IndexOf` found no dot, no space, no `@` and no dash anywhere in the value, so unlike the email-shaped `Authenticated*` siblings it carries no punctuation at all. `Add()` applied straight to the value returned it incremented by one, so it is a numeric string rather than opaque text.

### It is the account MID, not the business unit's

The page under test was published on a **child** business unit. The returned value nevertheless matched the account's **parent** (enterprise) MID exactly, and did **not** match the child business unit's own MID. Both comparisons ran in the same render against the two real MIDs configured for the account, so the answer is not an artefact of a made-up identifier.

Read the result as an account-level identifier. If what you actually need is the MID of the business unit executing the code, this is not that function.

It is also not the employee identifier: called in the same render, [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/) came back a different, longer digit string, and `IndexOf` answered `0` — its not-found result — in **both** directions, so neither value is a substring of the other.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedenterpriseid" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages. That authenticated path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose account the returned ID represents.

## See also

- [Differs from docs: the parent MID without a session](/engagement/differs-from-docs/#authenticatedenterpriseid-parent-mid-without-a-session)
- [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/)
- [AuthenticatedMemberID](/engagement/ampscript/functions/authenticatedmemberid/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-enterprise-id.html) · [ampscript.guide](https://ampscript.guide/authenticatedenterpriseid/)
