---
layout: page
title: "Handlebars claimRow"
description: "Handlebars claimRow: takes the first row of a marketing object that nobody has claimed yet, marks it as claimed, and returns it."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/claimrow/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper. This happens even when the call sits in a branch that never runs."
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Takes the first row of a marketing object that nobody has claimed yet, marks it as claimed, and returns it. Errors when every row is already claimed.

## Syntax

```sfmc
{{claimRow ...options}}
```

Returns `object`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `options` | any | Yes, repeatable | Named arguments only: object (marketing object name) and claimCol (column that flags a claimed row) are required, followed by one or more column="value" pairs to write into the claimed row. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{claimRow "MyObject"}}{{/if}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

## Differs from official docs

{% raw %}
- The reference documents `claimRow` as a Marketing Cloud Next helper, available since the Winter '27 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#if false}}{{claimRow "MyObject"}}{{/if}}` could not be saved: the CMS answered HTTP 400 and named `claimRow` as an unsupported handlebars helper. The check runs at save time, so the call is rejected even inside a branch that never runs. [Details](/next/differs-from-docs/#hb-claimrow-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `ClaimRow`](/next/ampscript/functions/claimrow/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `ClaimRowValue`](/next/ampscript/functions/claimrowvalue/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-claimrow.html)
