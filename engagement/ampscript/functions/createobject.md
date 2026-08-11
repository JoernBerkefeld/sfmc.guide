---
layout: page
title: "CreateObject"
description: "Instantiates a named SOAP API object and returns a handle for SetObjectProperty, AddObjectArrayItem and the Invoke* executors. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/createobject/
platforms:
  - engagement
syntax: "CreateObject(typeName)"
return_type: object
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

CreateObject is the first link in the AMPscript SOAP object-builder chain — the AMPscript side of the shared Platform object/`Invoke*` API, paired 1:1 with the same-named SSJS Platform function. You build an object with `CreateObject`, populate it with [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) and [`AddObjectArrayItem`](/engagement/ampscript/functions/addobjectarrayitem/), then run it through one of the `Invoke*` executors.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `typeName` | string | Yes | The SOAP API object type to instantiate, e.g. `DataExtension`, `RetrieveRequest` |

## Example

```ampscript
%%[
  VAR @de
  SET @de = CreateObject("DataExtension")
  SetObjectProperty(@de, "CustomerKey", "MY_DE")
]%%
```

The handle returned by `CreateObject` is opaque — printing it yields nothing useful; its only job is to be threaded into the property setters and an executor.

A fuller build, assembling a retrieve request:

```ampscript
%%[
  VAR @rr
  SET @rr = CreateObject("RetrieveRequest")
  SetObjectProperty(@rr, "ObjectType", "DataExtension")
  AddObjectArrayItem(@rr, "Properties", "Name")
]%%
```

## Return value

**`object`** — an opaque handle to the newly created SOAP object. It is not a string or a rowset; it is only meaningful when passed to `SetObjectProperty`, `AddObjectArrayItem`, or an `Invoke*` function.

## Behaviour

**Flat type names resolve; dotted and wrapper names do not.** The following types were confirmed at runtime: `DataExtension`, `DataExtensionField`, `RetrieveRequest`, `SimpleFilterPart`, `ExecuteRequest`, `QueryDefinition`. A dotted name such as `DataExtension.Field` and the SSJS-style `PerformRequest` wrapper do **not** resolve — calling `CreateObject` with them aborts the CloudPage with HTTP 422. Use the flat `DataExtensionField`, and pass the definition object itself (not a `PerformRequest`) to [`InvokePerform`](/engagement/ampscript/functions/invokeperform/).

{% include test-script.html bundle="ampscript-functions--createobject" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`CreateObject`](https://ssjs.guide/platform-functions/createobject/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) · [`AddObjectArrayItem`](/engagement/ampscript/functions/addobjectarrayitem/) — populate the handle
- [`InvokeCreate`](/engagement/ampscript/functions/invokecreate/) · [`InvokeRetrieve`](/engagement/ampscript/functions/invokeretrieve/) · [`InvokeUpdate`](/engagement/ampscript/functions/invokeupdate/) · [`InvokeDelete`](/engagement/ampscript/functions/invokedelete/) · [`InvokeExecute`](/engagement/ampscript/functions/invokeexecute/) · [`InvokePerform`](/engagement/ampscript/functions/invokeperform/) — execute the handle
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-create-object.html) · [ampscript.guide](https://ampscript.guide/createobject/)
