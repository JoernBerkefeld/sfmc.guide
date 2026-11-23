---
layout: page
title: "Handlebars flatten"
description: "Handlebars flatten: flattens a nested list of lists into a single list."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/flatten/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-22
mcn_note: "Accepted when the email is saved, but not rendered yet: every example needs a list built with `jsonPath`, and an email with `jsonPath` cannot be saved."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Flattens a nested list of lists into a single list.

## Syntax

```sfmc
{{flatten nestedList}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `nestedList` | array | Yes | A list that holds other lists. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{flatten myList}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--flatten" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-flatten.html)
