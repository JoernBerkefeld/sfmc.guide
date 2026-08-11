---
layout: page
title: "UpsertDE"
description: "Inserts a row if no match exists, otherwise updates the matching rows, and returns an empty string. The email-context twin of UpsertData — the second argument is the search-pair count. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/upsertde/
platforms:
  - engagement
syntax: "UpsertDE(dataExt, columnValuePairs, searchColumnName1, searchValue1[, searchColumnNameN, searchValueN, ...], columnToUpsert1, upsertedValue1[, columnToUpsertN, upsertedValueN, ...])"
return_type: string
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
  UpsertDE("AMP_VERIFY_SCRATCH", 1, "Id", "D2", "FirstName", "Enzo", "Score", 8)
]%%
```

Renders nothing — `UpsertDE` returns an empty string. With no existing `D2` row this takes the **insert** path; a second call with new values takes the **update** path. A **later** render reads back the current values (`FirstName=[Enrico] Score=[88]` after the second call).

The `1` after the data extension is the **search-pair count** — here one pair (`"Id", "D2"`) decides insert-vs-update.

## Return value

**`string`** — always an empty string, so nothing is emitted. This is the only runtime difference from [`UpsertData`](/engagement/ampscript/functions/upsertdata/), which returns the affected-row count. Use the `*DE` family inside email sends; use the `*Data` family on CloudPages.

## Behaviour

**Insert-or-update on the search key.** A match is updated; no match is inserted. This avoids the duplicate-key abort that [`InsertDE`](/engagement/ampscript/functions/insertde/) raises when the row already exists.

**The second argument is the search-pair count** — identical semantics to [`UpdateDE`](/engagement/ampscript/functions/updatede/).

**Writes are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single render; confirm the upsert in a subsequent render.

{% include test-script.html bundle="ampscript-functions--upsertde" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`UpsertData`](/engagement/ampscript/functions/upsertdata/) — the CloudPage twin; same arguments, returns the affected-row count
- [`InsertDE`](/engagement/ampscript/functions/insertde/) · [`UpdateDE`](/engagement/ampscript/functions/updatede/) · [`DeleteDE`](/engagement/ampscript/functions/deletede/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-upsert-de.html) · [ampscript.guide](https://ampscript.guide/upsertde/)
