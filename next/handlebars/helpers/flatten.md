---
layout: page
title: "Handlebars flatten"
description: "Handlebars flatten: flattens a nested list of lists into a single list."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/flatten/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Rendered as documented on a nested list from `jsonpath`."
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

Tested in Marketing Cloud Next emails on 2026-11-22 and 2026-11-25:

- `{{#if false}}{{flatten myList}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- `{{flatten (jsonpath '[[1,2],[3,4,5]]' "$")}}` renders `[1, 2, 3, 4, 5]`.
- `{{#each (flatten (jsonpath '[[1,2],[3,4,5]]' "$"))}}[{{this}}]{{/each}}` renders `[1][2][3][4][5]`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--flatten" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-flatten.html)
