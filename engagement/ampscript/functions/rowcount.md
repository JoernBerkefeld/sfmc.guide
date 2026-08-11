---
layout: page
title: "RowCount"
description: "Returns the number of rows in a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that it returns zero for an empty rowset and never aborts."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/rowcount/
platforms:
  - engagement
  - next
syntax: "RowCount(rowset)"
return_type: number
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `rowset` | rowset | Yes | A rowset from `LookupRows`, `LookupOrderedRows`, `ExecuteFilter`, or a `BuildRowsetFrom*` function |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
]%%
Matches: %%=v(RowCount(@rows))=%%
```

With two Alice rows, renders `Matches: 2`.

Because it returns `0` rather than aborting on an empty rowset, it is the safe guard before reading any row:

```ampscript
%%[
  VAR @rows
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")
  IF RowCount(@rows) > 0 THEN
]%%
    First: %%=v(Field(Row(@rows, 1), "Id"))=%%
%%[ ENDIF ]%%
```

## Return value

**`number`** — the count of rows in the rowset, `0` for an empty one.

There is no sentinel: the result is a bare non-negative integer.

## Behaviour

**Counts the rows in a rowset.** A populated rowset from `LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Alice")` returned `2`.

**Returns zero for an empty rowset and never aborts.** `RowCount(LookupRows("AMP_VERIFY_SCRATCH", "FirstName", "Zoltan"))` returned `0`, making it the correct pre-read guard when a lookup may match nothing.

{% include test-script.html bundle="ampscript-functions--rowcount" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — produces the rowset to count
- [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) — read a counted rowset
- [`DataExtensionRowCount`](/engagement/ampscript/functions/dataextensionrowcount/) — counts every row in a data extension by name
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-row-count.html) · [ampscript.guide](https://ampscript.guide/rowcount/)
