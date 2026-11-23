---
layout: page
title: "Handlebars sort"
description: "Handlebars sort: sorts a list of objects by a field, order, and type."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/sort/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper. This happens even when the call sits in a branch that never runs."
verification: verified
---

{% include verification-status.html %}

{% raw %}
Sorts a list of objects by a field, order, and type.

## Syntax

```sfmc
{{sort list fieldName sortOrder sortAs}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | array | Yes | List of objects to order. |
| `fieldName` | string | Yes | Field to order by. |
| `sortOrder` | string | Yes | Sort order: asc or desc. |
| `sortAs` | string | Yes | Type to sort as: string, number, date, or boolean. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{sort myList}}{{/if}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- Examples that build a list with `jsonPath` were not tried: an email that uses `jsonPath` cannot be saved.
{% endraw %}

## Differs from official docs

{% raw %}
- The reference documents `sort` as a Marketing Cloud Next helper, available since the Winter '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#if false}}{{sort myList}}{{/if}}` could not be saved: the CMS answered HTTP 400 and named `sort` as an unsupported handlebars helper. The check runs at save time, so the call is rejected even inside a branch that never runs. [Details](/next/differs-from-docs/#hb-sort-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-sort.html)
