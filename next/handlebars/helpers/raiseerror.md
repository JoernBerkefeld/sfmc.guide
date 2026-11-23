---
layout: page
title: "Handlebars raiseError"
description: "Handlebars raiseError: throws an exception with a message and optional error code, halting rendering."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/raiseerror/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-22
mcn_note: "Accepted when the email is saved, but not rendered yet: it always stops the render, so it needs an email of its own and could not share one with the other tests."
test_scripts: complete
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Throws an exception with a message and optional error code, halting rendering.

## Syntax

```sfmc
{{raiseError errorMessage [errorCode]}}
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `errorMessage` | string | Yes | The error message to include. |
| `errorCode` | string | No | An error code for categorizing the error. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{raiseError "Stopped"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--raiseerror" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `RaiseError`](/next/ampscript/functions/raiseerror/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-raiseerror.html)
