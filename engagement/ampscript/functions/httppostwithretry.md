---
layout: page
title: "HTTPPostWithRetry"
description: "Posts content to a URL with automatic retry logic and returns the HTTP status code. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the responseStatus argument that holds the response body rather than the status the docs describe."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/httppostwithretry/
platforms:
  - engagement
syntax: "HTTPPostWithRetry(urlEndpoint, contentTypeHeader, content[, numRetries, reschedule, returnExceptionOnError, @responseStatus, @responseContentRowset, headerName1, headerValue1, ...])"
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
| `content` | string | Yes | The content to send in the POST body |
| `numRetries` | number | No | How many times the request can be retried (default 3) |
| `reschedule` | boolean | No | When true, retry after 15 minutes if all retries fail (default false) |
| `returnExceptionOnError` | boolean | No | When true, raise an exception on failure; when false, continue after an error |
| `responseStatus` | string | No | Output variable that receives the response body |
| `responseContentRowset` | rowset | No | Output variable that receives the response headers as a rowset |
| `headerName1` | string | No | Name of an additional request header |
| `headerValue1` | string | No | Value of an additional request header |

There is no upper bound on the argument count — additional request headers are passed as repeated name/value pairs after the rowset variable.

## Example

```ampscript
%%[ VAR @status, @body, @headers
  SET @status = HTTPPostWithRetry("https://postman-echo.com/post", "application/json", '{"marker":"amp-retry-xx7"}', 2, false, true, @body, @headers)
]%%
%%=v(@status)=%%
```

Renders `200`; `@body` holds the echoed response and `@headers` is a rowset of the response headers.

Lower the retry count and let the function raise on a persistent failure:

```ampscript
%%[
  VAR @status, @body, @headers
  SET @status = HTTPPostWithRetry("https://postman-echo.com/post", "application/json", @payload, 2, false, true, @body, @headers)
]%%
Status %%=v(@status)=%%; header rows %%=v(RowCount(@headers))=%%
```

## Return value

**`number`** — the HTTP status code of the response, which is `200` on a successful POST. There is no closed set of values to test for a success.

## Behaviour

**The responseStatus argument holds the body, and a separate rowset holds the headers.** The official reference labels the argument as storing the request "status", but at runtime it receives the response body (289 characters of echoed JSON) while `responseContentRowset` receives the response headers as a rowset — 11 header rows in the proof. The layout matches [`HTTPPost2`](/engagement/ampscript/functions/httppost2/). See [the differs-from-docs note](/engagement/differs-from-docs/#httppostwithretry-response-arg-is-body).

**The retry controls are accepted at runtime.** `numRetries`, `reschedule` and `returnExceptionOnError` were all accepted (`2`, `false`, `true` in the proof) and the successful call returned `200`. Retry-on-failure itself is documented but cannot be observed against a healthy endpoint, so a probe confirms only that the arguments are accepted and a normal POST succeeds.

**The HTTP status code is the return value.** As with the other POST functions, the numeric status comes back as the function's own return value, not through an output variable.

{% include test-script.html bundle="ampscript-functions--httppostwithretry" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to `OutputLine` renders an empty line. Wrap every marker and label in `Concat(...)` — for example `OutputLine(Concat(\"start\"))` — or the line silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`HTTPPost2`](/engagement/ampscript/functions/httppost2/) — the same body/headers split without retry
- [`HTTPPost`](/engagement/ampscript/functions/httppost/) — the simplest POST
- [Differs from docs: the responseStatus argument holds the body](/engagement/differs-from-docs/#httppostwithretry-response-arg-is-body)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-post-with-retry.html) · [ampscript.guide](https://ampscript.guide/httppostwithretry/)
