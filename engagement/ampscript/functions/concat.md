---
layout: page
title: "Concat"
description: "Joins two or more values into a single string. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the one-argument form the reference never mentions and the boolean values that vanish without a trace."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/concat/
platforms:
  - engagement
  - next
syntax: "Concat(string1, string2[, stringN, ...])"
return_type: string
min_args: 1
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `string1` | `string \| number \| date` | Yes | First value to join |
| `string2` | `string \| number \| date` | No | Second value to join |
| `stringN` | `string \| number \| date` | No | Any number of further values |

There is no upper bound on the argument count. Every parameter is typed `string | number | date` rather than `string` because numbers and date values are both accepted and stringified rather than rejected.

## Return value

**`string`** — every supplied value converted to text and joined in order, with no separator inserted.

The result is arbitrary text, so there is no closed set of sentinel values to test for.

## Behaviour

**One argument is enough.** `Concat("only")` returns HTTP 200 and echoes the argument back unchanged. Our own catalog previously encoded a minimum of two arguments; it has been corrected to one. This is summarised on [Differs from official docs](/engagement/differs-from-docs/#concat-single-argument-accepted).

**Zero arguments abort the page.** A bare `Concat()` aborts the CloudPage with HTTP 422 — the surrounding marker line never renders. So the real minimum is one, not zero.

**Genuinely variadic.** Two, three, twelve and twenty arguments were all accepted and joined in order: `Concat("Hello", "World")` gives `HelloWorld`, and a twenty-argument call gives `abcdefghijklmnopqrst`.

**Numbers are joined by their string form.** `Concat(12, 3.5)` gives `123.5` — no arithmetic happens, and no separator is inserted between the operands.

**Date values are stringified.** `Concat(Now(), "X")` renders the formatted date followed directly by the `X`.

**Empty strings contribute nothing.** Joining empty strings gives an empty result rather than an error.

**Booleans are swallowed silently.** `Concat(true, false)` returns HTTP 200 with an *empty* result — neither operand contributes anything. Nothing coherent about the boolean survives, so this is a rejection rather than boolean support, and the parameter types stay `string | number | date`. The same happens across the whole String family; see [Differs from official docs](/engagement/differs-from-docs/#concat-booleans-swallowed). Convert a boolean to text yourself before joining it.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## Test script

Deploy the block once as a CloudPage, then fetch it one branch at a time — `?b=safe`, `?b=c1`, `?b=c0`, and so on. The zero-argument case has to be isolated because it aborts the whole page; a branch that renders nothing at all is the failure signal.

```html
%%[
  VAR @b
  SET @b = RequestParameter("b")

  /* safe sweep: everything here is accepted and can share one request */
  IF @b == "safe" THEN
    OutputLine(Concat("C2=[", Concat("Hello", "World"), "]"))
    OutputLine(Concat("C3=[", Concat("a", "-", "b"), "]"))
    OutputLine(Concat("C12=[", Concat("1","2","3","4","5","6","7","8","9","A","B","C"), "]"))
  ENDIF

  /* twenty arguments: still accepted */
  IF @b == "c20" THEN
    OutputLine(Concat("C20=[", Concat("a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t"), "]"))
  ENDIF

  /* one argument: HTTP 200, the value comes back unchanged */
  IF @b == "c1" THEN
    OutputLine(Concat("--- c1 start ---"))
    OutputLine(Concat("C1=[", Concat("only"), "]"))
    OutputLine(Concat("--- c1 done ---"))
  ENDIF

  /* zero arguments: page aborts with HTTP 422, no marker renders */
  IF @b == "c0" THEN
    OutputLine(Concat("--- c0 start ---"))
    OutputLine(Concat("C0=[", Concat(), "]"))
  ENDIF

  /* numbers are stringified, not added */
  IF @b == "cn" THEN
    OutputLine(Concat("CN=[", Concat(12, 3.5), "]"))
  ENDIF

  /* date values are stringified */
  IF @b == "cd" THEN
    OutputLine(Concat("CD=[", Concat(Now(), "X"), "]"))
  ENDIF

  /* booleans: HTTP 200 but nothing renders between the brackets */
  IF @b == "cb" THEN
    OutputLine(Concat("CB=[", Concat(true, false), "]"))
  ENDIF

  /* empty strings join to an empty result */
  IF @b == "empty" THEN
    OutputLine(Concat("CE=[", Concat("", ""), "]"))
  ENDIF
]%%
```

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## See also

- [`Length`](/engagement/ampscript/functions/length/) — measures the joined result in UTF-16 code units
- [`Lowercase`](/engagement/ampscript/functions/lowercase/) · [`Uppercase`](/engagement/ampscript/functions/uppercase/) — the other verified String functions, which swallow booleans the same way
- [Differs from official docs](/engagement/differs-from-docs/#concat-single-argument-accepted) — the one-argument form · [booleans swallowed](/engagement/differs-from-docs/#concat-booleans-swallowed)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-concat.html) · [ampscript.guide](https://ampscript.guide/concat/)
