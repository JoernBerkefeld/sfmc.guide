---
layout: page
title: "AMPscript RowCount (Next)"
description: "Count the rows of a rowset with AMPscript RowCount in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/rowcount/
platforms:
  - next
syntax: "RowCount(rowset)"
return_type: number
min_args: 1
max_args: 1
verification: verified
differs_from_docs: false
engagement: same
mcn_tested: 2026-11-23
engagement_note: "Engagement gives the same counts: `3` for a split string, `1` for a string without the delimiter and `0` for an empty rowset."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `rowset` | rowset | Yes | A rowset from `LookupRows`, `LookupOrderedRows`, `ExecuteFilter`, or a `BuildRowsetFrom*` function |

## Example

```ampscript
%%=RowCount(BuildRowSetFromString("a::b::c", "::"))=%%
```

Renders `3`.

Because an empty rowset gives `0` rather than an error, it is the guard to use before reading a row:

```ampscript
%%[
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")
  IF RowCount(@rows) > 0 THEN
    SET @idLength = Length(Field(Row(@rows, 1), "Id"))
  ENDIF
]%%
%%=v(@idLength)=%%
```

Renders `18`.

## Return value

**`number`** — how many rows the rowset holds, `0` for an empty one.

## Behaviour

**Counts the rows.** `RowCount(BuildRowSetFromString("a::b::c", "::"))` gives `3`; a multi-character delimiter works.

**A string without the delimiter is one row.** `RowCount(BuildRowSetFromString("NoDelimiterHere", ","))` gives `1`.

**An empty rowset gives zero.** `RowCount` on `BuildRowsetFromJSON("[]", "$[*]", 1)` renders `0`, and so does `RowCount` on a `RetrieveSalesforceObjects` query that matches no record. Neither fails.

{% include test-script.html bundle="next-ampscript-functions--rowcount" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

{% include platform-compare.html %}

## See also

- [`RowCount` in Marketing Cloud Engagement](/engagement/ampscript/functions/rowcount/) — how it behaves there
- [`Row`](/next/ampscript/functions/row/)
- [`Field`](/next/ampscript/functions/field/) — read a counted rowset
- [`RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) — produces a rowset to count
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-row-count.html)
