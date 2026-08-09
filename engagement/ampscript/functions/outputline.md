---
layout: page
title: "OutputLine"
description: "Writes the result of a nested function call into the rendered content, followed by a line break. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the exact two bytes it appends, which are a carriage return and line feed rather than an HTML break."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/outputline/
platforms:
  - engagement
  - next
syntax: "OutputLine(content)"
return_type: void
min_args: 0
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `content` | function call | Yes | Function call whose result is written; a literal or bare variable renders only the line break |

There is no upper bound on the argument count — several values are written in turn, followed by a single break — but the single-argument form is the only one the official reference supports.

## Example

```html
%%[ OutputLine(Concat("Hello ", "world")) ]%%
```

Renders `Hello world` followed by a carriage return and line feed.

Because the break is not an HTML break, an HTML view collapses consecutive lines unless the content sits inside a preformatted element:

```html
<pre>
%%[
  OutputLine(Concat("first"))
  OutputLine(Concat("second"))
]%%
</pre>
```

## Return value

**`void`** — nothing is returned.

There is no value to test for, and no closed set of sentinel values. Because nothing comes back, the call cannot be nested inside another function: placing it inside a `Concat` aborts the surrounding block with HTTP 422.

## Behaviour

**A bare literal or variable renders only the break.** The value is dropped exactly as it is by [Output](/engagement/ampscript/functions/output/); the break still appears. `<L3>` and `</L3>` came back on two separate lines with nothing between them.

**An argument that produces no text still breaks the line.** That is why an empty call is the standard way to end a line in a script that otherwise writes with `Output`.

**Consecutive calls put each value on its own line.** Two calls writing `P` and `Q` rendered them on separate lines inside their delimiters.

**Several arguments produce one line, not several.** Two arguments rendered `ab` and three rendered `abc`, each followed by a single break. A call with no argument at all writes just the break.

**A number or a date is accepted but only the break appears.** `OutputLine(456)` rendered an empty line, while the same value routed through a function call rendered normally.

### The two bytes it appends

Reading the rendered page only shows that a line ended. Reading the raw response bytes shows what was actually written: the two bytes immediately after the value are **13 and 10** — a carriage return followed by a line feed. No `<br>` element appears anywhere in the body.

| Sequence | Rendered bytes after the value |
|---|---|
| `Output(Concat("A"))` | none |
| `OutputLine(Concat("A"))` | `13`, `10` |

That matches what the official reference says, and it is the reason the lines collapse in an HTML view: browsers treat a CRLF as whitespace. In a plain-text email or an SMS body the lines stay separate.

{% include test-script.html bundle="ampscript-functions--outputline" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Output](/engagement/ampscript/functions/output/) — the same, without the line break
- [Differs from docs: the undocumented argument counts](/engagement/differs-from-docs/#outputline-arity-and-empty-argument)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-output-line.html) · [ampscript.guide](https://ampscript.guide/outputline/)
