---
layout: page
title: "UpsertData"
description: "Inserts a row if no match exists, otherwise updates the matching rows, and returns the number of rows affected. The second argument is the search-pair count. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/upsertdata/
platforms:
  - engagement
syntax: "UpsertData(dataExt, columnValuePairs, searchColumnName1, searchValue1[, searchColumnNameN, searchValueN, ...], columnToUpsert1, upsertedValue1[, columnToUpsertN, upsertedValueN, ...])"
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
| `dataExt` | string | Yes | Name or external key of the data extension to upsert into |
| `columnValuePairs` | number | Yes | Count of search column/value pairs that follow |
| `searchColumnName1` | string | Yes | First column to match on |
| `searchValue1` | string \| number | Yes | Value the first search column must equal |
| `searchColumnNameN` | string | No | Further search columns, each paired with a value |
| `searchValueN` | string \| number | No | Value for the corresponding further search column |
| `columnToUpsert1` | string | Yes | First column to write |
| `upsertedValue1` | string \| number | Yes | Value for the first written column |
| `columnToUpsertN` | string | No | Further columns to write, each paired with a value |
| `upsertedValueN` | string \| number | No | Value for the corresponding further column |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = UpsertData("AMP_VERIFY_SCRATCH", 1, "Id", "W2", "FirstName", "Uma", "Score", 7)
]%%
Affected: %%=v(@rows)=%%
```

Renders `Affected: 1`. With no existing `W2` row this takes the **insert** path; calling it again with new values takes the **update** path — both return `1`. A **later** render reads back the current values (`FirstName=[Umberto] Score=[77]` after the second call).

The `1` after the data extension is the **search-pair count** — here one pair (`"Id", "W2"`) decides insert-vs-update.

## Return value

**`number`** — the count of rows affected (inserted or updated). The twin [`UpsertDE`](/engagement/ampscript/functions/upsertde/) performs the same upsert but returns an empty string.

## Behaviour

**Insert-or-update on the search key.** If a row matches every search pair it is updated; otherwise a new row is inserted from the combined search and upsert columns. This avoids the duplicate-key abort that [`InsertData`](/engagement/ampscript/functions/insertdata/) raises when the row already exists.

**The second argument is the search-pair count** — identical semantics to [`UpdateData`](/engagement/ampscript/functions/updatedata/).

**Writes are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single render; confirm the upsert in a subsequent render.

{% include test-script.html bundle="ampscript-functions--upsertdata" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`UpsertDE`](/engagement/ampscript/functions/upsertde/) — the email-context twin; same arguments, returns an empty string
- [`InsertData`](/engagement/ampscript/functions/insertdata/) · [`UpdateData`](/engagement/ampscript/functions/updatedata/) · [`DeleteData`](/engagement/ampscript/functions/deletedata/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-upsert-data.html) · [ampscript.guide](https://ampscript.guide/upsertdata/)
