---
layout: page
title: "HTTPGet"
description: "Performs an HTTP GET request and returns the response body. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the status output variable that reports 0 on success and -2 on a failed request."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/httpget/
platforms:
  - engagement
syntax: "HTTPGet(httpGetUrl[, continueOnError, emptyContentHandling, status])"
return_type: string
min_args: 1
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `httpGetUrl` | string | Yes | The URL to fetch with the GET method |
| `continueOnError` | boolean | No | When true, an error is ignored instead of stopping the process |
| `emptyContentHandling` | number | No | How empty content is handled: 0 allows it, 1 returns an error, 2 skips the subscriber in a send |
| `status` | number | No | Output variable that receives the status: 0 success, -1 not found, -2 request error, -3 empty content |

## Example

```ampscript
%%[ VAR @body SET @body = HTTPGet("https://sfmc.guide/robots.txt") ]%%
%%=v(@body)=%%
```

Renders the target's body text, e.g. a line beginning `Sitemap: https://sfmc.gui…`.

Pass a status output variable and guard on it before using the body:

```ampscript
%%[
  VAR @body, @status
  SET @body = HTTPGet("https://sfmc.guide/robots.txt", true, 0, @status)
  IF @status == 0 THEN
]%%
%%=v(@body)=%%
%%[ ELSE ]%%
The content isn't available right now.
%%[ ENDIF ]%%
```

## Return value

**`string`** — the body of the HTTP response as text. The body is arbitrary, so there is no closed set of values to test for. The numeric status is not the return value; it is delivered separately through the fourth output-variable argument.

## Behaviour

**The return is the response body, and the status is a separate output variable.** A successful GET returns the body string; the fourth argument, when supplied, is a variable that receives the numeric status — `0` on success. This differs from the SSJS `Platform.Function.HTTPGet`, whose status array came back empty in the same context.

**A failed request returns empty and sets the status to -2.** Fetching a URL that 404s, or a host that does not resolve, with `continueOnError` set to true returns the empty string and puts `-2` into the status variable, rather than aborting the page.

**The empty-content and error options are accepted from a CloudPage.** `emptyContentHandling` accepts `0` and `continueOnError` accepts `true`/`false` without error. Their send-context effects — ending a send on error, skipping a subscriber on empty content — govern email and automation runs and cannot be observed from a CloudPage request.

{% include test-script.html bundle="ampscript-functions--httpget" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to `OutputLine` renders an empty line. Wrap every marker and label in `Concat(...)` — for example `OutputLine(Concat(\"start\"))` — or the line silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`HTTPRequestHeader`](/engagement/ampscript/functions/httprequestheader/) — other HTTP functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-get.html) · [ampscript.guide](https://ampscript.guide/httpget/)
