---
layout: page
title: "RaiseError"
description: "Raises a runtime error, optionally skipping the current subscriber or returning an API error. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that outside a send it is not a graceful abort: the message never reaches the caller and the response is indistinguishable from any other failure."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/raiseerror/
platforms:
  - engagement
  - next
syntax: "RaiseError(message[, skipSubscriber, apiErrorCode, apiErrorNumber, preserveDataExt])"
return_type: void
min_args: 1
max_args: 5
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Error message |
| `skipSubscriber` | string \| boolean \| number | No | Skip only the current subscriber and continue the job, rather than stopping it |
| `apiErrorCode` | string | No | Custom API error code |
| `apiErrorNumber` | number | No | Custom API error number |
| `preserveDataExt` | boolean | No | Retain data extension writes made before the error, even when the subscriber is skipped |

## Example

```html
%%[
  VAR @code
  SET @code = QueryParameter("code")
  IF Empty(@code) THEN
    RaiseError("No code supplied")
  ENDIF
]%%
```

Renders nothing at all when the guard fires: the request ends with HTTP 422 and a fixed failure notice, and the supplied text appears nowhere in it.

The realistic pattern is to raise inside a send, where the second argument decides whether the job stops or only the current subscriber is skipped.

```html
%%[
  VAR @rows
  SET @rows = LookupRows("Coupons", "Status", "free")
  IF RowCount(@rows) == 0 THEN
    RaiseError("No coupon left for this subscriber", true)
  ENDIF
]%%
```

On a landing page that second argument changes nothing you can observe — see below.

## Return value

**`void`** — nothing is returned. On a landing page the request is abandoned and the body is replaced by a fixed failure notice rather than the message you passed.

There is no closed set of sentinel values to test for; the function answers with an aborted request rather than a value.

## Behaviour

**It is not a graceful abort on a landing page.** The request ends with HTTP 422 and the response body is a short fixed failure notice. That is the same status and the same body every other aborting AMPscript call produces.

**Everything written before the call is discarded.** Two marker lines written immediately before the call, the surrounding block's own start marker, and even a control line written at the very top of the page — one that renders on every other request — were all missing from the response. Nothing that ran earlier reaches the browser.

**Nothing after the call runs.** The marker line placed after the call and the block's closing marker were both absent.

**The caller never sees the message.** Four separate runs passed four distinct messages and none of them appeared anywhere in the response. Whatever you write there is for the send log, not for the visitor.

**The second argument accepts three spellings interchangeably.** Unquoted `true`, unquoted `false`, the numbers `1` and `0`, and the quoted `"true"` were each run in isolation and all five produced the identical response. That is why the type is written as three alternatives rather than as a boolean.

### Telling it apart from an unrelated failure

A control run in the same deployment aborted for a reason with nothing to do with this function — a wrong argument count on an unrelated string function. Its response was byte-for-byte the same: HTTP 422, same body length, same text.

| Run | Status | Body |
|---|---|---|
| A call to this function | 422 | fixed failure notice |
| An unrelated aborting call | 422 | the same fixed failure notice |

So from outside the page the two cannot be distinguished. If you need a visitor-facing error, render your own message and stop the flow with an `IF` branch instead — this function gives the caller nothing to read.

{% include test-script.html bundle="ampscript-functions--raiseerror" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to OutputLine renders an empty line while the page still returns HTTP 200. Wrap every marker in Concat(...), even a single-argument one, or the markers silently vanish and a working block looks like a failure." %}

{% include callout.html type="info" title="Every gate in the script returns HTTP 422" text="That is the expected result here, not a broken deployment. The ungated control line renders at HTTP 200 on a plain request and proves the page itself is healthy — read the status code rather than the body." %}

What a page cannot show is the documented purpose: stopping an email job, skipping a single subscriber while the job continues, and the fate of the API error code and number. All of those are properties of a send and were not exercised here. The official reference describes only send behaviour and makes no landing-page claim, so the abort above is undocumented territory rather than a contradiction.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Redirect](/engagement/ampscript/functions/redirect/) — the other page-terminating Utility function, which ends the request with a 302 instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-raise-error.html) · [ampscript.guide](https://ampscript.guide/raiseerror/)
