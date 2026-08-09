---
layout: page
title: "AuthenticatedMemberName"
description: "Returns the display name of the business unit the code runs on. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a public, anonymous request gets the business unit's UI display name back, which is neither a person nor the name your tooling configuration uses."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/authenticatedmembername/
platforms:
  - engagement
syntax: "AuthenticatedMemberName()"
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
  VAR @memberName
  SET @memberName = AuthenticatedMemberName()
]%%
Business unit: %%=v(@memberName)=%%
```

Renders the business unit's display name as shown in the Marketing Cloud UI — on the business unit tested, a nineteen-character label containing a space and a punctuation separator.

Because the value is free text an administrator can change, it is safer as something you show than as something you branch on. When it is shown, it is worth guarding against an unexpected empty result:

```html
%%[
  VAR @memberName, @label
  SET @memberName = AuthenticatedMemberName()
  SET @label = IIf(Empty(@memberName), "this business unit", @memberName)
]%%
Sent from %%=v(@label)=%%
```

The name it hands back is the UI label, not the identifier your deployment configuration uses — see below.

## Return value

**`string`** — a business unit display name.

The value domain is open: the name is free text chosen per business unit, so there is no closed set of sentinel values to test for. In particular there is no "not signed in" sentinel — an unauthenticated request gets an ordinary name back.

## Behaviour

**A public CloudPage request gets a value, not an empty result.** An anonymous request to the published URL, carrying no Marketing Cloud session at all, rendered a name at HTTP 200. `Empty()` on the same value answered false and `Length()` gave 19.

**The result is a value, not a page-terminating call.** It compared against the empty string, rendered inline without a variable, and rendered unchanged nested inside a `Concat` between two surrounding characters. Every line after the call still rendered.

**The value is stable inside one render.** Three separate calls in the same request — an assignment, an inline call and a nested call — produced identical output.

**It is free text, not an identifier.** `IndexOf` found a space partway through the value, and found no dot, no `@` and no underscore anywhere. `IsEmailAddress()` rejected it. So unlike the email-shaped `Authenticated*` siblings and unlike the digits-only ID siblings, this value is human-readable prose with internal whitespace — quote or escape it like any other free text before using it as a key.

### It is the business unit's display name, not its configuration name

The page under test was published on a **child** business unit, and what came back was that business unit's label as shown in the Marketing Cloud UI.

That label is **not** the name your tooling uses. Compared in the same render against the business unit name held in the account's deployment configuration, a direct equality comparison answered **no**, and `IndexOf` answered `0` — its not-found result — in **both** directions. The two forms are recognisably the same business unit written differently: the UI label separates its words with spaces and punctuation where the configuration name uses underscores. A page that string-matches this value against a configured name will therefore silently never match.

If you need to branch per business unit, match on [AuthenticatedMemberID](/engagement/ampscript/functions/authenticatedmemberid/) instead — a MID is stable and exact, where a display name is free text an administrator can edit at any time.

### It is not a person

[AuthenticatedEmployeeUserName](/engagement/ampscript/functions/authenticatedemployeeusername/), called in the **same render**, returned a completely different string — 39 characters against this function's 19, email-shaped where this one has no `@` at all — and `IndexOf` answered `0` in both directions, so neither value occurs inside the other. Despite the shared `Authenticated` prefix, one names a business unit and the other names a login.

### Do not use it as an authentication check

Because a value always comes back, a page cannot infer from a non-empty result that its visitor is a signed-in Marketing Cloud user. Content gated on that check would be open to everyone. Use a real authentication mechanism for the gate and treat this function as context information only.

{% include test-script.html bundle="ampscript-functions--authenticatedmembername" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference scopes this function to microsites using sender authenticated redirection and states it is not for CloudPages. That authenticated path was **not** exercised here — a public CloudPage cannot supply such a session — so everything on this page describes the unauthenticated CloudPage context only, and no claim is made about whose session the returned name would reflect on a microsite.

## See also

- [Differs from docs: the business unit name without a session](/engagement/differs-from-docs/#authenticatedmembername-business-unit-name-without-a-session)
- [AuthenticatedMemberID](/engagement/ampscript/functions/authenticatedmemberid/)
- [AuthenticatedEmployeeUserName](/engagement/ampscript/functions/authenticatedemployeeusername/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-authenticated-member-name.html) · [ampscript.guide](https://ampscript.guide/authenticatedmembername/)
