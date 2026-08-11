---
layout: page
title: "InsertDE"
description: "Inserts a new row into a data extension using ordered column/value pairs and returns an empty string. The email-context twin of InsertData — runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/insertde/
platforms:
  - engagement
syntax: "InsertDE(dataExt, columnName1, valueToInsert1[, columnNameN, valueToInsertN, ...])"
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
| `dataExt` | string | Yes | Name or external key of the data extension to insert into |
| `columnName1` | string | Yes | First column to write |
| `valueToInsert1` | string \| number | Yes | Value for the first column |
| `columnNameN` | string | No | Further columns, each paired with a value |
| `valueToInsertN` | string \| number | No | Value for the corresponding further column |

## Example

```ampscript
%%[
  InsertDE("AMP_VERIFY_SCRATCH", "Id", "D1", "FirstName", "Dora", "Score", 3)
]%%
```

Renders nothing — `InsertDE` returns an empty string. Reading the row back in a **later** render confirms the write: `rows=[1] FirstName=[Dora]`.

A realistic use inserts a row inside a send:

```ampscript
%%[
  InsertDE("SendLog", "SubscriberKey", _subscriberkey, "SentAt", Now())
]%%
```

## Return value

**`string`** — always an empty string, so nothing is emitted into the message. This is the only runtime difference from [`InsertData`](/engagement/ampscript/functions/insertdata/), which returns the inserted-row count. The `*DE` family is intended for email sends where you do not want a stray value printed; the `*Data` family is intended for CloudPages.

## Behaviour

**Ordered column/value pairs.** Arguments after `dataExt` are read as `column, value, column, value, …` — identical to [`InsertData`](/engagement/ampscript/functions/insertdata/). The families differ only in the return value, not the argument shape.

**Inserting a duplicate primary key aborts the page.** A second insert with the same PK raises a runtime error that discards all output — guard with a prior [`Lookup`](/engagement/ampscript/functions/lookup/) or use [`UpsertDE`](/engagement/ampscript/functions/upsertde/).

**Writes are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single render; confirm the insert in a subsequent render.

{% include test-script.html bundle="ampscript-functions--insertde" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`InsertData`](/engagement/ampscript/functions/insertdata/) — the CloudPage twin; same arguments, returns the inserted-row count
- [`UpsertDE`](/engagement/ampscript/functions/upsertde/) — insert or update in one call
- [`UpdateDE`](/engagement/ampscript/functions/updatede/) · [`DeleteDE`](/engagement/ampscript/functions/deletede/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-insert-de.html) · [ampscript.guide](https://ampscript.guide/insertde/)
