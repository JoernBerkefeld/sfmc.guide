---
layout: page
title: "DeleteData"
description: "Deletes matching rows from a data extension and returns the number of rows deleted. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the return value and what a no-match returns."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/deletedata/
platforms:
  - engagement
syntax: "DeleteData(dataExt, columnName1, valueToDelete1[, columnNameN, valueToDeleteN, ...])"
return_type: number
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
| `dataExt` | string | Yes | Name or external key of the data extension to delete from |
| `columnName1` | string | Yes | First column to match on |
| `valueToDelete1` | string \| number | Yes | Value the first column must equal |
| `columnNameN` | string | No | Further match columns, each paired with a value |
| `valueToDeleteN` | string \| number | No | Value for the corresponding further column |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = DeleteData("AMP_VERIFY_SCRATCH", "Id", "X1")
]%%
Deleted: %%=v(@rows)=%%
```

Renders `Deleted: 1` when a row with `Id` `X1` exists. Reading back in a **later** render confirms it is gone: `rows=[0]`.

Delete on a composite criterion by adding more column/value pairs:

```ampscript
%%[
  DeleteData("Contacts", "Region", "EU", "Status", "inactive")
]%%
```

## Return value

**`number`** — the count of rows deleted. A no-match returns `0` and deletes nothing: `DeleteData("AMP_VERIFY_SCRATCH", "Id", "NOPE")` returned `0`. The twin [`DeleteDE`](/engagement/ampscript/functions/deletede/) performs the same delete but returns an empty string.

## Behaviour

**Ordered column/value match pairs.** Arguments after `dataExt` are read as `column, value, column, value, …`; every pair must match for a row to be deleted. This is the `*Data` argument shape.

**A no-match is a silent no-op** — no error, no abort, `0` returned.

**Deletes are visible immediately to fresh reads.** Confirm a delete with [`RowCount`](/engagement/ampscript/functions/rowcount/)`(`[`LookupRows`](/engagement/ampscript/functions/lookuprows/)`(...))` in a subsequent render; the AMPscript within-render read cache means a row read earlier in the same render may still appear until the render ends.

{% include test-script.html bundle="ampscript-functions--deletedata" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`DeleteDE`](/engagement/ampscript/functions/deletede/) — the email-context twin; same arguments, returns an empty string
- [`InsertData`](/engagement/ampscript/functions/insertdata/) · [`UpdateData`](/engagement/ampscript/functions/updatedata/) · [`UpsertData`](/engagement/ampscript/functions/upsertdata/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-delete-data.html) · [ampscript.guide](https://ampscript.guide/deletedata/)
