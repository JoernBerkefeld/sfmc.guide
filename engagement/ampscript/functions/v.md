---
layout: page
title: "v"
description: "Outputs a value inline, normally a variable reference. Runtime-proven on a live Marketing Cloud Engagement CloudPage — a string literal, a number and a nested function call are accepted too, which makes one particular typo render silently instead of failing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/v/
platforms:
  - engagement
  - next
syntax: "v(variableName)"
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
| `variableName` | string \| number | Yes | Variable reference, literal or nested function call to output |

## Example

```html
%%[
  VAR @word
  SET @word = "zeta"
]%%
<p>%%=v(@word)=%%</p>
```

Renders `<p>zeta</p>`.

The argument does not have to be a variable — a function call can be passed straight in, which saves declaring one:

```html
<p>Hello, %%=v(RequestParameter("p"))=%%</p>
```

Requested with `?p=hello`, that renders `<p>Hello, hello</p>`. Beware the mirror image of it, though: a quoted name is output as itself rather than resolved — see below.

## Return value

**`string`** — the referenced value rendered as a string.

The value domain is open, so there is no closed set of tokens to test against.

## Behaviour

**A variable is output as its value.** A variable set to a word rendered that word; a variable holding a request-parameter value rendered that value.

**A nested function call is evaluated.** Wrapping a request-parameter read rendered the parameter's value, identical to reading it into a variable first.

**A number is accepted**, both from a variable and as a bare literal: `v(5)` renders `5`.

### A quoted name is output as itself

`v("p")` renders the letter `p` — the literal, not whatever `p` might name. This is the one trap on the page: write `v("id")` where you meant `v(RequestParameter("id"))` and the page renders the word `id` at HTTP 200 rather than failing, so the mistake ships silently. Neither the official reference nor the community guide mentions that a literal is accepted at all.

{% include test-script.html bundle="ampscript-functions--v" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

The bundled harness is shared with the two request-reading functions above; its `?b=vread`, `?b=vnest`, `?b=vnumlit`, `?b=v0` and `?b=v2` branches are the ones belonging to this function. Everything claimed here was proven on Marketing Cloud Engagement; the Marketing Cloud Next availability below is read from the official reference, not from a probe.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [RequestParameter](/engagement/ampscript/functions/requestparameter/) — reads a request parameter
- [QueryParameter](/engagement/ampscript/functions/queryparameter/) — reads a query-string parameter
- [Differs from docs: it accepts more than a variable](/engagement/differs-from-docs/#v-accepts-more-than-a-variable)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-v.html) · [ampscript.guide](https://ampscript.guide/v/)
