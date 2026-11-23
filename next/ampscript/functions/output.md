---
layout: page
title: "AMPscript Output (Next)"
description: "AMPscript Output does not work in Marketing Cloud Next emails. A nested function call is rejected at save and a literal argument renders nothing; use v to write a value."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/output/
platforms:
  - next
syntax: "Output(value)"
return_type: void
min_args: 1
verification: in-progress
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "On an Engagement CloudPage `Output(Concat(\"A\"))` writes `A`; Engagement email content rejects `Output` as an unknown function. Next rejects an email with a nested call or no argument at save, and renders nothing for a literal or variable argument."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number \| variable | Yes | Literal or variable; nothing is written |

Next refuses to save an email where the argument is a function call, such as `Output(Concat("x"))`, or where the argument is missing.

## Example

`Output` cannot write anything into a Next email. Use [v](/next/ampscript/functions/v/) instead:

```ampscript
%%[ SET @label = "checkpoint reached" ]%%
%%=v(@label)=%%
```

Renders `checkpoint reached`.

## Return value

**`void`** — nothing is returned.

## Behaviour

**A nested function call is rejected at save.** An email containing `Output(Concat("x"))` cannot be saved, even inside an `IF` branch that never runs: the content API answers HTTP 400 with "The AMPscript syntax isn't valid". Two nested calls as arguments are rejected the same way.

**An empty call is rejected at save.** `Output()` gives the same HTTP 400.

**A literal or variable renders nothing.** `Output("bare")`, `Output(@word)` with `@word` set to `"vee"`, and `Output(123)` save, and the email renders an empty string in their place.

{% include test-script.html bundle="next-ampscript-functions--output" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--output" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The documented argument is rejected and other arguments write nothing.** The docs require a function call as the argument and say anything else raises an error. In Next an email with `Output(Concat("x"))` cannot be saved, and a literal or variable argument renders nothing, without an error. [Card](/next/differs-from-docs/#output-function-argument-rejected)

{% include platform-compare.html %}

## See also

- [`Output` in Marketing Cloud Engagement](/engagement/ampscript/functions/output/) — how it behaves there
- [v](/next/ampscript/functions/v/) — writes a value inline in a Next email
- [OutputLine](/next/ampscript/functions/outputline/) — writes only a line break in Next
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-output.html)
