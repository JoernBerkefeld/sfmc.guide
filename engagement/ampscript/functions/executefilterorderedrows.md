---
layout: page
title: "ExecuteFilterOrderedRows"
description: "Executes a data-extension-based data filter and returns the matching rows sorted by a column and capped to a row count. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/executefilterorderedrows/
platforms:
  - engagement
syntax: "ExecuteFilterOrderedRows(dataFilterExternalId, numRows, sortColumn)"
return_type: rowset
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataFilterExternalId` | string | Yes | External key of a data filter that is based on a data extension |
| `numRows` | number | Yes | Maximum number of rows to return |
| `sortColumn` | string | Yes | Sort expression as `Column direction`, e.g. `Score desc` |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = ExecuteFilterOrderedRows("AMP_VERIFY_FILTER", 1, "Score desc")
]%%
Top match: %%=v(Field(Row(@rows, 1), "Id"))=%%
```

With a filter `FirstName Equals "Alice"` over rows `F1` (Score 10) and `F3` (Score 30), renders `Top match: F3` — the highest-scored Alice row, returned as the single row allowed by `numRows`.

Raise `numRows` and flip the direction to page a longer, ascending list:

```ampscript
%%[
  VAR @rows, @i, @r
  SET @rows = ExecuteFilterOrderedRows("AMP_VERIFY_FILTER", 10, "Score asc")
  FOR @i = 1 TO RowCount(@rows) DO
    SET @r = Row(@rows, @i)
]%%
%%=v(Field(@r, "Score"))=%%
%%[
  NEXT @i
]%%
```

## Return value

**`rowset`** — the filtered rows, sorted by `sortColumn` and truncated to `numRows`. Pass it to [`RowCount`](/engagement/ampscript/functions/rowcount/), [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/). A filter that matches nothing returns an empty rowset.

## Behaviour

**Sorts and caps in one call.** `numRows` limits the row count and `sortColumn` orders the result — with `numRows` `1` and `Score desc`, exactly the single top row was returned even though two rows matched the filter.

**The sort argument is a `Column direction` string.** Supply the column name followed by `asc` or `desc`.

**Only data-extension-based filters.** As with [`ExecuteFilter`](/engagement/ampscript/functions/executefilter/), the referenced filter must be built on a data extension, and the value comparison is case-insensitive.

{% include test-script.html bundle="ampscript-functions--executefilterorderedrows" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ExecuteFilter`](/engagement/ampscript/functions/executefilter/) — same, without the sort column or row cap
- [`LookupOrderedRows`](/engagement/ampscript/functions/lookuporderedrows/) — sort and cap an inline data-extension lookup without a saved filter
- [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) · [`RowCount`](/engagement/ampscript/functions/rowcount/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-execute-filter-ordered-rows.html) · [ampscript.guide](https://ampscript.guide/executefilterorderedrows/)
