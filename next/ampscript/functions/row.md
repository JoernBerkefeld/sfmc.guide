---
layout: page
title: "AMPscript Row (Next)"
description: "Get one row of a rowset by its 1-based index with AMPscript Row in Marketing Cloud Next. Syntax and the outputs a Marketing Cloud Next email rendered, including where they differ from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/row/
platforms:
  - next
syntax: "Row(rowset, rowIndex)"
return_type: row
min_args: 2
max_args: 2
verification: in-progress
differs_from_docs: false
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Reading a row of `BuildRowSetFromString(\"North**South**East**West\",\"**\")` with `Field(row, 1)` gives `North` (row 1) and `West` (row 4) in Engagement; Next renders `true` for both. `Row(rowset, 0)` fails on both platforms."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `rowset` | rowset | Yes | A rowset from `LookupRows`, `LookupOrderedRows`, or a `BuildRowsetFrom*` function |
| `rowIndex` | number | Yes | 1-based index of the row to return |

## Example

```ampscript
%%[
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")
  IF RowCount(@rows) > 0 THEN
    SET @first = Row(@rows, 1)
    SET @idLength = Length(Field(@first, "Id"))
  ENDIF
]%%
%%=v(@idLength)=%%
```

Renders `18`: the first row of the Contact query carries an 18-character `Id`.

## Return value

**`row`** — the row at the given 1-based index, read with [`Field`](/next/ampscript/functions/field/).

## Behaviour

**Row 1 of a `RetrieveSalesforceObjects` rowset is readable.** `Row(@rows, 1)` on a live Contact query gave a row whose `Id` column had 18 characters.

**Rows of a `BuildRowSetFromString` rowset read back as `true`.** With `BuildRowSetFromString("North**South**East**West", "**")`, `Field(Row(@rs, 1), 1)` and `Field(Row(@rs, 4), 1)` both rendered `true`, in the variable form and in the nested inline form. The value comes back the same way from [`Field`](/next/ampscript/functions/field/) on such rows in general, so it is not clear whether `Row` or `Field` is the cause.

**Index 0 fails.** An email with `Row(@rs, 0)` saved and published, but rendering it failed with HTTP 500. Only pass indices from `1` up to `RowCount(rowset)`.

An index past the last row was not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--row" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--row" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [`Field`](/next/ampscript/functions/field/) — reads a column from the returned row
- [`RowCount`](/next/ampscript/functions/rowcount/) — the guard that keeps `rowIndex` in range
- [`RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — a rowset source proven in Next
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-row.html)
