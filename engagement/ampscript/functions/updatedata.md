---
layout: page
title: "UpdateData"
description: "Updates existing rows in a data extension and returns the number of rows updated. The second argument is the search-pair count. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/updatedata/
platforms:
  - engagement
syntax: "UpdateData(dataExt, columnValuePairs, searchColumnName1, searchValue1[, searchColumnNameN, searchValueN, ...], columnToUpdate1, updatedValue1[, columnToUpdateN, updatedValueN, ...])"
return_type: number
min_args: 6
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the data extension to update |
| `columnValuePairs` | number | Yes | Count of search column/value pairs that follow |
| `searchColumnName1` | string | Yes | First column to match on |
| `searchValue1` | string \| number | Yes | Value the first search column must equal |
| `searchColumnNameN` | string | No | Further search columns, each paired with a value |
| `searchValueN` | string \| number | No | Value for the corresponding further search column |
| `columnToUpdate1` | string | Yes | First column to write |
| `updatedValue1` | string \| number | Yes | New value for the first updated column |
| `columnToUpdateN` | string | No | Further columns to write, each paired with a value |
| `updatedValueN` | string \| number | No | New value for the corresponding further column |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = UpdateData("AMP_VERIFY_SCRATCH", 1, "Id", "W1", "FirstName", "Ingrid", "Score", 99)
]%%
Updated: %%=v(@rows)=%%
```

Renders `Updated: 1`. The `1` after the data extension is the **search-pair count** — one pair (`"Id", "W1"`) identifies the row; the remaining pairs are the new values. Reading the row back in a **later** render shows `FirstName=[Ingrid] Score=[99]`.

Match on a composite criterion by raising the count:

```ampscript
%%[
  UpdateData("Contacts", 2, "Region", "EU", "Status", "active", "LastTouched", Now())
]%%
```

Here `2` search pairs (`Region`/`Status`) select the rows to update.

## Return value

**`number`** — the count of rows updated. A no-match returns `0` and mutates nothing: `UpdateData("AMP_VERIFY_SCRATCH", 1, "Id", "NOPE", "FirstName", "Ghost")` returned `0`. The twin [`UpdateDE`](/engagement/ampscript/functions/updatede/) performs the same update but returns an empty string.

## Behaviour

**The second argument is a count, not data.** `columnValuePairs` tells the function how many of the following pairs are search criteria; everything after them is treated as update values. Getting this count wrong misassigns search and update pairs.

**A no-match is a silent no-op.** No error, no abort — the call returns `0`.

**Updates are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single render: after `UpdateData`, a [`Lookup`](/engagement/ampscript/functions/lookup/) of a row already read earlier in the **same** render returns the stale pre-update value. A fresh render shows the new value.

{% include test-script.html bundle="ampscript-functions--updatedata" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`UpdateDE`](/engagement/ampscript/functions/updatede/) — the email-context twin; same arguments, returns an empty string
- [`UpsertData`](/engagement/ampscript/functions/upsertdata/) — insert or update in one call
- [`InsertData`](/engagement/ampscript/functions/insertdata/) · [`DeleteData`](/engagement/ampscript/functions/deletedata/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-update-data.html) · [ampscript.guide](https://ampscript.guide/updatedata/)
