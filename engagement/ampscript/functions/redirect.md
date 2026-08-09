---
layout: page
title: "Redirect"
description: "Ends the request with an HTTP redirect to the supplied address. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a real 302 with the value passed straight into the Location header, and nothing like the similarly named RedirectTo."
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
differs_from_docs: false
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

**A genuine HTTP 302.** Fetched with automatic redirect following switched off, the response line is `302 Found` and the `Location` header holds the supplied address character for character, ampersand included. No rewriting, no tracking wrapper.

**Everything written before the call is discarded.** Marker lines written immediately before the call — and a control line at the very top of the page that renders on every other request — were all absent from the response body. The body is only the short generated redirect notice.

**Nothing after the call runs.** The marker placed after the call never appeared.

**The value is not validated as a URL.** A bare number is accepted and lands in `Location` as a relative path. An empty argument is the one input that is not usable: it aborts the request with HTTP 422 instead of redirecting.

**Exactly one argument.** A zero-argument call and a two-argument call each abort the request with HTTP 422, while every other branch of the same deployment still answered 302.

### How this differs from RedirectTo

Both were pointed at the same address in the same deployment and fetched the same way. They have nothing in common beyond the name:

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

Landing pages are the only context: the function has nothing to act on in an email, and that case was not exercised here.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [RedirectTo](/engagement/ampscript/functions/redirectto/) — the confusingly similar name that emits no redirect at all
- [RaiseError](/engagement/ampscript/functions/raiseerror/) — the other page-terminating Utility function, which ends the request with a failure instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-redirect.html) · [ampscript.guide](https://ampscript.guide/redirect/)
