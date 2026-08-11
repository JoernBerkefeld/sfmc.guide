---
layout: page
title: "LookupOrderedRowsCS"
description: "Returns a sorted, row-limited rowset of matching rows using a case-sensitive comparison. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the difference from the case-insensitive LookupOrderedRows."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lookuporderedrowscs/
platforms:
  - engagement
syntax: "LookupOrderedRowsCS(dataExt, numRows, sortColumn, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
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
| `searchValue1` | string \| number | Yes | Value the first column must equal, compared case-sensitively |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = LookupOrderedRowsCS("AMP_VERIFY_SCRATCH", 5, "Score ASC", "FirstName", "Alice")
]%%
Matches: %%=v(RowCount(@rows))=%% first Id: %%=v(Field(Row(@rows, 1), "Id"))=%%
```

With rows `Alice`, `Alice` and lowercase `alice`, renders `Matches: 2 first Id: O1` — the lowercase row is excluded and the remaining two are ordered by score.

The contrast with the case-insensitive [`LookupOrderedRows`](/engagement/ampscript/functions/lookuporderedrows/) on the same data:

```ampscript
%%[
  VAR @cs, @ci
  SET @cs = RowCount(LookupOrderedRowsCS("AMP_VERIFY_SCRATCH", 5, "Score ASC", "FirstName", "Alice"))
  SET @ci = RowCount(LookupOrderedRows("AMP_VERIFY_SCRATCH", 5, "Score ASC", "FirstName", "Alice"))
]%%
CS: %%=v(@cs)=%% CI: %%=v(@ci)=%%
```

Renders `CS: 2 CI: 3`.

## Return value

**`rowset`** — matching rows selected case-sensitively, sorted by `sortColumn` and capped at `numRows`, read 1-based with [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/).

A no-match returns an empty rowset; guard with `RowCount`.

## Behaviour

**Case-sensitive matching combined with ordering and a row limit.** It is [`LookupOrderedRows`](/engagement/ampscript/functions/lookuporderedrows/) with the case-sensitive comparison of [`LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/). On a fixture with `Alice`, `Alice` and `alice`, a search for `Alice` returned `2` rows (ordered by score) and excluded the lowercase row that the case-insensitive form included.

**`numRows`, `sortColumn` and the variadic criteria behave as in `LookupOrderedRows`.** Only the comparison of the search values differs.

{% include test-script.html bundle="ampscript-functions--lookuporderedrowscs" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Check the official reference |

## See also

- [`LookupOrderedRows`](/engagement/ampscript/functions/lookuporderedrows/) — the case-insensitive counterpart
- [`LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) — case-sensitive without ordering
- [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) — read the returned rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-ordered-rows-cs.html) · [ampscript.guide](https://ampscript.guide/lookuporderedrowscs/)
