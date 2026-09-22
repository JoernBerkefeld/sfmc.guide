---
layout: page
title: "Redirect"
description: "Ends the request with an HTTP redirect to the supplied address. Covers that it is a real 302 with the value passed straight into the Location header, and nothing like the similarly named RedirectTo."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/redirect/
platforms:
  - engagement
syntax: "Redirect(url)"
return_type: void
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
| `url` | string \| number | Yes | Target URL |

## Example

```html
%%[
  VAR @id
  SET @id = QueryParameter("id")
  IF Empty(@id) THEN
    Redirect("https://example.com/pick-a-product")
  ENDIF
]%%
<p>Product %%=v(@id)=%%</p>
```

When the guard fires the visitor's browser receives an HTTP 302 pointing at the fallback address and the paragraph is never sent. When it does not fire the page renders as usual.

The address is handed on untouched, query string and all:

```html
%%[ Redirect("https://example.com/offer?a=1&b=2") ]%%
```

The `Location` header of the response carries exactly `https://example.com/offer?a=1&b=2`.

## Return value

**`void`** — nothing is returned. The whole response is replaced by a short server-generated redirect body; there is no value to assign or print.

## Behaviour

**A genuine HTTP 302.** The response line is `302 Found` and the `Location` header holds the supplied address character for character, ampersand included. No rewriting, no tracking wrapper.

**Everything written before the call is discarded.** The response body is only the short generated redirect notice — nothing written before the call appears in it.

**Nothing after the call runs.** Nothing written after the call is delivered either.

**The value is not validated as a URL.** A bare number is accepted and lands in `Location` as a relative path. An empty argument is the one input that is not usable: it aborts the request with HTTP 422 instead of redirecting.

### How this differs from RedirectTo

Despite the similar name, they have nothing in common:

| | Redirect | RedirectTo |
|---|---|---|
| Status | 302 | 200 |
| `Location` header | the supplied address | none |
| Body | short generated redirect notice | the page, rendered normally |
| Output written before it | discarded | delivered |
| Code after it | not reached | runs |
| Returns | nothing | the supplied address |

So they are trivially distinguishable from outside. If you want a visitor moved to another address, this is the function; `RedirectTo` only marks a URL for click tracking inside a send.

{% include test-script.html bundle="ampscript-functions--redirect" chapter="behaviour" %}

{% include callout.html type="warning" title="Fetch with redirect following disabled" text="Any HTTP client that follows redirects automatically will show you the target page at HTTP 200 and hide both the 302 and the Location header, which makes this function look like RedirectTo. Switch following off before drawing conclusions." %}

### Email/send context: rejected in sendable content

Landing pages are the only context. Used in sendable email content, an isolated `%%[ Redirect("https://sfmc.guide/robots.txt") ]%%` is rejected with HTTP 400, errorcode 10005: *"Redirect Function is not valid in content. This function is only allowed in content with an HTTP context."* A sendable email has no HTTP response to redirect, so `Redirect` cannot be used there — use it only on CloudPages / landing pages. (By contrast, `RedirectTo` is *not* rejected in email content: it renders as a no-op, since it emits no redirect at all.)

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [RedirectTo](/engagement/ampscript/functions/redirectto/) — the confusingly similar name that emits no redirect at all
- [RaiseError](/engagement/ampscript/functions/raiseerror/) — the other page-terminating Utility function, which ends the request with a failure instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-redirect.html)
- [ampscript.guide](https://ampscript.guide/redirect/)
