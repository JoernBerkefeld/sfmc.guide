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
mcn_note: "On Sales Cloud objects, `where` with `params` filters, sorts and limits as documented, but a value written straight into `where` fails the preview with HTTP 500, `LIKE` matches anywhere in the field without treating `%` as a wildcard, and a call without `fields` returns empty fields. On a marketing object only inline filters work (on any field, several joined with AND, `limit` allowed, `sortBy` fails); without one, or with `where`, the preview fails with HTTP 500."
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

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email.

On a test marketing object `zzprobecoupons__mo` with the key field `CouponCode__c`:

- `{{#each (query type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001")}}{{CouponCode__c}};{{/each}}` renders `PROBE0001;`.
- The same call with `fields="CouponCode__c"` and no key filter: the preview fails with HTTP 500 and no message.
- `where` with `params` does not replace the inline key filter: `where="CouponCode__c = :c"` (also with `LIKE`) fails the preview with HTTP 500, and so does `where` next to an inline filter, which the reference rules out anyway.

On the `Contact` object (`type="CRM"`), with the expected rows taken from a SOQL query of the same org:

- `{{#each (query type="CRM" object="Contact" fields="LastName,pi__score__c" where="pi__score__c = :s" params=(hash s=82))}}{{LastName}};{{/each}}` renders the one matching contact. A string param (`s="82"`) on the number field matches too.
- `=` compares strings without regard to case: `where="LastName = :n"` with `n="blau"` finds the contact `Blau`.
- `!=`, `<`, `<=`, `>` and `>=` on a number field return the same records as SOQL. On a date field, `=`, `<` and `>` work with the date passed as a `"yyyy-MM-dd"` string, for example `where="Birthdate = :d" params=(hash d="1965-07-26")`.
- `AND`, `OR` and parentheses combine conditions: `where="LastName LIKE :n AND (pi__score__c < :lo OR pi__score__c > :hi)"` returns the expected records.
- `sortBy="pi__score__c ASC"` and `"pi__score__c DESC"` order the rows, and `limit=2` keeps the first two rows after sorting.
- `LIKE` matches the value anywhere in the field, ignoring case, and does not treat `%` as a wildcard: `n="Ro%"` returns `Brown`, `Frost`, `Rogers`, `Rose` and `Rossi` (SOQL returns only the last three); `n="Bl"` returns `Blay` and `Blau` (SOQL returns none).
- Only the fields listed in `fields` are filled: with `fields="LastName"`, `{{FirstName}}` and the filter field render empty. Without `fields`, the matching record comes back but every field renders empty.
- A value written straight into `where`, without a `:placeholder`, fails the preview with HTTP 500: `where="LastName = 'Blau'"`, `where="pi__score__c = 82"`, and a mix of a literal with a placeholder.
- `{{#if false}}{{query object="Contact" type="CRM" fields="Id" limit=1}}{{/if}}` is accepted when the email is saved.

Use named parameters only; the helper is an inline helper, so loop over its result with `each`.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #327](https://medium.com/@marketingcloudtips/salesforce-certified-marketing-cloud-next-consultant-certification-officially-announced-17e72cf40b6f) for the `type="MO"` call with an inline key filter, and [SFMC Tips #313](https://medium.com/@marketingcloudtips/marketing-cloud-next-how-to-configure-marketing-objects-ec7213fda266) for the hint that every key field of a marketing object belongs in the filter.

{% include test-script.html bundle="next-handlebars-helpers--query" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--query" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- On a marketing object (`type="MO"`), the call needs at least one inline filter, such as `KeyField__c="value"`; it may name any field, and several combine with AND. Without one, the preview fails with HTTP 500 and no message, although the reference lists only `object` and `type` as required. A `where` filter with `params` fails the same way, and so does `sortBy`; `limit` works. In a test where the filter matched two records, only one was returned. [Details](/next/differs-from-docs/#hb-query-mo-needs-key-filter)
- The reference's grouping example writes values straight into `where`. In Next (tested 2026-11-25), any value written into `where` instead of a `:placeholder` failed the preview with HTTP 500; pass every value through `params`. [Details](/next/differs-from-docs/#hb-query-where-literal-fails)
- The reference lists `LIKE` as a `where` operator without saying how it matches. In Next (tested 2026-11-25), `LIKE` matched the value anywhere in the field and did not treat `%` as a wildcard, so `"Ro%"` also matched `Brown`. [Details](/next/differs-from-docs/#hb-query-like-contains)
- The reference marks `fields` as optional and shows calls without it. In Next (tested 2026-11-25), a call without `fields` returned the matching record with every field empty. [Details](/next/differs-from-docs/#hb-query-no-fields-empty)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRows`](/next/ampscript/functions/lookuprows/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-query.html)
