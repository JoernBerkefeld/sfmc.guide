---
layout: page
title: "AMPscript LookupRows (Next)"
description: "AMPscript LookupRows in Marketing Cloud Next: read matching marketing object records into a rowset. Syntax and behaviour proven in a Marketing Cloud Next email, although the official reference lists the function as unavailable in Next."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/lookuprows/
platforms:
  - next
syntax: "LookupRows(dataExt, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: rowset
min_args: 3
verification: in-progress
differs_from_docs: true
engagement: same
mcn_tested: 2026-11-25
engagement_note: "Both return every matching row as a rowset, and an empty rowset (`RowCount` `0`) when nothing matches. In Next the call read a marketing object, filtered on its key field and on another field."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the data extension to read |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  SET @rows = LookupRows("zzprobecoupons__mo", "CouponCode__c", "PROBE0001")
]%%
%%=RowCount(@rows)=%%|%%=Field(Row(@rows, 1), "CouponCode__c")=%%
```

Renders `1|PROBE0001` for a test marketing object `zzprobecoupons__mo` that holds one record with the key `PROBE0001`. In Next, the first argument names a marketing object instead of a data extension.

## Return value

**`rowset`** — every matching record, read with [`Row`](/next/ampscript/functions/row/) and [`Field`](/next/ampscript/functions/field/). When nothing matches, the rowset has `RowCount` `0`.

## Behaviour

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email, on the test marketing object `zzprobecoupons__mo` (key field `CouponCode__c`):

**Filters on the key field.** `LookupRows("zzprobecoupons__mo", "CouponCode__c", "PROBE0001")` returned one row, and `Field` read `PROBE0001` from it.

**Filters on other fields too.** `LookupRows("zzprobecoupons__mo", "IsClaimed__c", "false")` returned the one unclaimed record (`RowCount` `1`).

**No match is not an error.** `LookupRows("zzprobecoupons__mo", "CouponCode__c", "NOPE0000")` returned a rowset with `RowCount` `0`.

**The syntax is accepted at save.** An email with `LookupRows("ProbeDE", "K", "v")` inside an `IF 1 == 2` branch saved and published (2026-11-23).

{% include test-script.html bundle="next-ampscript-functions--lookuprows" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **Documented as unavailable in Next, yet it works.** The availability table of the reference says No for Marketing Cloud Next. In a Next email the call read a marketing object: a key-field filter returned the matching row, a filter on another field worked too, and no match gave `RowCount` `0`. A number key accepts the value as a string or a number. Two limits showed up on 2026-11-26: a filter that matched two records returned one row, and the same field in two pairs uses only the last pair. [Card](/next/differs-from-docs/#lookuprows-available-in-next)

{% include platform-compare.html %}

## See also

- [`Lookup`](/next/ampscript/functions/lookup/) — a single value from the first match
- [`LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/) — the sorted variant; it failed every render test in Next
- [`RowCount`](/next/ampscript/functions/rowcount/)
- [`Row`](/next/ampscript/functions/row/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-rows.html)
