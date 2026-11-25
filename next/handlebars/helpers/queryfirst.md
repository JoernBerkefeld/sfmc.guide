---
layout: page
title: "Handlebars queryFirst"
description: "Handlebars queryFirst: returns the first matching record from a Sales Cloud object, a marketing object or a data graph."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/queryfirst/
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

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email, against a test marketing object `zzprobecoupons__mo` with the key field `CouponCode__c`:

- `{{get (queryFirst type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001") "IsClaimed__c"}}` renders `false`, the stored value.
- Without the key filter (the call on its own, inside `#with`, or inside `get`): the preview fails with HTTP 500 and no message.
- A CRM call inside `{{#if false}}…{{/if}}` is accepted when the email is saved; the CRM form was not rendered.

This is the Handlebars counterpart of AMPscript `Lookup`: `Lookup("zzprobecoupons__mo","IsClaimed__c","CouponCode__c","PROBE0001")` rendered the same `false`.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #327](https://medium.com/@marketingcloudtips/salesforce-certified-marketing-cloud-next-consultant-certification-officially-announced-17e72cf40b6f) for the `get (queryFirst type="MO" …) "Field"` pattern as the replacement for AMPscript `Lookup`, and [SFMC Tips #313](https://medium.com/@marketingcloudtips/marketing-cloud-next-how-to-configure-marketing-objects-ec7213fda266) for the hint that every key field of a marketing object belongs in the filter.

{% include test-script.html bundle="next-handlebars-helpers--queryfirst" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--queryfirst" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- On a marketing object (`type="MO"`), the call needs an inline filter on the object's key field, such as `KeyField__c="value"`. Without one, the preview fails with HTTP 500 and no message, although the reference lists only `object` and `type` as required. [Details](/next/differs-from-docs/#hb-queryfirst-mo-needs-key-filter)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Lookup`](/next/ampscript/functions/lookup/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-queryfirst.html)
