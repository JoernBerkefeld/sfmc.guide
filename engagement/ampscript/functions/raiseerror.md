---
layout: page
title: "RaiseError"
description: "Raises a runtime error, optionally skipping the current subscriber or returning an API error. Covers that outside a send it is not a graceful abort: the message never reaches the caller and the response is indistinguishable from any other failure."
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
| `skipSubscriber` | string \| boolean \| number | No | Skip only the current subscriber and continue the job, rather than stopping it. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |
| `apiErrorCode` | string | No | Custom API error code |
| `apiErrorNumber` | number | No | Custom API error number |
| `preserveDataExt` | string \| boolean \| number | No | Retain earlier data-extension writes; allowed values: `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

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

**Everything written before the call is discarded.** The response body contains only the fixed failure notice — nothing written before the call reaches the browser.

**Nothing after the call runs.** Nothing written after the call is delivered either.

**The caller never sees the message.** Four separate runs passed four distinct messages and none of them appeared anywhere in the response. Whatever you write there is for the send log, not for the visitor.

**The second argument accepts boolean, numeric and quoted boolean-like forms.** Bare `true`/`false`, numeric `1`/`0` and the quoted spellings are all accepted, and each carries its own message through to the error, so the three types are interchangeable here.

**The fifth argument is constrained to eight boolean-like literal forms.** In catalog order they are boolean `true` and `false`, numeric `1` and `0`, quoted `"true"` and `"false"`, and quoted `"1"` and `"0"`. The numeric and quoted forms each carry their own message through to the error. Note that in an email preview a bare boolean token is parsed as a field reference rather than a literal at this parameter position, so use `1`/`0` or a quoted representation when writing a literal there. The accepted value shapes say nothing about whether earlier data-extension writes are ultimately preserved during a completed send.

### Telling it apart from an unrelated failure

An unrelated call on the same page aborted for a reason with nothing to do with this function — a wrong argument count on a different string function. Its response was byte-for-byte the same: HTTP 422, same body length, same text.

| Run | Status | Body |
|---|---|---|
| A call to this function | 422 | fixed failure notice |
| An unrelated aborting call | 422 | the same fixed failure notice |

So from outside the page the two cannot be distinguished. If you need a visitor-facing error, render your own message and stop the flow with an `IF` branch instead — this function gives the caller nothing to read.

**`skipSubscriber` accepts all eight boolean-like literals.** `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` are all accepted at this parameter position, including the bare boolean tokens. The bare-`true`-as-a-field-reference behaviour that affects `preserveDataExt` does not apply here. The flag's job-control semantics — skip the current subscriber while the job continues — apply during a send and have no effect outside one.

{% include test-script.html bundle="ampscript-functions--raiseerror" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="A bare string literal passed to OutputLine renders an empty line while the page still returns HTTP 200. Wrap every marker in Concat(...), even a single-argument one, or the markers silently vanish and a working block looks like a failure." %}

{% include callout.html type="info" title="Every gate in the script returns HTTP 422" text="That is the expected result here, not a broken page. A plain request without the gate renders at HTTP 200 — read the status code rather than the body." %}

Email Preview proved that the second and fifth arguments accept the forms described above, but it cannot show the completed-send outcome: stopping an email job, skipping a single subscriber while the job continues, or whether earlier data-extension writes are retained. Those effects require a real send that reaches completion and were not exercised here. The official reference describes send behaviour and makes no landing-page claim, so the CloudPage abort above is undocumented territory rather than a contradiction.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Redirect](/engagement/ampscript/functions/redirect/) — the other page-terminating Utility function, which ends the request with a 302 instead
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-raise-error.html)
- [ampscript.guide](https://ampscript.guide/raiseerror/)
