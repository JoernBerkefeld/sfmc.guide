---
layout: page
title: "HTTPPost2"
description: "Performs an HTTP POST and returns the HTTP status code, exposing the response body and headers. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the response argument that holds the body while a separate rowset argument holds the headers."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/httppost2/
platforms:
  - engagement
syntax: "HTTPPost2(url, contentType, contentToPost[, exceptionOnError, @response, @responseRowSet, headerName1, headerValue1, ...])"
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
| `url` | string | Yes | The URL to post the content to |
| `contentType` | string | Yes | The Content-Type header for the request |
| `contentToPost` | string | Yes | The content to send in the POST body |
| `exceptionOnError` | boolean | No | When true, raise an exception on failure; when false, continue after an error |
| `response` | string | No | Output variable that receives the response body |
| `responseRowSet` | string | No | Output variable that receives the response headers as a rowset |
| `headerName1` | string | No | Name of an additional request header |
| `headerValue1` | string | No | Value of an additional request header |

There is no upper bound on the argument count — additional request headers are passed as repeated name/value pairs after the rowset variable.

## Example

```ampscript
%%[ VAR @status, @body, @headers
  SET @status = HTTPPost2("https://postman-echo.com/post", "application/json", '{"marker":"amp-post2-yy8"}', true, @body, @headers)
]%%
%%=v(@status)=%%
```

Renders `200`; `@body` holds the echoed response and `@headers` is a rowset of the response headers.

Read a single response header from the rowset by row:

```ampscript
%%[
  VAR @status, @body, @headers
  SET @status = HTTPPost2("https://postman-echo.com/post", "application/json", @payload, true, @body, @headers)
]%%
Header rows: %%=v(RowCount(@headers))=%%
```

## Return value

**`number`** — the HTTP status code of the response, which is `200` on a successful POST. There is no closed set of values to test for a success.

## Behaviour

**The response argument holds the body, and a separate rowset holds the headers.** The official reference labels the fifth argument as the request "status", but at runtime it receives the response body (289 characters of echoed JSON) while the sixth argument receives the response headers as a rowset — 11 header rows in the proof. This body/headers split is what HTTPPost2 adds over plain [`HTTPPost`](/engagement/ampscript/functions/httppost/). See [the differs-from-docs note](/engagement/differs-from-docs/#httppost2-response-arg-is-body).

**The exception-on-error flag is accepted.** Passing `true` at the fourth position was accepted and the successful call returned `200`.

**The HTTP status code is the return value.** As with `HTTPPost`, the numeric status comes back as the function's own return value, not through an output variable.

{% include test-script.html bundle="ampscript-functions--httppost2" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to `OutputLine` renders an empty line. Wrap every marker and label in `Concat(...)` — for example `OutputLine(Concat(\"start\"))` — or the line silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`HTTPPost`](/engagement/ampscript/functions/httppost/) — the simpler POST without the header rowset
- [`HTTPPostWithRetry`](/engagement/ampscript/functions/httppostwithretry/) — adds retry and rescheduling
- [Differs from docs: the response argument holds the body](/engagement/differs-from-docs/#httppost2-response-arg-is-body)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-post2.html) · [ampscript.guide](https://ampscript.guide/httppost2/)
