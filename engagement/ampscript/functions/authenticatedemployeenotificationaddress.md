---
layout: page
title: "AuthenticatedEmployeeNotificationAddress"
description: "Returns the notification email address of the Marketing Cloud user tied to the current context. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request gets a real mailbox address back, and it is not the same string as the similarly email-shaped username."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedemployeenotificationaddress/
platforms:
  - engagement
syntax: "AuthenticatedEmployeeNotificationAddress()"
return_type: string
min_args: 0
max_args: 0
verification: verified
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

This function takes no parameters.

## Example

```html
%%[
  VAR @notifyAddress
  SET @notifyAddress = AuthenticatedEmployeeNotificationAddress()
]%%
Notify: %%=v(@notifyAddress)=%%
```

Renders an ordinary email address — on the business unit tested, a dotted local part, an `@`, then a registered corporate mail domain.

Because the value is a real, deliverable mailbox belonging to an account user, keep it out of anything a visitor can see and use it only where an internal address is wanted:

```html
%%[
  VAR @notifyAddress, @isUsable
  SET @notifyAddress = AuthenticatedEmployeeNotificationAddress()
  SET @isUsable = IsEmailAddress(@notifyAddress)
]%%
%%=v(@isUsable)=%%
```

What it does **not** support is a sign-in check, and it is not interchangeable with the username — see below.

## Return value

**`string`** — a notification email address.

The value domain is open: an address is account-scoped free text, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary address back.

## Behaviour

{% include callout.html type="warning" title="This contradicts the official documentation" content="The official reference scopes this function to microsites with sender authenticated redirection and says it is not for use with CloudPages. At runtime a public, anonymous CloudPage request rendered a real notification address anyway." %}

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered an email address at HTTP 200. `Empty()` on the same value answered false and `Length()` gave 29.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical output.

### It is a real address, and it is not the username

`IndexOf` found a single `@` after a 16-character local part, a `.` earlier inside that local part, and no space anywhere; `IsEmailAddress()` accepted the whole value. Unlike its sibling, the part after the `@` is an ordinary registered mail domain, so treat the result as a deliverable mailbox and as account-identifying data.

The tempting assumption is that this returns the same string as [AuthenticatedEmployeeUserName](/engagement/ampscript/functions/authenticatedemployeeusername/), which is itself email-shaped. Called in the same render, the two compared as **not equal**: the address measured 29 characters against the username's 39, because the username carries a longer account-scoped suffix that is not a mail domain. It is equally unrelated to [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/) — the values differ, the ID is 9 characters, and `IndexOf` of the ID inside the address answered `0`, its not-found result. Call whichever of the three you actually need; none substitutes for another.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedemployeenotificationaddress" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages — a scoping contradicted by the observed behaviour, since a public CloudPage rendered a value regardless (see the [differs-from-docs card](/engagement/differs-from-docs/#authenticatedemployeenotificationaddress-value-without-a-session)). The authenticated microsite path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose identity the returned address represents.

## See also

- [Differs from docs: a real mailbox without a session](/engagement/differs-from-docs/#authenticatedemployeenotificationaddress-value-without-a-session)
- [AuthenticatedEmployeeUserName](/engagement/ampscript/functions/authenticatedemployeeusername/)
- [AuthenticatedEmployeeID](/engagement/ampscript/functions/authenticatedemployeeid/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-employee-notification-address.html) · [ampscript.guide](https://ampscript.guide/authenticatedemployeenotificationaddress/)
