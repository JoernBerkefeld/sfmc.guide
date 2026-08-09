---
layout: page
title: "AuthenticatedMemberID"
description: "Returns the member ID (MID) of the business unit the code runs on. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request gets the child business unit's own MID back, while AuthenticatedEnterpriseID in the same render returns the parent's."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedmemberid/
platforms:
  - engagement
syntax: "AuthenticatedMemberID()"
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
  VAR @memberId
  SET @memberId = AuthenticatedMemberID()
]%%
Business unit: %%=v(@memberId)=%%
```

Renders a short run of digits with no punctuation — on the business unit tested, nine digits.

Because the digits behave as a real number, the value can be matched against a MID you already know without any string juggling, which is the usual way to branch content per business unit:

```html
%%[
  VAR @memberId, @isProductionBu
  SET @memberId = AuthenticatedMemberID()
  SET @isProductionBu = IIf(@memberId == "123456789", "yes", "no")
]%%
%%=v(@isProductionBu)=%%
```

The MID it hands back is the running business unit's, not the account's — see below.

## Return value

**`string`** — a business unit member ID.

The value domain is open: a MID varies per business unit, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary MID back.

## Behaviour

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered a MID at HTTP 200. `Empty()` on the same value answered false and `Length()` gave 9.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical output.

**It is digits, and they are numeric.** `IndexOf` found no dot, no space, no `@` and no dash anywhere in the value, so like `AuthenticatedEnterpriseID` and unlike the email-shaped `Authenticated*` siblings it carries no punctuation at all. `Add()` applied straight to the value returned it incremented by one, so it is a numeric string rather than opaque text.

### It is the business unit's MID, not the account's

The page under test was published on a **child** business unit. The returned value matched that child's own MID exactly, and did **not** match the account's parent (enterprise) MID. Both comparisons ran in the same render against the two real MIDs configured for the account, so the answer is not an artefact of a made-up identifier.

The pairing is what makes it useful: [AuthenticatedEnterpriseID](/engagement/ampscript/functions/authenticatedenterpriseid/), called in the **same render**, came back as the parent MID — a different, shorter digit string. So the two functions answer two different questions. Reach for this one when you want the business unit executing the code, and for the enterprise one when you want the account.

It is also not the employee identifier. [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/) in the same render returned a digit string of the **same length** — nine — yet a direct comparison answered different, and `IndexOf` answered `0`, its not-found result, in **both** directions. Equal length is not equal value; do not treat one as a stand-in for the other.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedmemberid" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages. That authenticated path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose session the returned MID would reflect on a microsite.

## See also

- [Differs from docs: the child MID without a session](/engagement/differs-from-docs/#authenticatedmemberid-child-mid-without-a-session)
- [AuthenticatedEnterpriseID](/engagement/ampscript/functions/authenticatedenterpriseid/)
- [AuthenticatedMemberName](/engagement/ampscript/functions/authenticatedmembername/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-member-id.html) · [ampscript.guide](https://ampscript.guide/authenticatedmemberid/)
