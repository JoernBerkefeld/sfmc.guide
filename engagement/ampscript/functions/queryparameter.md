---
layout: page
title: "QueryParameter"
description: "Returns the value of a URL query string parameter from the current page request. Runtime-proven on a live Marketing Cloud Engagement CloudPage — indistinguishable from RequestParameter on a GET, and with no optional second argument despite what the one-argument signature invites you to try."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/queryparameter/
platforms:
  - engagement
syntax: "QueryParameter(parameterName)"
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
| `parameterName` | string | Yes | Query parameter name, matched without regard to case |

## Example

```html
%%[
  VAR @source
  SET @source = QueryParameter("p")
]%%
Source: %%=v(@source)=%%
```

Requested with `?p=hello`, this renders `Source: hello`.

Because a missing parameter is an empty string rather than a failure, a default is a two-line guard:

```html
%%[
  VAR @source
  SET @source = QueryParameter("utm_source")
  IF Empty(@source) THEN
    SET @source = "direct"
  ENDIF
]%%
```

## Return value

**`string`** — the decoded value of the named query-string parameter, or an empty string when the request carries no such parameter.

The value domain is open, so there is no closed set of tokens to test for. An absent parameter answers a real empty string: `Empty()` on the same call answers true at HTTP 200.

## Behaviour

**The name is matched without regard to case.** With `?Foo=1` in the URL, `QueryParameter("foo")`, `QueryParameter("FOO")` and `QueryParameter("Foo")` each answered `1`.

**Percent-encoded characters arrive decoded.** `?sp=a%20b` gives `a b`, `?am=a%26b` gives `a&b`, `?pc=100%25` gives `100%`, and `?pl=a+b` gives `a b`.

**A parameter supplied twice is comma-joined.** `?x=1&x=2` returns `1,2` as one string.

**A platform-supplied name is readable.** `QueryParameter("PAGEURL")` returned the full published page URL although the request never set it, and a caller-supplied `?PAGEURL=zzz` then overrode it.

**An empty name and a numeric name are accepted** and always answer empty without aborting, so the parameter type stays `string`.

**The value is returned unescaped**, exactly as the caller supplied it. Escape it yourself before rendering it into markup — see [RequestParameter](/engagement/ampscript/functions/requestparameter/#the-value-is-returned-raw).

### There is no optional second argument

A second argument aborts the call with HTTP 422. All three spellings that other AMPscript flag parameters accept interchangeably were tried — the number `1`, the number `0` and the boolean `true` — and each aborted its own branch while every other branch on the same deploy rendered normally. There is no hidden decode-or-not switch here; the same shape aborts on `RequestParameter` too.

### Compared with RequestParameter and v

The official reference states that this function and [`RequestParameter`](/engagement/ampscript/functions/requestparameter/) behave the same way and are both retained for backward compatibility. On a GET CloudPage that holds byte-for-byte: both functions read the same parameter inside one block and returned identical strings of identical length for a plain value, a decoded space, a decoded ampersand, a percent sign, a missing parameter, a repeated parameter and a wrong-case name, with an in-page equality check answering the same. No GET input separated them. Pick either; prefer one consistently.

[`v`](/engagement/ampscript/functions/v/) is unrelated — it outputs a value it is given rather than reading the request.

{% include test-script.html bundle="ampscript-functions--queryparameter" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

The bundled harness is shared by all three functions and is driven entirely by query strings. A POST body is not exercised, so the form-field path the official reference mentions is untested here and the equivalence above is stated for GET only.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [RequestParameter](/engagement/ampscript/functions/requestparameter/) — the same function on a GET
- [v](/engagement/ampscript/functions/v/) — outputs a value inline
- [Differs from docs: the same function on a GET](/engagement/differs-from-docs/#queryparameter-is-the-same-function-on-a-get)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-query-parameter.html) · [ampscript.guide](https://ampscript.guide/queryparameter/)
