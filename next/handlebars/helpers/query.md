---
layout: page
title: "Handlebars query"
description: "Handlebars query: returns many records from a Sales Cloud object or a marketing object."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/query/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper. This happens even when the call sits in a branch that never runs."
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Returns many records from a Sales Cloud object or a marketing object.

## Syntax

```sfmc
{{query ...options}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `options` | any | Yes, repeatable | Named arguments only: object (API name of the target object) and type (CRM or MO) are required; fields, where, params, limit, sortBy and id are optional. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{#query "MyObject"}}x{{/query}}{{/if}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

## Differs from official docs

{% raw %}
- The reference documents `query` as a Marketing Cloud Next helper, available since the Summer '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#if false}}{{#query "MyObject"}}x{{/query}}{{/if}}` could not be saved: the CMS answered HTTP 400 and named `query` as an unsupported handlebars helper. The check runs at save time, so the call is rejected even inside a branch that never runs. [Details](/next/differs-from-docs/#hb-query-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRows`](/next/ampscript/functions/lookuprows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-query.html)
