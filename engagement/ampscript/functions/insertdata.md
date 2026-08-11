---
layout: page
title: "InsertData"
description: "Inserts a new row into a data extension using ordered column/value pairs and returns the number of rows inserted. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the return value and the read-back."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/insertdata/
platforms:
  - engagement
syntax: "InsertData(dataExt, columnName1, valueToInsert1[, columnNameN, valueToInsertN, ...])"
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
| `dataExt` | string | Yes | Name or external key of the data extension to insert into |
| `columnName1` | string | Yes | First column to write |
| `valueToInsert1` | string \| number | Yes | Value for the first column |
| `columnNameN` | string | No | Further columns, each paired with a value |
| `valueToInsertN` | string \| number | No | Value for the corresponding further column |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = InsertData("AMP_VERIFY_SCRATCH", "Id", "W1", "FirstName", "Ivan", "Score", 5)
]%%
Inserted: %%=v(@rows)=%%
```

Renders `Inserted: 1` — one row was written. Reading the row back in a **later** render confirms the values: `FirstName=[Ivan] Score=[5]`.

A realistic use writes a submission row from CloudPage form input:

```ampscript
%%[
  InsertData("Signups", "Email", RequestParameter("email"), "SignupDate", Now())
]%%
```

## Return value

**`number`** — the count of rows inserted (`1` on success). Unlike its email-context twin [`InsertDE`](/engagement/ampscript/functions/insertde/), which returns an empty string, `InsertData` returns the affected-row count and is intended for CloudPages and landing pages.

## Behaviour

**Ordered column/value pairs.** Arguments after `dataExt` are read as `column, value, column, value, …`. This is the `*Data` argument shape; the `*DE` family (`InsertDE`) takes the same ordered pairs but returns nothing.

**Inserting a duplicate primary key aborts the page.** A second insert with the same PK raises a runtime error that discards all page output — guard with a prior [`Lookup`](/engagement/ampscript/functions/lookup/) or use [`UpsertData`](/engagement/ampscript/functions/upsertdata/) when the row may already exist.

**Writes are not visible to same-render reads of a row already read.** AMPscript caches data-extension row reads within a single page render; read a freshly inserted row back in a subsequent render to confirm it.

{% include test-script.html bundle="ampscript-functions--insertdata" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`InsertDE`](/engagement/ampscript/functions/insertde/) — the email-context twin; same arguments, returns an empty string
- [`UpsertData`](/engagement/ampscript/functions/upsertdata/) — insert or update in one call
- [`UpdateData`](/engagement/ampscript/functions/updatedata/) · [`DeleteData`](/engagement/ampscript/functions/deletedata/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-insert-data.html) · [ampscript.guide](https://ampscript.guide/insertdata/)
