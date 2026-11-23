---
layout: page
title: "Handlebars map"
description: "Handlebars map: returns a list with the value of one field from each object in a list."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/map/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-22
mcn_note: "Accepted when the email is saved, but not rendered yet: the example needs a list built with `jsonPath`, and an email with `jsonPath` cannot be saved."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns a list with the value of one field from each object in a list.

## Syntax

```sfmc
{{map list fieldName}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | List of objects to read. |
| `fieldName` | string | Yes | Field to read from each object. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{map myList "name"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--map" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-map.html)
