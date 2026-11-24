---
layout: page
title: "AMPscript Field (Next)"
description: "Read a column from a rowset row with AMPscript Field in Marketing Cloud Next. Syntax and the outputs a Marketing Cloud Next email actually rendered, including where they differ from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/field/
platforms:
  - next
syntax: "Field(row, fieldName[, exceptionIfNotFound])"
return_type: string
min_args: 2
max_args: 3
verification: verified
differs_from_docs: true
engagement: differs
signature_differs: true
mcn_tested: 2026-11-23
engagement_note: "On a row from `BuildRowSetFromString(\"a,b,c\",\",\")`, Engagement's `Field(row,\"Value\")` returns `a` where Next returns the flag (third argument, `true` when omitted), not the cell. With a missing column, Engagement returns an empty string for a falsy third argument and aborts for a truthy one; Next renders the flag as `true` or `false` instead of either. Engagement reads a `BuildRowsetFromJSON` column by case-insensitive name or by ordinal (`NYC`); Next returned an empty string for both. On `BuildRowSetFromXML` rows Engagement returns the node content (`200.00`, `IND`); Next returns the flag (`false` for `Value`, `Xml` and attribute columns read with `0`, `true` by position)."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `row` | row | Yes | A row returned by `Row(rowset, index)` |
| `fieldName` | string | Yes | Name of the column to read |
| `exceptionIfNotFound` | string \| boolean \| number | No | In Next this did not control aborting: on rowsets built from a string, `Field` rendered this flag (`true` for `true`, `1`, `"true"`; `false` for the other tested spellings, `"1"` included) instead of the cell, for existing and missing columns alike. Next saves `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

## Example

```ampscript
%%[
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")
  IF RowCount(@rows) > 0 THEN
    SET @idLength = Length(Field(Row(@rows, 1), "Id"))
  ENDIF
]%%
%%=v(@idLength)=%%
```

Renders `18`: the first Contact's `Id` column was read as an 18-character record ID.

## Return value

**`string`** — on a rowset from `RetrieveSalesforceObjects`, the value of the named column. On rowsets built from a string or from XML, Next returned the flag (third argument, `true` when omitted) instead of the cell; on a `BuildRowsetFromJSON` row it returned an empty string (see Behaviour).

## Behaviour

**Reads a column of a `RetrieveSalesforceObjects` row.** `Field(Row(@rows, 1), "Id")` on a live Contact query returned an 18-character ID.

**On a `BuildRowSetFromString` row it returns the flag, not the cell.** With the row from `BuildRowSetFromString("a,b,c", ",")` stored in a variable, `Field(@row, "Value")` rendered `true`: the flag (third argument, `true` when omitted), not `a`. The nested inline form `Field(Row(BuildRowSetFromString(...), 1), "Value")` rendered `true` as well.

**`Field(row, 0)` gave different results depending on how it was written.** Written as `SET @rows = BuildRowSetFromString("a,b,c", ",")`, `SET @row = Row(@rows, 1)`, `SET @v = Field(@row, 0)`, then `%%=v(@v)=%%`, it rendered `true`. The nested form `%%=Field(Row(BuildRowSetFromString("a,b,c", ","), 1), 0)=%%` broke the render (HTTP 500), as it aborts in Engagement (see [`BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/)).

**The third argument shows up in the output.** Next returns the flag, not the cell. On that same row, `Field(@row, "Value", flag)` rendered `true` for `true`, `1` and `"true"`, and `false` for `false`, `0`, `"false"`, `"0"` and also `"1"`. A missing column behaves the same way: `Field(@row, "NoSuchColumn", flag)` rendered `true` for `true`, `1` and `"true"`, and `false` for `0`, `false`, `"0"`, `"false"`, `"1"` and `"notabool"`. None of these aborted.

**A missing column without the third argument fails.** An email with `Field(@row, "NoSuchColumn")` saved and published, but rendering it failed with HTTP 500.

**An empty cell stays empty.** On the empty third row of `BuildRowSetFromString("a,b,", ",")`, `Field(@row, "Value", "DEF")` rendered an empty string; the third argument is not used as a default.

**On `BuildRowSetFromXML` rows it returns the flag too.** With XML built from `Char()` (so the email save does not strip the tags), the row count is right, but `Field(Row(@rows, 2), "Value", 0)` gives `false` instead of `200.00`, and so do the `Xml` column and the `origin_att` and `carrier_att` columns read with `0`. Reading by position (`Field(row, 1)` to `Field(row, 5)`) gives `true`. See [`BuildRowSetFromXML`](/next/ampscript/functions/buildrowsetfromxml/).

**`BuildRowsetFromJSON` columns came back empty.** On a row from `BuildRowsetFromJSON` whose `Dest` column holds `NYC`, both `Field(@row, "dest")` and `Field(@row, 2)` rendered an empty string.

{% include test-script.html bundle="next-ampscript-functions--field" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--field" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The cell value is not returned on `BuildRowSetFromString` and `BuildRowSetFromXML` rows.** The reference describes `Field` as handing back the content of the named column. On the first row of `BuildRowSetFromString("a,b,c", ",")`, Next rendered `true` for `Field(@row, "Value")` instead of `a`, and with an explicit third argument it rendered that flag as `true` or `false` instead of the cell. The flag also comes back on `BuildRowSetFromXML` rows (`Value`, `Xml` and attribute columns) and on the `Value` column of `BuildRowsetFromJSON` rows, while named object columns of `BuildRowsetFromJSON` rows and `RetrieveSalesforceObjects` rows return the value. [Card](/next/differs-from-docs/#field-returns-flag-not-value)
- **The third argument does not decide between empty string and error.** The reference says a falsy flag gives an empty string for a missing column and a truthy (default) flag raises an error. In Next, a missing column on a `BuildRowSetFromString` row rendered `false` for `false`, `0`, `"false"`, `"0"` and also `"1"`, and rendered `true` for `true`, `1` and `"true"`, without any error. On a `BuildRowsetFromJSON` row, the two-argument call on a column that is not there rendered an empty string instead of failing. Only the two-argument call on a `BuildRowSetFromString` row failed (HTTP 500). [Card](/next/differs-from-docs/#field-flag-not-honoured)

{% include platform-compare.html %}

## See also

- [`Row`](/next/ampscript/functions/row/) — returns the row this reads from
- [`RowCount`](/next/ampscript/functions/rowcount/) — guard before reading a row
- [`RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — the rowset source Field read correctly
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-field.html)
