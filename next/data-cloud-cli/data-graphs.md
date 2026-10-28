---
layout: page
title: "Data Graphs | Data Cloud with Salesforce CLI"
description: "Salesforce CLI workflows and verified operation limits for Operational Data Graphs."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-graphs/
verification: verified
platforms:
  - next
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="operational-data-graphs"></a>

A **Data Graph** brings selected fields and related data together around a **root** object, the starting object for that graph. **Projected** fields are the fields included in its output. A full refresh rebuilds that output; an incremental refresh processes changes.

A Data Graph template is a saved configuration. The following API 67 MCP facade operations create and manage the **runtime graph** instead; these are not qualified native graph CRUD endpoints.

This example starts with a customer key and first name, then adds the last name. It assumes the existing `UnifiedssotIndividualMkt__dlm` and its Text fields `ssot__Id__c`, `ssot__FirstName__c` and `ssot__LastName__c`. Check your actual root, mapped fields, types and key before using it. Do not change the underlying DMO just to fit the example.

**Creation automatically processes** and generates supporting objects/transform. Updates can process too. Obtain permission for the resource use; there is no processing-free or cross-org guarantee. Like the other REST examples, request files are local inputs and responses go to stdout, not `force-app`.

## Retrieve

Save `graph-get.json`, using the actual created name:

```json
{ "toolName": "d360_data_graph_get", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\",\"includeCIDetails\":true,\"includeSegmentDetails\":true}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1" }
```

This is a read despite the HTTP POST transport. Check the root, fields/key flags, description and refresh settings, not just `ready`. We also read the generated ID, VALUE and root-fragment DMOs through API 65, using the exact names returned by the graph. That confirms those objects could be read in the source org, not that the graph's processing finished or that the same configuration works in another org. Nested graphs remain untested. Capture the exact generated object/transform references for checking deletion later; do not guess names. The consumer-detail flags do not promise a complete list of every external dependency.

## Create

Save `graph-create.json`. This is a root-only graph with a seven-day full-refresh schedule and incremental refresh disabled:

```json
{
  "toolName": "d360_data_graph_create",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-create.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "creating", "version": "1" }
```

The automatic work has already started. Do not submit another create or refresh while it is running.

## Update

First confirm that initial generated-transform processing completed successfully and that the graph can be edited. `ready` alone is not enough, and **not every lifecycle state is mutable**. If edit eligibility is unclear, stop; this guide does not provide a universal status-to-editability check. Do not force a refresh to unlock editing.

We resolved the initial-processing check by reading the **exact `dayZeroTransformDevName` returned by the owner graph**, not by guessing a transform name. Save `graph-transform-get.json`, replacing `RETURNED_TRANSFORM_NAME` with that value:

```json
{ "toolName": "d360_transform_get", "paramsJson": "{\"dataTransformNameOrId\":\"RETURNED_TRANSFORM_NAME\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-transform-get.json' --target-org TARGET_ALIAS --json
```

This is a read operation through the **API 67 facade using vanilla `sf api request rest`**, not a native transform command or native CRUD equivalence. Check the exact returned transform name, default dataspace and `creationSource: Data Graph` against a fresh owner graph read. In the tested graph, the transform moved through `PENDING` and `IN_PROGRESS` before `status: ACTIVE`, `lastRunStatus: SUCCESS` and a completed `lastRunDate` after creation. Only then did we submit the one full-definition update below. This observation does not make `ready` alone a universal edit-permission check.

Preserve the full configuration, including label and description, and add only the surname field. Save `graph-update.json`; `editScheduleOnly` belongs **outside `input`**:

```json
{
  "toolName": "d360_data_graph_update",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true},{\"sourceFieldName\":\"ssot__LastName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}},\"editScheduleOnly\":false}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-update.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "processing", "version": "1" }
```

Read back with `graph-get.json`. The graph can pass through `processing` and `editing_post_sync` before `ready`. In the later source-only test, adding LastName while keeping label/description unchanged settled at `ready`, version `"1"`, about 30 minutes after the single update. The generated transform reported a new successful run before the graph finished settling. That duration is an observation, not a deadline or guarantee; do not repeat the update while waiting.

Independent readback confirmed the ordered Id, FirstName and LastName Text projections, only Id marked as the key, and the unchanged logical root, empty paths/related objects, seven-day schedule and disabled incremental refresh. GET omitted `creationMode`. A separate complete root-only update **omitting optional `creationMode`**, as illustrated above, also succeeded: fresh independent reads reached `ready`, version `"1"`, with a new completed owner-transform run reporting `ACTIVE` / `SUCCESS`. The create-to-final-read observation took about nine minutes; it is not a deadline or guarantee. Complete comparison retained all existing field properties, root/node and generated bindings, and refresh settings, with only LastName appended. You do not need a saved creation-time value to compare the persisted configuration: do not invent a missing GET value or require a past creation record for this bounded omission workflow. This does not establish preservation of an unreadable creation mode for arbitrary graphs or other update variants. Its generated `sourceObject.devName` was an owner-node binding, not the logical root name to copy blindly into a new request.

An identical repeat can preserve identities, version and configuration, but does not guarantee zero writes or no processing. Templates in your project are not automatically refreshed by this update.

## Delete

After checking dependencies and ownership, save `graph-delete.json`:

```json
{ "toolName": "d360_data_graph_delete", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-delete.json' --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS --json
```

```json
{ "success": true }
```

Confirm that the exact graph is no longer found. Check the captured generated object/transform references with the same access used before deletion; unreadable is not permission-independent proof of physical removal. A generated VALUE DMO was still readable after its graph was deleted, so deleting the graph did not confirm removal of all its generated objects. Note that **generated mapping absence and graph-specific internal-state cleanup are not proven**. Never delete the shared `DataGraphStateTable__dlm` or the source unified DMO as guessed cleanup. Local requests and any retrieved template remain.
