---
layout: page
title: "DeleteDE"
description: "Deletes matching rows from a data extension and returns an empty string. The email-context twin of DeleteData — runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/deletede/
platforms:
  - engagement
syntax: "DeleteDE(dataExt, columnName1, valueToDelete1[, columnNameN, valueToDeleteN, ...])"
return_type: string
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
  DeleteDE("AMP_VERIFY_SCRATCH", "Id", "Y1")
]%%
```

Renders nothing — `DeleteDE` returns an empty string. Reading back in a **later** render confirms the row is gone: `rows=[0]`.

A realistic use removes a row inside a send:

```ampscript
%%[
  DeleteDE("PendingQueue", "SubscriberKey", _subscriberkey)
]%%
```

## Return value

**`string`** — always an empty string, so nothing is emitted. This is the only runtime difference from [`DeleteData`](/engagement/ampscript/functions/deletedata/), which returns the deleted-row count. Use the `*DE` family inside email sends; use the `*Data` family on CloudPages.

## Behaviour

**Ordered column/value match pairs.** Arguments after `dataExt` are read as `column, value, column, value, …` — identical to [`DeleteData`](/engagement/ampscript/functions/deletedata/); the families differ only in the return value.

**A no-match is a silent no-op** — no error, no abort, nothing deleted.

**Deletes are visible immediately to fresh reads.** Confirm with [`RowCount`](/engagement/ampscript/functions/rowcount/)`(`[`LookupRows`](/engagement/ampscript/functions/lookuprows/)`(...))` in a subsequent render; the AMPscript within-render read cache means a row read earlier in the same render may still appear until the render ends.

{% include test-script.html bundle="ampscript-functions--deletede" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`DeleteData`](/engagement/ampscript/functions/deletedata/) — the CloudPage twin; same arguments, returns the deleted-row count
- [`InsertDE`](/engagement/ampscript/functions/insertde/) · [`UpdateDE`](/engagement/ampscript/functions/updatede/) · [`UpsertDE`](/engagement/ampscript/functions/upsertde/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-delete-de.html) · [ampscript.guide](https://ampscript.guide/deletede/)
