---
layout: page
title: "Handlebars query"
description: "Handlebars query: returns many records from a Sales Cloud object or a marketing object."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/query/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-25
mcn_note: "Works on a marketing object when an inline filter on its key field is given; without that filter the preview fails with HTTP 500."
verification: in-progress
test_scripts: complete
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

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email, against a test marketing object `zzprobecoupons__mo` with the key field `CouponCode__c`:

- `{{#each (query type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001")}}{{CouponCode__c}};{{/each}}` renders `PROBE0001;`.
- The same call with `fields="CouponCode__c"` and no key filter: the preview fails with HTTP 500 and no message.
- `{{#if false}}{{query object="Contact" type="CRM" fields="Id" limit=1}}{{/if}}` is accepted when the email is saved; the CRM form was not rendered.

Use named parameters only; the helper is an inline helper, so loop over its result with `each`.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #327](https://medium.com/@marketingcloudtips/salesforce-certified-marketing-cloud-next-consultant-certification-officially-announced-17e72cf40b6f) for the `type="MO"` call with an inline key filter, and [SFMC Tips #313](https://medium.com/@marketingcloudtips/marketing-cloud-next-how-to-configure-marketing-objects-ec7213fda266) for the hint that every key field of a marketing object belongs in the filter.

{% include test-script.html bundle="next-handlebars-helpers--query" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--query" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- On a marketing object (`type="MO"`), the call needs an inline filter on the object's key field, such as `KeyField__c="value"`. Without one, the preview fails with HTTP 500 and no message, although the reference lists only `object` and `type` as required. [Details](/next/differs-from-docs/#hb-query-mo-needs-key-filter)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRows`](/next/ampscript/functions/lookuprows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-query.html)
