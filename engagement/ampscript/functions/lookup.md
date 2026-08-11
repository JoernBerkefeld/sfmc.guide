---
layout: page
title: "Lookup"
description: "Returns a single field value from the first matching row of a data extension. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the variadic name/value criteria and what a no-match returns."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/lookup/
platforms:
  - engagement
  - next
syntax: "Lookup(dataObject, returnColumn, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: string
min_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataObject` | string | Yes | Name or external key of the data extension to read |
| `returnColumn` | string | Yes | Column whose value is returned from the first matching row |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  VAR @name
  SET @name = Lookup("AMP_VERIFY_SCRATCH", "FirstName", "Id", "A2")
]%%
Name: %%=v(@name)=%%
```

With a row whose `Id` is `A2` and `FirstName` is `Bob`, renders `Name: Bob`.

Because the search accepts extra column/value pairs, a single call can filter on a composite criterion — here the one Alice row whose Score is 30:

```ampscript
%%[
  VAR @id
  SET @id = Lookup("AMP_VERIFY_SCRATCH", "Id", "FirstName", "Alice", "Score", 30)
]%%
```

Returns `A3` — the second Alice row — not the first Alice row whose Score is 10.

## Return value

**`string`** — the value of `returnColumn` from the first row that matches every column/value pair.

A no-match returns an empty string, not a null or an error: `Lookup("AMP_VERIFY_SCRATCH", "FirstName", "Id", "NOPE")` rendered nothing. There is no sentinel to test for — branch on `Empty()` or `RowCount(LookupRows(...))` when you need to distinguish absence.

## Behaviour

**Returns a scalar from the first matching row.** When several rows match, only the first row's `returnColumn` is returned; use [`LookupRows`](/engagement/ampscript/functions/lookuprows/) to read them all.

**A no-match returns an empty string.** No error is raised and the page does not abort — the call simply yields nothing.

**Search criteria are variadic name/value pairs.** Arguments after `returnColumn` are read as `column, value, column, value, …`; every pair must match for a row to qualify. Numeric criteria (`"Score", 30`) are accepted as numbers.

{% include test-script.html bundle="ampscript-functions--lookup" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — returns every matching row as a rowset
- [`Field`](/engagement/ampscript/functions/field/) · [`Row`](/engagement/ampscript/functions/row/) — read a column from a rowset row
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup.html) · [ampscript.guide](https://ampscript.guide/lookup/)
