---
layout: page
title: "LookupRowsCS"
description: "Returns every matching row of a data extension using a case-sensitive comparison. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the difference from the case-insensitive LookupRows."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lookuprowscs/
platforms:
  - engagement
syntax: "LookupRowsCS(dataExt, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
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
| `searchValue1` | string \| number | Yes | Value the first column must equal, compared case-sensitively |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = LookupRowsCS("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
]%%
Matches: %%=v(RowCount(@rows))=%%
```

With rows whose `FirstName` is `Alice`, `Alice` and lowercase `alice`, renders `Matches: 2` — the lowercase row is excluded.

The contrast with the case-insensitive [`LookupRows`](/engagement/ampscript/functions/lookuprows/) is the whole point:

```ampscript
%%[
  VAR @ci, @cs
  SET @ci = RowCount(LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice"))
  SET @cs = RowCount(LookupRowsCS("AMP_VERIFY_SCRATCH", "FirstName", "Alice"))
]%%
LookupRows: %%=v(@ci)=%% LookupRowsCS: %%=v(@cs)=%%
```

Renders `LookupRows: 3 LookupRowsCS: 2`.

## Return value

**`rowset`** — one row for every row whose columns match the criteria under a case-sensitive comparison, in the data extension's natural order.

A no-match returns an empty rowset; guard with `RowCount`.

## Behaviour

**The search value is compared case-sensitively.** On a fixture with `Alice`, `Alice` and `alice`, `LookupRowsCS("AMP_VERIFY_SCRATCH", "FirstName", "Alice")` returned `2` rows and `LookupRowsCS(..., "alice")` returned `1` — the exact-case rows only. The case-insensitive `LookupRows` returned all `3` on the same data.

**Otherwise identical to `LookupRows`.** Same rowset shape read 1-based with [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/), same variadic name/value criteria, same empty-rowset-on-no-match.

{% include test-script.html bundle="ampscript-functions--lookuprowscs" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Check the official reference |

## See also

- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — the case-insensitive counterpart
- [`LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) — case-sensitive with ordering and a row limit
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-rows-cs.html) · [ampscript.guide](https://ampscript.guide/lookuprowscs/)
