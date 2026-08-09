---
layout: page
title: "RequestParameter"
description: "Returns the value of a form post or query string parameter from the current request. Runtime-proven on a live Marketing Cloud Engagement CloudPage — names ignore case, values arrive decoded and unescaped, and a parameter supplied twice comes back comma-joined."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/requestparameter/
platforms:
  - engagement
syntax: "RequestParameter(parameterName)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `parameterName` | string | Yes | Parameter name, matched without regard to case |

## Example

```html
%%[
  VAR @name
  SET @name = RequestParameter("p")
]%%
Hello, %%=v(@name)=%%
```

Requested with `?p=hello`, this renders `Hello, hello`.

A missing parameter is an empty string rather than a failure, so guard it where the page needs a value:

```html
%%[
  VAR @id
  SET @id = RequestParameter("id")
  IF Empty(@id) THEN
    SET @id = "unknown"
  ENDIF
]%%
```

The value arrives exactly as the caller sent it — escape it yourself before rendering it into markup, see below.

## Return value

**`string`** — the decoded value of the named parameter, or an empty string when the request carries no such parameter.

The value domain is open, so there is no closed set of sentinel values to test for. The empty result is a real empty string: `Length()` on it answers `0` and `Empty()` answers true, in the same request that returns HTTP 200.

## Behaviour

**The name is matched without regard to case.** A request carrying `?Foo=1` answers `1` for `RequestParameter("foo")`, `RequestParameter("FOO")` and `RequestParameter("Foo")` alike.

**Percent-encoded characters arrive decoded.** `?sp=a%20b` gives `a b` at length `3`, `?am=a%26b` gives `a&b` at length `3`, `?pc=100%25` gives `100%`, and a plus sign in `?pl=a+b` also gives `a b`.

**A parameter supplied twice is joined, not resolved.** `?x=1&x=2` returns the single string `1,2` at length `3` — neither `1` nor `2` wins. Code expecting a scalar silently receives a list.

**An absent parameter is empty at HTTP 200.** Nothing aborts, and `Empty()` on the same call answers true.

**A platform-supplied name is readable, and is not protected.** `RequestParameter("PAGEURL")` returned the full published page URL including its query string although the request set no such parameter — and `?PAGEURL=zzz` then made the same call return `zzz`. Other platform names tried (`PAGENAME`, `MID`, `JobID`, `subscriberkey`) were empty on a CloudPage.

**An empty name and a numeric name are accepted** and always answer empty, without aborting. A number is not an alternative form of a parameter name, so the parameter type stays `string`.

### The value is returned raw

Nothing is escaped on the way out: whatever characters the caller put in the query string come back verbatim, including `&`, `%` and angle brackets. Any value destined for markup, a URL or a script context must be escaped by the caller — this function performs no escaping of its own.

One request-level limit worth knowing while testing: a URL whose value contains a percent-encoded HTML tag, such as `?ht=%3Cb%3Ex%3C%2Fb%3E`, is rejected with HTTP 422 before any AMPscript runs. The same URL fails even against a block that reads no such parameter, so it is a property of the request, not of this function.

### Compared with QueryParameter and v

On a GET CloudPage, reading the same parameter with this function and with [`QueryParameter`](/engagement/ampscript/functions/queryparameter/) gives identical strings of identical length in every case above, and an in-page equality check answers the same. [`v`](/engagement/ampscript/functions/v/) is a different thing entirely — it outputs a value it is handed, it does not read the request.

{% include test-script.html bundle="ampscript-functions--requestparameter" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

The bundled harness is shared by all three functions and is driven entirely by the query string, so one deploy covers every case — a POST body is not exercised, so the form-post path the official reference describes is untested here.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [QueryParameter](/engagement/ampscript/functions/queryparameter/) — the same function on a GET
- [v](/engagement/ampscript/functions/v/) — outputs a value inline
- [Differs from docs: case, duplicates and raw values](/engagement/differs-from-docs/#requestparameter-case-duplicates-and-raw-values)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-request-parameter.html) · [ampscript.guide](https://ampscript.guide/requestparameter/)
