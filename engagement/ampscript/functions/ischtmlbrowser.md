---
layout: page
title: "IsCHTMLBrowser"
description: "Tests a user agent string for a compact HTML feature-phone browser. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the true path, which two feature-phone agent families still produce, while the empty string aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/ischtmlbrowser/
platforms:
  - engagement
syntax: "IsCHTMLBrowser(userAgent)"
return_type: boolean
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
| `userAgent` | string | Yes | User agent string to test, typically the request's own user-agent header |

## Example

```html
%%[ VAR @chtml SET @chtml = IsCHTMLBrowser("DoCoMo/2.0 N905i(c100;TB;W24H16)") ]%%
%%=v(@chtml)=%%
```

Renders `True`.

Testing the actual visitor means reading the request header into a variable first, then passing that variable:

```html
%%[
  VAR @ua, @chtml
  SET @ua = HTTPRequestHeader("user-agent")
  SET @chtml = IsCHTMLBrowser(@ua)
]%%
%%=IIf(@chtml, "compact markup", "full markup")=%%
```

Reading the header inline as the argument aborts the page, and so does an empty value — see below.

## Return value

**`boolean`** — `True` when the string is a compact HTML browser agent, `False` otherwise.

Both literals were produced in the same render, as the capitalised words `True` and `False`. They are genuine booleans: each compares equal to the corresponding boolean value.

## Behaviour

**It really inspects the string, on an ordinary page request.** In a single response two feature-phone agents returned `True` and three other strings returned `False`, so this is not a function that answers the same way regardless of input.

**Two unrelated agent families are recognised.** A DoCoMo i-mode agent and a KDDI handset agent both return `True` despite having nothing textually in common, so the check knows agent families rather than one hard-coded string.

**The word does not trigger it.** `IsCHTMLBrowser("chtml")` returns `False`, while agents that never contain that word return `True`.

**The request's own user agent decides the live result.** The same deployed page, fetched twice without redeploying, returned `False` with a desktop `User-Agent` header and `True` with a feature-phone one.

**A number is harmless.** `IsCHTMLBrowser(0)` returns `False`.

### The empty string aborts the page

Passing an empty value is the one input in this family that is not survivable: the request fails with HTTP 422 and everything the page had already rendered is discarded. The sibling checks [IsEmailAddress](/engagement/ampscript/functions/isemailaddress/), [IsPhoneNumber](/engagement/ampscript/functions/isphonenumber/) and [Domain](/engagement/ampscript/functions/domain/) all answer normally for the same input, so this is specific to this function. Two shapes reach it in practice — a literal empty string, and a request that sends no user-agent header at all, which leaves `HTTPRequestHeader("user-agent")` empty. Guard the value before calling:

```html
%%[
  VAR @ua, @chtml
  SET @ua = HTTPRequestHeader("user-agent")
  SET @chtml = false
  IF NOT Empty(@ua) THEN
    SET @chtml = IsCHTMLBrowser(@ua)
  ENDIF
]%%
```

{% include test-script.html bundle="ampscript-functions--ischtmlbrowser" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

{% include callout.html type="info" title="Fetch the live branch twice" content="The <code>?b=live</code> branch only demonstrates anything if you request it twice with two different <code>User-Agent</code> headers. Requesting it with no <code>User-Agent</code> header at all aborts that branch, which is the empty-value case rather than a fault in the script." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Empty](/engagement/ampscript/functions/empty/) — how to guard the user agent value before calling
- [IsEmailAddress](/engagement/ampscript/functions/isemailaddress/) — a sibling Utility predicate that tolerates the empty string
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-is-chtml-browser.html) · [ampscript.guide](https://ampscript.guide/ischtmlbrowser/)
