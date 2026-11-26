---
layout: page
title: "AMPscript LookupOrderedRows (Next)"
description: "AMPscript LookupOrderedRows in Marketing Cloud Next: an email containing the call saves, but every rendered call on a marketing object failed. Use LookupRows instead."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/lookuporderedrows/
platforms:
  - next
syntax: "LookupOrderedRows(dataExt, numRows, sortColumn, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: rowset
min_args: 5
verification: in-progress
differs_from_docs: false
engagement: differs
mcn_tested: 2026-11-25
engagement_note: "Engagement returns the matching data extension rows sorted by the given column and capped at `numRows`. In Next, every call tested on a marketing object failed the email preview with HTTP 500, although the email saved and published."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the data extension to read |
| `numRows` | number | Yes | Maximum rows to return; a value below 1 returns all matches (up to 2,000) |
| `sortColumn` | string | Yes | Column to sort by, optionally followed by `ASC` or `DESC` |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  SET @rows = LookupOrderedRows("zzprobecoupons__mo", 5, "CouponCode__c DESC", "CouponCode__c", "PROBE0001")
]%%
%%=RowCount(@rows)=%%
```

The email saves and publishes, but the preview fails with HTTP 500 and no message. The test marketing object `zzprobecoupons__mo` holds a record with the key `PROBE0001`, and `LookupRows` with the same filter returns it.

## Return value

**`rowset`** — the declared return type. No rendered call has returned a result in Next.

## Behaviour

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email, on the test marketing object `zzprobecoupons__mo` (key field `CouponCode__c`):

**Every rendered call failed.** The preview answered HTTP 500 with no message for each form tried: a row count of `0`, `1` and `5`; the sort column with `ASC`, `DESC`, lowercase `desc` and no direction; a filter on the key field and a filter on another field (`"IsClaimed__c", "false"`). The failures repeated with longer waits for the preview.

**The syntax is accepted at save.** An email with `LookupOrderedRows("ProbeDE", 1, "K asc", "K", "v")` inside an `IF 1 == 2` branch saved and published (2026-11-23), and the rest of the email rendered. A call that runs is only caught when the email is rendered.

**Use [`LookupRows`](/next/ampscript/functions/lookuprows/) instead.** It returns the same marketing object rows with the same filters; it does not sort or cap them.

{% include test-script.html bundle="next-ampscript-functions--lookuporderedrows" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--lookuporderedrows" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [`LookupRows`](/next/ampscript/functions/lookuprows/) — unordered matching rows
- [`Lookup`](/next/ampscript/functions/lookup/)
- [`RowCount`](/next/ampscript/functions/rowcount/)
- [`Row`](/next/ampscript/functions/row/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-ordered-rows.html)
