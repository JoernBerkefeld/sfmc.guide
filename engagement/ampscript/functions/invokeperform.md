---
layout: page
title: "InvokePerform"
description: "Runs the SOAP API Perform verb on a definition object and returns the OverallStatus. Runtime-proven on a live Marketing Cloud Engagement CloudPage without moving any data."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/invokeperform/
platforms:
  - engagement
syntax: "InvokePerform(apiObject, actionToPerform[, @statusMessage])"
return_type: string
min_args: 2
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

Runs the SOAP **Perform** verb — the one that triggers a definition to run (start a query, an import, an automation). The first argument is the **definition object itself** (e.g. a `QueryDefinition`) built with [`CreateObject`](/engagement/ampscript/functions/createobject/); the second is the action string.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `apiObject` | object | Yes | The definition object to act on (e.g. a `QueryDefinition`) |
| `actionToPerform` | string | Yes | The action, e.g. `start` |
| `@statusMessage` | string | No | Out-variable that receives the status message |

## Example

```ampscript
%%[
  VAR @obj, @st
  SET @obj = CreateObject("QueryDefinition")
  SetObjectProperty(@obj, "ObjectID", "00000000-0000-0000-0000-000000000000")
  OutputLine(Concat("ret=[", InvokePerform(@obj, "notarealaction", @st), "] st=[", @st, "]"))
]%%
```

For an invalid action this renders `ret=[Error] st=[notarealaction is not an action that can be Performed on a InteractionDefinition. ErrorID = ...]`. With a valid `start` action on a real, provisioned definition it returns `OK`.

## Return value

**`string`** — the SOAP OverallStatus, `OK` or `Error`. The human-readable message goes to the optional `@statusMessage` out-variable.

## Behaviour

**The first argument is the definition, not a wrapper.** Pass the `QueryDefinition` (or other definition) object directly. There is no `PerformRequest` wrapper type — `CreateObject("PerformRequest")` does not resolve and aborts the page.

**Failures return `Error` with a message.** An invalid action, or a valid action against a nonexistent ObjectID, returned `Error` with the reason in `@statusMessage`. Internally a `QueryDefinition` is reported as an `InteractionDefinition`.

**Arity of two is valid.** `InvokePerform(apiObject, action)` — without the out-variable — is a complete call.

{% include test-script.html bundle="ampscript-functions--invokeperform" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- SSJS Platform function [`InvokePerform`](https://ssjs.guide/platform-functions/invokeperform/) — the same-named 1:1 SSJS counterpart of this AMPscript function
- [`CreateObject`](/engagement/ampscript/functions/createobject/) · [`SetObjectProperty`](/engagement/ampscript/functions/setobjectproperty/) — build the definition
- [`InvokeExecute`](/engagement/ampscript/functions/invokeexecute/) — the Execute-verb counterpart
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-api/mc-ampscript-reference-api-invoke-perform.html) · [ampscript.guide](https://ampscript.guide/invokeperform/)
