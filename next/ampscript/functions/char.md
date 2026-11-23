---
layout: page
title: "AMPscript Char (Next)"
description: "Return the character for a character code with AMPscript Char in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the codes above 255 that fail there."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/char/
platforms:
  - next
syntax: "Char(characterCode[, numRepetitions])"
return_type: string
min_args: 1
max_args: 2
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Codes from 0 to 255 give the same character on both. Engagement also returns a character for codes above 255 and for negative codes (`Char(256)` gives `Ā`, `Char(65601)` wraps round to `A`); in Next the email preview fails for every one of those codes."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `characterCode` | string \| number | Yes | Character code, as a whole number |
| `numRepetitions` | string \| number | No | Number of times to repeat the returned character, as a whole number |

Only codes from 0 to 255 render in Next — see below.

## Example

```ampscript
%%=Char(65)=%%
```

Renders `A`.

The second argument repeats the character:

```ampscript
%%=Char(65, 3)=%%
```

Renders `AAA`.

## Return value

**`string`** — the character for the code, repeated when a count is given.

A count of `0` gives an empty string. Beyond that there is no fixed set of special values to test for.

## Behaviour

**Codes 0 to 255 give their Latin-1 character.** `Char(64)` gives `@`, `Char(34)` a double quote, `Char(39)` an apostrophe, and `Char(190)`, `Char(233)` and `Char(255)` give `¾`, `é` and `ÿ`. Each measures `Length` `1`.

**Control codes come back as one character each.** `Char(9)` is a tab, `Char(10)` a line feed, `Char(13)` a carriage return and `Char(32)` a space. `Char(0)` returns the NUL character, which measures `Length` `1`. These are invisible in the rendered email, so measure them rather than looking for them.

**The repeat count.** `Char(65,3)` gives `AAA`, `Char(65,1)` gives `A`, and `Char(65,0)` gives an empty string (`Length` `0`).

**Numeric strings work in both positions.** `Char("65")` gives `A` and `Char(65,"3")` gives `AAA`.

**Any code outside 0 to 255 breaks the preview.** An email with `Char(256)`, `Char(8364)`, `Char(9731)`, `Char(65601)`, `Char(128512)` or `Char(-1)` saves, but rendering it fails with HTTP 500. Wrapping the call in `Length` does not help.

**Invalid arguments break the preview too.** A decimal code (`Char(65.7)`), a non-numeric string (`Char("A")`), a boolean (`Char(true)`), a negative count (`Char(65,-1)`) and a decimal count (`Char(65,2.6)`) each save, but the email does not render. There is no error value to test for, so check the arguments before the call.

**No arguments or three arguments cannot be saved.** `Char()` and `Char(65,2,1)` are rejected at save with HTTP 400 "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--char" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--char" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Char works in Next.** The reference lists Char as not available in Marketing Cloud Next. A Next email rendered `Char(65)` as `A` and `Char(65,3)` as `AAA`; only codes outside 0 to 255 fail. [Card](/next/differs-from-docs/#char-available-in-next)

{% include platform-compare.html %}

## See also

- [`Char` in Marketing Cloud Engagement](/engagement/ampscript/functions/char/) — how it behaves there
- [`Concat`](/next/ampscript/functions/concat/) — joins the characters you build with `Char`
- [`Length`](/next/ampscript/functions/length/) — how the resulting characters are counted
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-string/mc-ampscript-reference-string-char.html)
