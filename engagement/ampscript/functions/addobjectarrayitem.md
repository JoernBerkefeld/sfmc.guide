---
layout: page
title: "AddObjectArrayItem"
description: "Appends an item — scalar or nested handle — to an array-valued property of a CreateObject handle. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/addobjectarrayitem/
platforms:
  - engagement
syntax: "AddObjectArrayItem(apiObject, propertyName, value)"
return_type: string
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

The third link in the SOAP object-builder chain — the one that constructs the nested and array-valued parts of a SOAP object. Where [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) sets a single value, `AddObjectArrayItem` **appends** to a collection, and can be called repeatedly to grow it.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | A handle returned by `CreateObject` |
| `propertyName` | string | Yes | The array-valued property, e.g. `Fields`, `Properties`, `Value` |
| `value` | string \| object | Yes | The scalar to append, or another `CreateObject` handle |

## Example

```ampscript
%%[
  VAR @rr
  SET @rr = CreateObject("RetrieveRequest")
  AddObjectArrayItem(@rr, "Properties", "Name")
  AddObjectArrayItem(@rr, "Properties", "CustomerKey")
]%%
```

Two calls append two column names to the request's `Properties` array. To build nested structure, append handles instead of scalars — here two `DataExtensionField` objects become the `Fields` of a data extension:

```ampscript
%%[
  VAR @de, @f1, @f2
  SET @de = CreateObject("DataExtension")
  SET @f1 = CreateObject("DataExtensionField")
  SetObjectProperty(@f1, "Name", "Id")
  SetObjectProperty(@f1, "FieldType", "Text")
  AddObjectArrayItem(@de, "Fields", @f1)
  SET @f2 = CreateObject("DataExtensionField")
  SetObjectProperty(@f2, "Name", "Val")
  SetObjectProperty(@f2, "FieldType", "Text")
  AddObjectArrayItem(@de, "Fields", @f2)
]%%
```

## Return value

**`string`** — an empty string. The call is used for its side effect on the handle.

## Behaviour

**Both scalar and nested-handle items work.** Appending scalar strings to `Properties` (of a retrieve) and to the `Value` array of a `SimpleFilterPart` produced a working filtered retrieve. Appending `DataExtensionField` handles to the `Fields` array of a `DataExtension` produced a data extension that [`InvokeCreate`](/engagement/ampscript/functions/invokecreate/) accepted with `OK` / `Data Extension created.`.

**Repeated calls accumulate.** Each call appends one more item; there is no replace semantics — call it once per array element.

{% include test-script.html bundle="ampscript-functions--addobjectarrayitem" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`AddObjectArrayItem`](https://ssjs.guide/platform-functions/addobjectarrayitem/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) — creates the handle and the items
- [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) — the scalar-property counterpart
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-add-object-array.html) · [ampscript.guide](https://ampscript.guide/addobjectarrayitem/)
