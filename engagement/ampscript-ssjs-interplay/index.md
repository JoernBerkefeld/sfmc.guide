---
layout: page
title: "How personalization strings, AMPscript and SSJS interact"
description: "Tested on a live CloudPage: the order in which Marketing Cloud Engagement resolves personalization strings, AMPscript and SSJS, and what happens when you nest them."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ampscript-ssjs-interplay/
platforms:
  - engagement
---

A single piece of Marketing Cloud Engagement content can contain three server-side languages at once: personalization strings (`%%emailaddr%%`), AMPscript (`%%[ ... ]%%`, `%%= ... =%%`) and Server-Side JavaScript (`<script runat="server">`). This page describes how they behave next to and inside each other.

{% include callout.html type="note" title="Where these results come from" content="Everything below was observed on a live **CloudPage** in Marketing Cloud Engagement (November 2026). `memberid` was used as the known personalization string; all other names were deliberately unknown. Email sends resolve more names (subscriber attributes, sendable Data Extension fields), but were not part of this test." %}

## The short version

| You write | What happens |
|---|---|
| AMPscript block, then an SSJS script, then AMPscript again | Works. Both languages share the same variables. |
| A personalization string inside SSJS, also inside a JavaScript string | It is replaced before the script runs. |
| Inline AMPscript inside a JavaScript string in SSJS | It is **not** evaluated. The text reaches the output unchanged. |
| An AMPscript block inside an SSJS script | The page fails (HTTP 422 on a CloudPage). |
| An SSJS script inside an AMPscript block | No error, but the script does not run and the rest of the block is skipped. |
| A known personalization string directly followed by `=` or `[` | The string is replaced first. Nothing after it is treated as AMPscript. |
| An unknown name between `%%` pairs, directly followed by AMPscript | The name is left alone and the AMPscript runs. |

## Run them one after the other

AMPscript and SSJS can follow each other freely in the same content. A variable set in one language is available in the other.

```html
%%[
  var @greeting
  set @greeting = 'Hello'
]%%

<script runat="server">
  var greeting = Platform.Variable.GetValue('@greeting'); // "Hello"
  Platform.Variable.SetValue('@name', 'Ada');
</script>

%%=v(@greeting)=%% %%=v(@name)=%%
```

This prints `Hello Ada`. Use `Platform.Variable.GetValue` and `Platform.Variable.SetValue` for the hand-over; they work without loading the Core library. The short form `Variable.GetValue` needs `Platform.Load("core", "1.1.5")` first, and without it the page fails.

## Do not nest them

### AMPscript inside SSJS

Inline AMPscript written into a JavaScript string is passed through as plain text:

```html
<script runat="server">
  var text = "%%=v(@greeting)=%%";
  Platform.Response.Write(text); // prints the delimiters and v(@greeting), not "Hello"
</script>
```

An AMPscript block between two JavaScript statements breaks the whole page:

```html
<script runat="server">
  Platform.Response.Write("before");
  %%[ set @c = 'C3' ]%%
  Platform.Response.Write("after");
</script>
```

On a CloudPage this returns HTTP 422 and nothing is rendered.

### SSJS inside AMPscript

A script tag inside an AMPscript block fails silently, which is worse than an error:

```html
%%[
  set @c = 'C2'
  <script runat="server">
    Platform.Response.Write("inside");
  </script>
  set @c = 'C4'
]%%
%%=v(@c)=%%
```

The page renders without any error and prints `C2`. The script never runs, and `set @c = 'C4'` is skipped as well: the block effectively ends at the script tag.

### When you really need the other language in the middle

Pass the code as a string to `TreatAsContent`. From SSJS, `Platform.Function.TreatAsContent` evaluates AMPscript and returns the result; see the [TreatAsContent reference](/engagement/ampscript/functions/treatascontent/) for the AMPscript side.

Two things to keep in mind when you write AMPscript delimiters into SSJS source:

- A complete inline expression inside a JavaScript string is harmless, as shown above.
- A block, or a delimiter without its counterpart, can abort the page before the script even starts. Building the delimiter from two halves avoids that: `var open = "%" + "%=";`.

## Personalization strings come first, if the name is known

Marketing Cloud replaces a personalization string before it looks for AMPscript. This also happens inside SSJS, including inside JavaScript strings:

```html
<script runat="server">
  var mid = "%%memberid%%"; // already the number when the script runs
</script>
```

Because the replacement happens first, the closing `%%` of a known string can never start AMPscript, even when the next character is `=` or `[`:

| Source | Rendered |
|---|---|
| `x?e=%%memberid%%=1` | `x?e=518005426=1` |
| `%%memberid%%[x]` | `518005426[x]` |
| `%%memberid%%=v(@a)=%% end` | `518005426=v(@a)=%% end` |

The third row is the surprising one: what looks like an inline expression after the string is not evaluated, and its closing delimiter is printed as text.

A name that Marketing Cloud cannot resolve is treated differently. It is not consumed, so AMPscript that begins at its closing `%%` does run:

| Source | Rendered |
|---|---|
| `%%nosuchattr%%=v(@a)=%% end` | `%%nosuchattr` followed by the value of `@a` and the word `end` |
| `50%%off%%[ set @x = 'X1' ]%%` | `50%%off`, and `@x` is now `X1` |
| `%%nosuchattr%%=1` with no closing delimiter after it | printed unchanged |
| `50%% off and then %%=v(@a)=%%` | the text `50%% off and then` followed by the value of `@a` |

{% include callout.html type="warning" title="The same source can behave differently per context" content="Whether a name is *known* depends on where the content runs. A subscriber attribute or a sendable Data Extension field resolves in an email send but not on a CloudPage opened without subscriber context. Do not rely on either reading: keep a space or other separator between a personalization string and a following `=`, `[` or AMPscript expression, or read the value with `AttributeValue()` inside AMPscript instead." %}

## What this means for tooling

Editors, linters and formatters cannot know which names resolve in your account, so they have to pick one reading. The SFMC language tools treat every well-formed `%%name%%` as a personalization string. That matches the platform for all system strings and for your own attributes, and differs from it only when an unknown word sits directly in front of an AMPscript opener, as in `50%%off%%[ ... ]%%`.

Because that reading can be wrong, the tools do not stay silent about it. The language service behind the VS Code extension, and a matching ESLint rule, warn whenever a personalization string is immediately followed by `[` or `=`:

- for a system string such as `%%emailaddr%%`, the warning says that the string is replaced first, so what follows will not run as AMPscript;
- for any other name, it says that the outcome depends on whether the name can be resolved where the content runs.

Either way the fix is the same: put a space or another character between the personalization string and the `[` or `=`, or move the AMPscript away from it.

## Other details

- An inline expression may span several lines; `%%=Concat(` on one line and `)=%%` three lines later works.
- In a client-side `<script>` without `runat="server"`, AMPscript and personalization strings are evaluated as usual, because for the server that script is ordinary content.
