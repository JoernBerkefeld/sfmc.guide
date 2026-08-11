---
layout: page
title: "InvokeCreate"
description: "Runs the SOAP API Create on a CreateObject-built handle and returns the OverallStatus. Runtime-proven on a live Marketing Cloud Engagement CloudPage against a throwaway data extension."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokecreate/
platforms:
  - engagement
syntax: "InvokeCreate(apiObject, @statusMessage, @errorCode[, createOptions])"
return_type: string
min_args: 3
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

Executes the SOAP **Create** on an object built with [`CreateObject`](/engagement/ampscript/functions/createobject/). Returns the OverallStatus string and writes the human-readable message and numeric code to out-variables.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | The built SOAP object to create |
| `@statusMessage` | string | Yes | Out-variable that receives the status message |
| `@errorCode` | string | Yes | Out-variable that receives the numeric error code |
| `createOptions` | object | No | An optional CreateOptions object |

## Example

```ampscript
%%[
  VAR @de, @msg, @err
  SET @de = CreateObject("DataExtension")
  SetObjectProperty(@de, "CustomerKey", "MY_SCRATCH_DE")
  SetObjectProperty(@de, "Name", "MY_SCRATCH_DE")
  VAR @f
  SET @f = CreateObject("DataExtensionField")
  SetObjectProperty(@f, "Name", "Id")
  SetObjectProperty(@f, "FieldType", "Text")
  SetObjectProperty(@f, "MaxLength", "50")
  SetObjectProperty(@f, "IsPrimaryKey", "true")
  SetObjectProperty(@f, "IsRequired", "true")
  AddObjectArrayItem(@de, "Fields", @f)
  OutputLine(Concat("ret=[", InvokeCreate(@de, @msg, @err), "] msg=[", @msg, "] err=[", @err, "]"))
]%%
```

Renders `ret=[OK] msg=[Data Extension created.] err=[0]`.

## Return value

**`string`** — the SOAP OverallStatus, one of `OK` or `Error`. On success the `@statusMessage` out-variable holds the human message (e.g. `Data Extension created.`) and `@errorCode` holds `0`.

## Behaviour

**`OK` on success, out-variables populated.** Creating a throwaway data extension returned `OK`, with `@statusMessage` = `Data Extension created.` and `@errorCode` = `0`.

**The return is a closed two-token set.** Across the create/update/delete/perform family the OverallStatus was only ever `OK` (success) or `Error` (failure).

{% include test-script.html bundle="ampscript-functions--invokecreate" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokeCreate`](https://ssjs.guide/platform-functions/invokecreate/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) · [`AddObjectArrayItem`](/engagement/ampscript/functions/addobjectarrayitem/) — build the object
- [`InvokeUpdate`](/engagement/ampscript/functions/invokeupdate/) · [`InvokeDelete`](/engagement/ampscript/functions/invokedelete/) — the rest of the write lifecycle
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-create.html) · [ampscript.guide](https://ampscript.guide/invokecreate/)
