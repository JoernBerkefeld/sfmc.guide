---
layout: page
title: "HTTPPost"
description: "Performs an HTTP POST request and returns the HTTP status code. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fourth argument that receives the response body rather than the status the docs describe."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/httppost/
platforms:
  - engagement
syntax: "HTTPPost(urlEndpoint, contentTypeHeader, contentToPost[, @response, headerName1, headerValue1, ...])"
return_type: number
min_args: 3
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `urlEndpoint` | string | Yes | The URL to post the content to |
| `contentTypeHeader` | string | Yes | The Content-Type header for the request |
| `contentToPost` | string | Yes | The content to send in the POST body |
| `response` | string | No | Output variable that receives the response body |
| `headerName1` | string | No | Name of an additional request header |
| `headerValue1` | string | No | Value of an additional request header |

There is no upper bound on the argument count — additional request headers are passed as repeated name/value pairs after the response variable.

## Example

```ampscript
%%[ VAR @status, @body
  SET @status = HTTPPost("https://postman-echo.com/post", "application/json", '{"marker":"amp-post-zz9","n":7}', @body)
]%%
%%=v(@status)=%%
```

Renders `200`, and `@body` holds the echoed response, e.g. `{"args":{},"data":{"marker":"amp-post-zz9","n":7},…`.

Read the body from the output variable and treat any failure as an aborted page — a non-2xx response never returns a status here:

```ampscript
%%[
  VAR @status, @body
  SET @status = HTTPPost("https://postman-echo.com/post", "application/json", @payload, @body)
]%%
Status %%=v(@status)=%%; response %%=v(@body)=%%
```

## Return value

**`number`** — the HTTP status code of the response, which is `200` on a successful POST. There is no closed set of values to test for a success, and a failing status is never returned: a non-2xx response aborts the page instead.

## Behaviour

**The fourth argument receives the response body, not the status.** The official reference labels it as the request "status", but at runtime it holds the response body — a POST to the echo endpoint filled it with 299 characters of echoed JSON. The numeric HTTP status code is the function's return value instead. See [the differs-from-docs note](/engagement/differs-from-docs/#httppost-response-arg-is-body).

**The content type and body are transmitted verbatim.** The echo endpoint reflected the `application/json` content type and the exact payload back in its `data` field, confirming both were sent as supplied.

**A failing response aborts the whole page.** A POST that answered `404`, and a POST with an empty URL, each aborted the page with HTTP 422 rather than returning a status you could branch on. Because AMPscript has no `try`/`catch`, there is no way to recover from a non-2xx response inline.

{% include test-script.html bundle="ampscript-functions--httppost" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to `OutputLine` renders an empty line. Wrap every marker and label in `Concat(...)` — for example `OutputLine(Concat(\"start\"))` — or the line silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`HTTPPost2`](/engagement/ampscript/functions/httppost2/) — adds response headers as a rowset
- [`HTTPPostWithRetry`](/engagement/ampscript/functions/httppostwithretry/) — adds retry and rescheduling
- [Differs from docs: the response argument holds the body](/engagement/differs-from-docs/#httppost-response-arg-is-body)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-post.html) · [ampscript.guide](https://ampscript.guide/httppost/)
