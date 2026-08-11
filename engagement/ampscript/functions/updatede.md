---
layout: page
title: "UpdateDE"
description: "Updates existing rows in a data extension and returns an empty string. The email-context twin of UpdateData — the second argument is the search-pair count. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/updatede/
platforms:
  - engagement
syntax: "UpdateDE(dataExt, columnValuePairs, searchColumnName1, searchValue1[, searchColumnNameN, searchValueN, ...], columnToUpdate1, updatedValue1[, columnToUpdateN, updatedValueN, ...])"
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
  UpdateDE("AMP_VERIFY_SCRATCH", 1, "Id", "D1", "FirstName", "Dorian", "Score", 33)
]%%
```

Renders nothing — `UpdateDE` returns an empty string. The `1` after the data extension is the **search-pair count**: one pair (`"Id", "D1"`) selects the row, the rest are the new values. A **later** render reads back `FirstName=[Dorian] Score=[33]`.

A realistic use flips a status field inside a send:

```ampscript
%%[
  UpdateDE("Subscribers", 1, "SubscriberKey", _subscriberkey, "LastSeen", Now())
]%%
```

## Return value

**`string`** — always an empty string, so nothing is emitted. This is the only runtime difference from [`UpdateData`](/engagement/ampscript/functions/updatedata/), which returns the updated-row count. Use the `*DE` family inside email sends; use the `*Data` family on CloudPages.

## Behaviour

**The second argument is a count, not data.** `columnValuePairs` states how many following pairs are search criteria; everything after them is update values — identical to [`UpdateData`](/engagement/ampscript/functions/updatedata/).

**A no-match is a silent no-op** — no error, no abort, nothing written.

**Updates are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single render; confirm the update in a subsequent render.

{% include test-script.html bundle="ampscript-functions--updatede" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`UpdateData`](/engagement/ampscript/functions/updatedata/) — the CloudPage twin; same arguments, returns the updated-row count
- [`UpsertDE`](/engagement/ampscript/functions/upsertde/) — insert or update in one call
- [`InsertDE`](/engagement/ampscript/functions/insertde/) · [`DeleteDE`](/engagement/ampscript/functions/deletede/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-update-de.html) · [ampscript.guide](https://ampscript.guide/updatede/)
