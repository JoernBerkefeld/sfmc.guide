---
layout: page
title: "InvokeDelete"
description: "Runs the SOAP API Delete on a CreateObject-built handle and returns the OverallStatus. Runtime-proven on a live Marketing Cloud Engagement CloudPage against a throwaway data extension."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokedelete/
platforms:
  - engagement
syntax: "InvokeDelete(apiObject, @statusMessage, @errorCode[, deleteOptions])"
return_type: string
min_args: 3
max_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

Executes the SOAP **Delete** on an object built with [`CreateObject`](/engagement/ampscript/functions/createobject/). Returns the OverallStatus string and writes the message and numeric code to out-variables.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | The built SOAP object identifying what to delete |
| `@statusMessage` | string | Yes | Out-variable that receives the status message |
| `@errorCode` | string | Yes | Out-variable that receives the numeric error code |
| `deleteOptions` | object | No | An optional DeleteOptions object |

## Example

```ampscript
%%[
  VAR @de, @msg, @err
  SET @de = CreateObject("DataExtension")
  SetObjectProperty(@de, "CustomerKey", "MY_SCRATCH_DE")
  OutputLine(Concat("ret=[", InvokeDelete(@de, @msg, @err), "] msg=[", @msg, "] err=[", @err, "]"))
]%%
```

Renders `ret=[OK] msg=[Data Extension deleted.] err=[0]`.

## Return value

**`string`** — the SOAP OverallStatus, `OK` or `Error`. On success `@statusMessage` holds the human message (e.g. `Data Extension deleted.`) and `@errorCode` holds `0`.

## Behaviour

**`OK` on success, and the object is really gone.** Deleting the throwaway data extension returned `OK` / `Data Extension deleted.` / `0`. A follow-up [`InvokeRetrieve`](/engagement/ampscript/functions/invokeretrieve/) filtered on the same CustomerKey returned zero rows — confirming the delete.

**Only a key is required to delete.** The delete handle needs only the CustomerKey of the object; the rest of the definition is not required.

{% include test-script.html bundle="ampscript-functions--invokedelete" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokeDelete`](https://ssjs.guide/platform-functions/invokedelete/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) — build the object
- [`InvokeCreate`](/engagement/ampscript/functions/invokecreate/) · [`InvokeUpdate`](/engagement/ampscript/functions/invokeupdate/) — the rest of the write lifecycle
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-delete.html) · [ampscript.guide](https://ampscript.guide/invokedelete/)
