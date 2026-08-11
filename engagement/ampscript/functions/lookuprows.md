---
layout: page
title: "LookupRows"
description: "Returns every matching row of a data extension as a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the variadic criteria and what a no-match returns."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lookuprows/
platforms:
  - engagement
  - next
syntax: "LookupRows(dataExt, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: rowset
min_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
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
  VAR @rows
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
]%%
Matches: %%=v(RowCount(@rows))=%% first Id: %%=v(Field(Row(@rows, 1), "Id"))=%%
```

With two Alice rows (`A1`, `A3`), renders `Matches: 2 first Id: A1`.

Because it returns every match, iterate the rowset with `RowCount` and `Row`:

```ampscript
%%[
  VAR @rows, @i
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
  FOR @i = 1 TO RowCount(@rows) DO
]%%
    Row %%=v(@i)=%%: %%=v(Field(Row(@rows, @i), "Id"))=%%
%%[ NEXT @i ]%%
```

## Return value

**`rowset`** — one row for every row that matches all column/value pairs, in the data extension's natural order.

A no-match returns an empty rowset, not a null or an error: `RowCount(LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Zoltan"))` rendered `0`. Guard reads with `RowCount` — it never aborts.

## Behaviour

**Returns all matching rows, read 1-based.** Each row is addressed by 1-based index with [`Row`](/engagement/ampscript/functions/row/) and its columns read with [`Field`](/engagement/ampscript/functions/field/).

**A no-match returns an empty rowset.** `RowCount` on it is `0`; no error is raised and the page does not abort.

**Search criteria are variadic name/value pairs.** Arguments after `dataExt` are read as `column, value, column, value, …`; every pair must match. Matching is case-insensitive — use [`LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) for a case-sensitive comparison.

{% include test-script.html bundle="ampscript-functions--lookuprows" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Check the official reference |

## See also

- [`Lookup`](/engagement/ampscript/functions/lookup/) — returns a single scalar from the first match
- [`RowCount`](/engagement/ampscript/functions/rowcount/) · [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) — read the returned rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-rows.html) · [ampscript.guide](https://ampscript.guide/lookuprows/)
