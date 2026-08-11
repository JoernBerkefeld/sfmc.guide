---
layout: page
title: "SetObjectProperty"
description: "Sets a scalar (or nested-handle) property on a CreateObject handle. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/setobjectproperty/
platforms:
  - engagement
syntax: "SetObjectProperty(apiObject, propertyName, value)"
return_type: string
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

The second link in the SOAP object-builder chain. Given a handle from [`CreateObject`](/engagement/ampscript/functions/createobject/), `SetObjectProperty` sets one named property on it.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | A handle returned by `CreateObject` |
| `propertyName` | string | Yes | The property to set, e.g. `CustomerKey`, `ObjectType`, `Filter` |
| `value` | string \| object | Yes | The scalar value, or another `CreateObject` handle for nested properties |

## Example

```ampscript
%%[
  VAR @de
  SET @de = CreateObject("DataExtension")
  SetObjectProperty(@de, "CustomerKey", "MY_DE")
]%%
```

The property does not render anything on its own; it is read back only when the built object is executed. A nested handle can be set as the value — here a filter object becomes the `Filter` of a retrieve request:

```ampscript
%%[
  VAR @rr, @sfp
  SET @rr  = CreateObject("RetrieveRequest")
  SET @sfp = CreateObject("SimpleFilterPart")
  SetObjectProperty(@sfp, "Property", "CustomerKey")
  SetObjectProperty(@sfp, "SimpleOperator", "equals")
  SetObjectProperty(@rr, "Filter", @sfp)
]%%
```

## Return value

**`string`** — an empty string. The call is used for its side effect on the handle, not its return value.

## Behaviour

**Scalars are read back through a round-trip.** Setting `CustomerKey`, `Name` and `Description` on a `DataExtension` and running [`InvokeCreate`](/engagement/ampscript/functions/invokecreate/) returned `OK` with the message `Data Extension created.` — proving the scalars landed.

**The value can be a nested handle.** Setting a `SimpleFilterPart` handle as the `Filter` of a `RetrieveRequest` produced a working filtered retrieve (one matching row). So `value` is not restricted to scalars.

**Booleans go as strings.** Pass `"true"` / `"false"` (or `1` / `0`) for boolean properties such as `IsPrimaryKey` — never a bare token.

{% include test-script.html bundle="ampscript-functions--setobjectproperty" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`SetObjectProperty`](https://ssjs.guide/platform-functions/setobjectproperty/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) — creates the handle
- [`AddObjectArrayItem`](/engagement/ampscript/functions/addobjectarrayitem/) — the array-valued counterpart
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-set-object-property.html) · [ampscript.guide](https://ampscript.guide/setobjectproperty/)
