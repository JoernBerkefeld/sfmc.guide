---
layout: page
title: "LookupOrderedRows"
description: "Returns a sorted, row-limited rowset of matching rows from a data extension. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the sort direction and the row limit."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lookuporderedrows/
platforms:
  - engagement
syntax: "LookupOrderedRows(dataExt, numRows, sortColumn, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: rowset
min_args: 5
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
| `numRows` | number | Yes | Maximum rows to return; a value below 1 returns all matches (up to 2,000) |
| `sortColumn` | string | Yes | Column to sort by, optionally followed by `ASC` or `DESC` |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = LookupOrderedRows("AMP_VERIFY_SCRATCH", 2, "Score ASC", "FirstName", "Alice")
]%%
Top Id: %%=v(Field(Row(@rows, 1), "Id"))=%% Score: %%=v(Field(Row(@rows, 1), "Score"))=%%
```

With Alice rows scoring 10, 20 and 30, renders `Top Id: O1 Score: 10` — the lowest score first.

Flip the direction and cap the count to page results, newest first:

```ampscript
%%[
  VAR @recent
  SET @recent = LookupOrderedRows("AMP_VERIFY_SCRATCH", 5, "Score DESC", "FirstName", "Alice")
]%%
Highest score: %%=v(Field(Row(@recent, 1), "Score"))=%%
```

Renders `Highest score: 30`.

## Return value

**`rowset`** — matching rows sorted by `sortColumn` and capped at `numRows`, read 1-based with [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/).

A no-match returns an empty rowset; guard with `RowCount`.

## Behaviour

**Sorts by the named column in the requested direction.** `Score ASC` returned the score-10 row first, then score-20; `Score DESC` returned the score-30 row first.

**`numRows` caps the returned count.** With three matching rows, `numRows` of `1` returned a single row.

**Matching on the search criteria is case-insensitive.** A search for `Alice` also returned the row whose `FirstName` was lowercase `alice`. Use [`LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) for a case-sensitive comparison.

**A no-match returns an empty rowset.** `RowCount` on it is `0`; the page does not abort.

{% include test-script.html bundle="ampscript-functions--lookuporderedrows" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Check the official reference |

## See also

- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — unordered matching rows
- [`LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) — the case-sensitive counterpart
- [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) — read the returned rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-ordered-rows.html) · [ampscript.guide](https://ampscript.guide/lookuporderedrows/)
