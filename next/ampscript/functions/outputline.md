---
layout: page
title: "AMPscript OutputLine (Next)"
description: "AMPscript OutputLine in Marketing Cloud Next. Behaviour proven in a Marketing Cloud Next email: a literal or variable argument renders only a line break, and a nested function call is rejected at save."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/outputline/
platforms:
  - next
syntax: "OutputLine(value)"
return_type: void
min_args: 1
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "In Engagement the argument is a function call, so `OutputLine(Concat(\"A\"))` writes `A` and a line break, and `OutputLine()` writes just the break. Next rejects both of those emails at save; it accepts only a literal or variable argument, and then writes only the line break."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| variable | Yes | Literal or variable; its value is not written, only the line break |

Next refuses to save an email where the argument is a function call, such as `OutputLine(Concat("A"))`, and an email where the argument is missing. Calls with several literal arguments were not tested.

## Example

```ampscript
%%[ OutputLine("ignored") ]%%
```

Renders a line break and nothing else.

To write a value into a Next email, use [v](/next/ampscript/functions/v/) instead:

```ampscript
%%[ SET @word = "zeta" ]%%
%%=v(@word)=%%
```

Renders `zeta`.

## Return value

**`void`** — nothing is returned.

## Behaviour

**Only the line break is written.** `OutputLine("bare")`, `OutputLine(@word)` with `@word` set to `"vee"`, and `OutputLine(456)` each render a line break with no text.

**A nested function call is rejected at save.** An email containing `OutputLine(Concat("A"))` cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid", pointing at the call. The same happens with two or three nested calls as arguments, and with two `OutputLine(Concat(...))` calls in a row.

**An empty call is rejected at save.** `OutputLine()` gives the same HTTP 400.

**It cannot be nested.** `Concat("x", OutputLine(Concat("A")), "y")` is rejected at save as well.

{% include test-script.html bundle="next-ampscript-functions--outputline" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--outputline" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The documented argument is rejected and other arguments write only a line break.** The docs require a function call as the argument and promise a CRLF line break after the value. In Next an email with `OutputLine(Concat("A"))` cannot be saved, and a literal or variable argument writes a bare line feed without the value. [Card](/next/differs-from-docs/#outputline-function-argument-rejected)

{% include platform-compare.html %}

## See also

- [`OutputLine` in Marketing Cloud Engagement](/engagement/ampscript/functions/outputline/) — how it behaves there
- [v](/next/ampscript/functions/v/) — writes a value inline in a Next email
- [Output](/next/ampscript/functions/output/) — the same without the line break
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-output-line.html)
