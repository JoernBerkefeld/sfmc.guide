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
mcn_tested: 2026-11-26
mcn_note: "On Sales Cloud objects, `where` with `params` and `sortBy` pick the expected record, and no match renders empty. On a marketing object it works when an inline filter is given (on the key or another field); without one, or with `sortBy`, the preview fails with HTTP 500. With `type=\"DG\"` every form tested failed with HTTP 500."
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
| `type` | string | Yes | The data source type: CRM, MO, or DG. DG failed with HTTP 500 in every tested form; read the bound data graph through `@root.$dataGraph` instead. |
| `options` | any | No, repeatable | Named arguments such as fields, where, params, sortBy, id. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email, against a test marketing object `zzprobecoupons__mo` with the key field `CouponCode__c`:

- `{{get (queryFirst type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001") "IsClaimed__c"}}` renders `false`, the stored value.
- Without the key filter (the call on its own, inside `#with`, or inside `get`): the preview fails with HTTP 500 and no message.
- A CRM call inside `{{#if false}}…{{/if}}` is accepted when the email is saved.

On the `Contact` object (`type="CRM"`), with the expected record taken from a SOQL query of the same org:

- `{{get (queryFirst type="CRM" object="Contact" fields="LastName" where="pi__score__c = :s" params=(hash s=82)) "LastName"}}` renders the last name of the one matching contact.
- With `where="pi__score__c > :s" params=(hash s=200)`, `sortBy="pi__score__c DESC"` returns the contact with the highest score and `sortBy="pi__score__c ASC"` the one with the lowest.
- When nothing matches (`s=1`), `[{{get (queryFirst …) "LastName"}}]` renders `[]` and the email renders normally.

On data graphs (`type="DG"`), tested on 2026-11-26, no call rendered: an inline filter on the key of the graph's root object (a unified individual id or a source Individual id), the documented `contactPointEmail="<email>"` filter, no filter, and `where` with `params` all saved and published, but the preview failed with HTTP 500, even with the email bound to the queried graph in the same data space. To read the recipient's data graph, use the graph bound to the email: `{{get (get @root "$dataGraph") "ssot__FirstName__c"}}` rendered the first name in the Email Builder preview with a profile. See [Querying data: data graphs](/next/querying-data/#data-graphs).

This is the Handlebars counterpart of AMPscript `Lookup`: `Lookup("zzprobecoupons__mo","IsClaimed__c","CouponCode__c","PROBE0001")` rendered the same `false`.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #327](https://medium.com/@marketingcloudtips/salesforce-certified-marketing-cloud-next-consultant-certification-officially-announced-17e72cf40b6f) for the `get (queryFirst type="MO" …) "Field"` pattern as the replacement for AMPscript `Lookup`, and [SFMC Tips #313](https://medium.com/@marketingcloudtips/marketing-cloud-next-how-to-configure-marketing-objects-ec7213fda266) for the hint that every key field of a marketing object belongs in the filter.

{% include test-script.html bundle="next-handlebars-helpers--queryfirst" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--queryfirst" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- On a marketing object (`type="MO"`), the call needs at least one inline filter, such as `KeyField__c="value"`; a field other than the key works too. Without one, the preview fails with HTTP 500 and no message, although the reference lists only `object` and `type` as required. `sortBy` fails the same way. [Details](/next/differs-from-docs/#hb-queryfirst-mo-needs-key-filter)
- On a data graph (`type="DG"`), which the reference documents, every form tested failed with HTTP 500, with a unified individual id, a source Individual id or the documented `contactPointEmail` filter, and with the email bound to the same graph. [Details](/next/differs-from-docs/#hb-queryfirst-dg-fails)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Lookup`](/next/ampscript/functions/lookup/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-queryfirst.html)
