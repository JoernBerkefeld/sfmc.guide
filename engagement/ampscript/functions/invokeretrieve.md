---
layout: page
title: "InvokeRetrieve"
description: "Runs the SOAP API Retrieve on a RetrieveRequest and returns a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokeretrieve/
platforms:
  - engagement
syntax: "InvokeRetrieve(retrieveRequest[, @statusMessage, @requestId])"
return_type: rowset
min_args: 1
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

The read-only executor. Runs the SOAP **Retrieve** on a `RetrieveRequest` built with [`CreateObject`](/engagement/ampscript/functions/createobject/) and returns a **rowset** — read it with `RowCount`, `Row` and `Field`. Unlike the write executors, the return value is the data, not a status string; the OverallStatus goes to the `@statusMessage` out-variable.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `retrieveRequest` | object | Yes | A `RetrieveRequest` built with `CreateObject` |
| `@statusMessage` | string | No | Out-variable that receives the OverallStatus |
| `@requestId` | string | No | Out-variable that receives the RequestID |

## Example

```ampscript
%%[
  VAR @rr, @st, @req, @rows
  SET @rr = CreateObject("RetrieveRequest")
  SetObjectProperty(@rr, "ObjectType", "DataExtension")
  AddObjectArrayItem(@rr, "Properties", "Name")
  AddObjectArrayItem(@rr, "Properties", "CustomerKey")
  VAR @sfp
  SET @sfp = CreateObject("SimpleFilterPart")
  SetObjectProperty(@sfp, "Property", "CustomerKey")
  SetObjectProperty(@sfp, "SimpleOperator", "equals")
  AddObjectArrayItem(@sfp, "Value", "MY_DE")
  SetObjectProperty(@rr, "Filter", @sfp)
  SET @rows = InvokeRetrieve(@rr, @st, @req)
  OutputLine(Concat("st=[", @st, "] rc=[", RowCount(@rows), "]"))
]%%
```

Renders `st=[OK] rc=[1]` when a data extension with that key exists.

## Return value

**`rowset`** — the retrieved rows; iterate with `RowCount`, `Row` and `Field`. The `@statusMessage` out-variable receives the OverallStatus (`OK` on a successful call) and `@requestId` receives the RequestID.

## Behaviour

**A match returns a populated rowset with status `OK`.** Retrieving a data extension definition by CustomerKey filter returned `st=OK`, `rc=1`, with the `Name` and `CustomerKey` fields readable from row 1.

**A no-match returns an empty rowset, not an error.** Filtering on a nonexistent CustomerKey returned `st=OK` with `rc=0` — an empty result, not a failure. Test for "not found" by checking `RowCount`, never by expecting an error status.

{% include test-script.html bundle="ampscript-functions--invokeretrieve" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokeRetrieve`](https://ssjs.guide/platform-functions/invokeretrieve/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) · [`AddObjectArrayItem`](/engagement/ampscript/functions/addobjectarrayitem/) — build the request
- [`InvokeExecute`](/engagement/ampscript/functions/invokeexecute/) — the other rowset-returning executor
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-retrieve.html) · [ampscript.guide](https://ampscript.guide/invokeretrieve/)
