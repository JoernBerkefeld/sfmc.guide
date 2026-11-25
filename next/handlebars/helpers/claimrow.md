---
layout: page
title: "Handlebars claimRow"
description: "Handlebars claimRow: takes the first row of a marketing object that nobody has claimed yet, marks it as claimed, and returns it."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/claimrow/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-25
mcn_note: "Accepted when the email is saved. In a preview the call failed with HTTP 500 and claimed no row; a real send was not tested."
verification: in-progress
test_scripts: complete
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

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email:

- `{{#if false}}{{claimRow object="ProbeCoupons" claimCol="IsClaimed" EmailAddress="probe@example.com"}}{{/if}}` is accepted when the email is saved (named parameters only).
- `{{get (claimRow object="zzprobecoupons__mo" claimCol="IsClaimed__c" EmailAddress__c="probe@example.com") "CouponCode__c"}}`, and the same call inside `{{#with}}`: the preview fails with HTTP 500 and no message, and the row stays unclaimed afterwards.

Whether a real send claims a row was not tested, because the test org allows no sends. An earlier result from 2026-11-22 that called this helper unsupported came from an email that mixed several helpers with invalid call syntax; it is withdrawn.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #378](https://medium.com/@marketingcloudtips/marketing-cloud-next-personalized-coupon-distribution-with-coupon-management-24b41548bcf4) for showing how `claimRow` and `assignCoupon` split the coupon work.

{% include test-script.html bundle="next-handlebars-helpers--claimrow" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--claimrow" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

{% include mcn-status.html %}

## See also

- [AMPscript `ClaimRow`](/next/ampscript/functions/claimrow/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `ClaimRowValue`](/next/ampscript/functions/claimrowvalue/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-claimrow.html)
