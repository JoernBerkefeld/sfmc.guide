---
layout: page
title: "InvokeUpdate"
description: "Runs the SOAP API Update on a CreateObject-built handle and returns the OverallStatus. Runtime-proven on a live Marketing Cloud Engagement CloudPage against a throwaway data extension."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokeupdate/
platforms:
  - engagement
syntax: "InvokeUpdate(apiObject, @statusMessage, @errorCode[, updateOptions])"
return_type: string
min_args: 1
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

Executes the SOAP **Update** on an object built with [`CreateObject`](/engagement/ampscript/functions/createobject/). Returns the OverallStatus string and writes the message and numeric code to out-variables.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | The built SOAP object to update |
| `@statusMessage` | string | No | Out-variable that receives the status message |
| `@errorCode` | string | No | Out-variable that receives the numeric error code |
| `updateOptions` | object | No | An optional UpdateOptions object |

## Example

```ampscript
%%[
  VAR @de, @msg, @err
  SET @de = CreateObject("DataExtension")
  SetObjectProperty(@de, "CustomerKey", "MY_SCRATCH_DE")
  SetObjectProperty(@de, "Description", "updated description")
  OutputLine(Concat("ret=[", InvokeUpdate(@de, @msg, @err), "] msg=[", @msg, "] err=[", @err, "]"))
]%%
```

Renders `ret=[OK] msg=[Data Extension updated.] err=[0]`.

## Return value

**`string`** — the SOAP OverallStatus, `OK` or `Error`. On success `@statusMessage` holds the human message (e.g. `Data Extension updated.`) and `@errorCode` holds `0`.

## Behaviour

**`OK` on success, out-variables populated.** Updating the description of an existing throwaway data extension (via a fresh handle keyed to the same CustomerKey) returned `OK`, `@statusMessage` = `Data Extension updated.`, `@errorCode` = `0`.

**Only the properties you set are sent.** The update handle carried only the CustomerKey and the changed Description; that was enough to update just that field.

{% include test-script.html bundle="ampscript-functions--invokeupdate" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokeUpdate`](https://ssjs.guide/platform-functions/invokeupdate/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) — build the object
- [`InvokeCreate`](/engagement/ampscript/functions/invokecreate/) · [`InvokeDelete`](/engagement/ampscript/functions/invokedelete/) — the rest of the write lifecycle
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-update.html) · [ampscript.guide](https://ampscript.guide/invokeupdate/)
