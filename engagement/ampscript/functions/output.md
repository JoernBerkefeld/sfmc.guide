---
layout: page
title: "Output"
description: "Writes the result of a nested function call into the rendered content. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including a string literal argument, which renders nothing at all rather than the error the official reference promises."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/output/
platforms:
  - engagement
  - next
syntax: "Output(content)"
return_type: void
min_args: 0
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `content` | function call | Yes | Function call whose result is written; a literal or bare variable renders nothing |

There is no upper bound on the argument count — several values are written in turn — but the single-argument form is the only one the official reference supports.

## Example

```html
%%[ Output(Concat("Hello ", "world")) ]%%
```

Renders `Hello world`.

The value must go through a function call, so a plain string needs a single-argument `Concat` around it:

```html
%%[
  VAR @label
  SET @label = "checkpoint reached"
  Output(Concat(@label))
]%%
```

Passing `@label` directly renders nothing at all, silently — see below.

## Return value

**`void`** — nothing is returned.

There is no value to test for, and no closed set of sentinel values. Because nothing comes back, the call cannot be nested inside another function: placing it inside a `Concat` aborts the surrounding block with HTTP 422.

## Behaviour

**Exactly the argument is written, and nothing else.** A pair of delimiters written by their own calls came back as `<O1>A</O1>` on one line, with no space, no break and no wrapping element around the value. That is the entire difference from [OutputLine](/engagement/ampscript/functions/outputline/), which appends a carriage return and line feed.

**An argument that produces no text writes nothing.** `<O2></O2>` came back with the delimiters adjacent — not even a space.

**Several arguments are written in turn.** Two arguments rendered `ab` and three rendered `abc`, with no separator inserted. A call with no argument at all is accepted too and writes nothing.

**A number or a date is accepted but renders nothing.** `Output(123)` came back empty, while the same date routed through `FormatDate` rendered `2026-08-08`. The argument is a function call, not a scalar — so this is not a type that can be widened.

### The literal argument that vanishes

The official reference states that a value which is not a function call makes this function return an error. It does not. A string literal, a bare variable and a bare number each render **nothing**, at HTTP 200, with every surrounding marker printing normally:

| Call | Renders |
|---|---|
| `Output(Concat("A"))` | `A` |
| `Output("bare")` | *(nothing)* |
| `Output(@v)` where `@v` is `"vee"` | *(nothing)* |
| `Output(123)` | *(nothing)* |
| `Output()` | *(nothing)* |

A debugging line written this way disappears without any signal that something went wrong. See [the differs-from-docs card](/engagement/differs-from-docs/#output-literal-renders-nothing).

### Email/send context: not recognised in sendable email content

`Output` is a CloudPage feature in practice. Rendered through the Email Preview
API against a seeded sendable row, an isolated `%%=Output(Concat("O","K"))=%%`
was rejected with HTTP 400, errorcode 19691: *"The function call uses an
unrecognized function name. Function Name: Output"* — while
[OutputLine](/engagement/ampscript/functions/outputline/), with the identical
footer in the same run, rendered normally. So to write a value into an **email**
use `OutputLine`; keep `Output` to CloudPages / landing pages. See [the
differs-from-docs card](/engagement/differs-from-docs/#output-not-available-in-sendable-email-content).

{% include test-script.html bundle="ampscript-functions--output" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes (CloudPages / landing pages; **not** in sendable email content — use `OutputLine` there) |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [OutputLine](/engagement/ampscript/functions/outputline/) — the same, plus a carriage return and line feed
- [Differs from docs: the literal argument](/engagement/differs-from-docs/#output-literal-renders-nothing)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-output.html) · [ampscript.guide](https://ampscript.guide/output/)
