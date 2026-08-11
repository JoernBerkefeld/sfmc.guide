---
layout: page
title: "Row"
description: "Returns a single row from a rowset by its 1-based index. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that index 0 aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/row/
platforms:
  - engagement
  - next
syntax: "Row(rowset, rowIndex)"
return_type: row
min_args: 2
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
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
  VAR @rows, @row
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
  SET @row = Row(@rows, 1)
]%%
First Id: %%=v(Field(@row, "Id"))=%%
```

With Alice rows `A1` and `A3`, renders `First Id: A1`.

Combine with `RowCount` to walk every row:

```ampscript
%%[
  VAR @rows, @i
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
  FOR @i = 1 TO RowCount(@rows) DO
]%%
    %%=v(Field(Row(@rows, @i), "Id"))=%%
%%[ NEXT @i ]%%
```

## Return value

**`row`** — the row object at the given 1-based index, whose columns are read with [`Field`](/engagement/ampscript/functions/field/).

There is no empty-row sentinel: an out-of-range index aborts rather than returning a testable value (see Behaviour).

## Behaviour

**Rowsets are read 1-based.** `Row(rowset, 1)` returns the first row; the first Alice row read back `Id` as `A1`.

**Index 0 or out-of-range aborts the page.** `Row(rowset, 0)` aborts the CloudPage with HTTP 422 — everything already rendered is discarded and there is no error value to test. Always guard the read with `RowCount(rowset) > 0` and only pass indices in `1..RowCount`.

{% include test-script.html bundle="ampscript-functions--row" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Field`](/engagement/ampscript/functions/field/) — reads a named column from the returned row
- [`RowCount`](/engagement/ampscript/functions/rowcount/) — the guard that keeps `rowIndex` in range
- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — produces the rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-row.html) · [ampscript.guide](https://ampscript.guide/row/)
