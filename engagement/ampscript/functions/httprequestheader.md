---
layout: page
title: "HTTPRequestHeader"
description: "Returns the value of a specified HTTP request header from the inbound request. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that custom headers are returned even though the docs restrict it to standard headers."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/httprequestheader/
platforms:
  - engagement
syntax: "HTTPRequestHeader(headerToRetrieve)"
return_type: string
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
| `headerToRetrieve` | string | Yes | The name of the request header to read |

## Example

```ampscript
%%[ VAR @ua SET @ua = HTTPRequestHeader("User-Agent") ]%%
%%=v(@ua)=%%
```

Renders the value of the caller's `User-Agent` header, e.g. `AmpProbe/1.0` for a request that set it.

Read a header and fall back when it is absent:

```ampscript
%%[
  VAR @ref
  SET @ref = HTTPRequestHeader("Referer")
  IF Empty(@ref) THEN
    SET @ref = "(direct visit)"
  ENDIF
]%%
Referrer: %%=v(@ref)=%%
```

## Return value

**`string`** — the value of the named request header, or the empty string when the request carried no such header. The value is arbitrary text, so there is no closed set of values to test for.

## Behaviour

**A present header returns its value; an absent header returns empty.** A request whose `User-Agent` was set returned that exact string, and `Host` returned the CloudPage publish host. A `Referer` header that was not sent returned the empty string and `Empty()` reported true.

**Custom headers are returned too, despite the documented restriction.** The official reference says only the standard RFC 7231 headers can be retrieved, but a request sent with a custom `X-Amp-Probe` header returned that value verbatim — the restriction is not enforced at read time. See [Differs from official docs](/engagement/differs-from-docs/#httprequestheader-custom-headers-returned).

{% include test-script.html bundle="ampscript-functions--httprequestheader" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to `OutputLine` renders an empty line. Wrap every marker and label in `Concat(...)` — for example `OutputLine(Concat(\"start\"))` — or the line silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`HTTPGet`](/engagement/ampscript/functions/httpget/) — other HTTP functions
- [Differs from official docs](/engagement/differs-from-docs/#httprequestheader-custom-headers-returned) — custom headers are readable
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-request-header.html) · [ampscript.guide](https://ampscript.guide/httprequestheader/)
