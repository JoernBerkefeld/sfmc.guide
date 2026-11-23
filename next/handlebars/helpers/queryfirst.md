---
layout: page
title: "Handlebars queryFirst"
description: "Handlebars queryFirst: returns the first matching record from a Sales Cloud object, a marketing object or a data graph."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/queryfirst/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper. This happens even when the call sits in a branch that never runs."
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Returns the first matching record from a Sales Cloud object, a marketing object or a data graph.

## Syntax

```sfmc
{{queryFirst object type [...options]}}
```

Returns `object`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `object` | string | Yes | The API name of the target object, marketing object, or data graph. |
| `type` | string | Yes | The data source type: CRM, MO, or DG. |
| `options` | any | No, repeatable | Named arguments such as fields, where, params, sortBy, id. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{#queryFirst "MyObject"}}x{{/queryFirst}}{{/if}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

## Differs from official docs

{% raw %}
- The reference documents `queryFirst` as a Marketing Cloud Next helper, available since the Summer '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#if false}}{{#queryFirst "MyObject"}}x{{/queryFirst}}{{/if}}` could not be saved: the CMS answered HTTP 400 and named `queryFirst` as an unsupported handlebars helper. The check runs at save time, so the call is rejected even inside a branch that never runs. [Details](/next/differs-from-docs/#hb-queryfirst-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Lookup`](/next/ampscript/functions/lookup/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-queryfirst.html)
