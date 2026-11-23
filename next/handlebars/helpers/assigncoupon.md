---
layout: page
title: "Handlebars assignCoupon"
description: "Handlebars assignCoupon: reserves a coupon for the current recipient from a coupon list stored in a marketing object and returns that row."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/assigncoupon/
platforms:
  - next
mcn: untested
mcn_tested: 2026-11-22
mcn_note: "Accepted when the email is saved, but not rendered yet: it needs a coupon list stored in a marketing object and a real recipient, and every render uses up a coupon."
test_scripts: complete
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Reserves a coupon for the current recipient from a coupon list stored in a marketing object and returns that row. Errors when no coupon can be assigned.

## Syntax

```sfmc
{{assignCoupon list}}
```

Returns `object`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | string | Yes | Name of the marketing object holding the coupons. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#if false}}{{assignCoupon "MyCoupons"}}{{/if}}` is accepted when the email is saved. The branch never runs, so the helper itself is not rendered.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--assigncoupon" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-assigncoupon.html)
