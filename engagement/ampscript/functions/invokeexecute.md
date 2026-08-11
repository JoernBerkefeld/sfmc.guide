---
layout: page
title: "InvokeExecute"
description: "Runs the SOAP API Execute verb on an ExecuteRequest and returns a rowset of results. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokeexecute/
platforms:
  - engagement
syntax: "InvokeExecute(executeRequest[, @statusMessage, @requestId])"
return_type: rowset
min_args: 1
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

Runs the SOAP **Execute** verb on an `ExecuteRequest` built with [`CreateObject`](/engagement/ampscript/functions/createobject/). Returns a **rowset** of per-item results; the OverallStatus and a RequestID GUID go to out-variables.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `executeRequest` | object | Yes | An `ExecuteRequest` whose `Name` is the verb to run |
| `@statusMessage` | string | No | Out-variable that receives the OverallStatus |
| `@requestId` | string | No | Out-variable that receives the RequestID GUID |

## Example

```ampscript
%%[
  VAR @er, @st, @req, @rows
  SET @er = CreateObject("ExecuteRequest")
  SetObjectProperty(@er, "Name", "SomeExecuteVerb")
  SET @rows = InvokeExecute(@er, @st, @req)
  OutputLine(Concat("rowCount=[", RowCount(@rows), "] st=[", @st, "] req=[", @req, "]"))
]%%
```

For an unknown verb this renders `rowCount=[1] st=[Error] req=[<guid>]`, and row 1 carries `StatusCode=[Error] StatusMessage=[Unable to find a handler for the SomeExecuteVerb method.] ErrorCode=[0]`.

## Return value

**`rowset`** — the Results, one row per item, each exposing `StatusCode`, `StatusMessage` and `ErrorCode`. The `@statusMessage` out-variable receives the OverallStatus and `@requestId` receives a RequestID GUID.

## Behaviour

**The return is a rowset, not a status string.** Read each result with `Row(@rows, n)` and `Field(@row, "StatusCode" / "StatusMessage" / "ErrorCode")`. This differs from the create/update/delete executors, which return the OverallStatus directly.

**An unrecognised verb is reported in the result row, not by aborting.** Calling an unknown verb returned a single result row with `StatusCode=Error` and a `StatusMessage` naming the missing handler — the page still rendered HTTP 200.

{% include test-script.html bundle="ampscript-functions--invokeexecute" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokeExecute`](https://ssjs.guide/platform-functions/invokeexecute/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) — build the request
- [`InvokeRetrieve`](/engagement/ampscript/functions/invokeretrieve/) — the other rowset-returning executor
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-execute.html) · [ampscript.guide](https://ampscript.guide/invokeexecute/)
