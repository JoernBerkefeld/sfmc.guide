---
layout: page
title: "Data Graphs"
description: "API workflows using Salesforce CLI authentication and transport for Data Graphs, with separate optional plugin capabilities and verified limits."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-graphs/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [api, plugin], method_statuses: { cli: "unknown", api: "yes", plugin: "partial" } }
  create: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  update: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

This badge does not verify untested writes or general CRUD support.

<a id="operational-data-graphs"></a>

A **Data Graph** gathers selected fields and related data around a **root** object, the graph's starting object. A **projected** field is one included in the graph's output. A full refresh rebuilds the output. An incremental refresh processes only changes.

A template is a saved configuration. The API examples below manage the runtime graph instead. They are not native graph CRUD endpoints.

**Example used in every chapter:** the graph `CustomerGraph`, rooted in `UnifiedssotIndividualMkt__dlm`. Creation projects `ssot__Id__c` (the key) and `ssot__FirstName__c`; the update adds `ssot__LastName__c`. Check your root, fields, types and key first. Do not change the underlying object to fit the example. The plugin commands use `ExampleGraph` as the graph name; replace it with yours.

**Plugin qualification:** The plugin workflows apply only to the bounded scope listed under Evidence, not to every graph.

{% include crud-summary.html %}

## Read


{% capture read_plugin %}
<a id="optional-sf-plugin-data-native-api68-crd"></a>

The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data) adds API-led operations. It is not a standard Salesforce CLI graph command. Use `--api-version 68.0` explicitly. The retrieval covers one `NONE` graph rooted in the enabled standard `ssot__Individual__dlm`.

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
```

The command saves `ExampleGraph.native-dataGraph.json` under `data360/dataGraphs` in your source package. This is a separate native format, not the API 67 `.dataGraph.json` file. The file keeps fields, key settings, relationship paths, generated bindings and refresh settings.

Sample output is not in this guide yet.
{% endcapture %}
{% capture read_connect %}
Reads the graph through the API 67 MCP endpoint. Request files stay local, and the response prints to stdout.

The JSON samples here are decoded operation-result excerpts, not raw stdout. The unflagged REST runner prints the server body. Check it for embedded errors.

Save `graph-get.json`, using the actual graph name:

```json
{ "toolName": "d360_data_graph_get", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\",\"includeCIDetails\":true,\"includeSegmentDetails\":true}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS
```

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1" }
```

This is a read, even though the transport is POST. Check the root, key flags, description and refresh settings, not only `ready`. Keep the generated object and transform names. You need them to check deletion later.

For a root from an [Identity Resolution output](/next/data-cloud-cli/identity-resolution/#read), match the root to the exact unified Individual object before you use it.
{% endcapture %}
{% include operation-tabs.html id="graphs-read" label="Read" cli_state="unknown" cli_reason="No standard CLI workflow for reading runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Reads the graph through the API 67 MCP endpoint." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves the graph as a native file with API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the graph from the native file retrieved above. Confirm first that the name is absent in the target and the root exists there. Preview writes nothing.

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing
```

Creation starts processing automatically and uses org resources. Get approval first. The command then requires `--allow-processing`.

Create sends the file as written: the root, related objects with their joins, field types and refresh schedule. Salesforce adds key-qualifier fields to related objects, so retrieve the graph after creating.

The command waits while Salesforce builds the graph, up to `--wait-timeout` seconds (default 1800). Progress prints to stderr.

If the plugin cannot confirm the graph, it reports `failed` / `unknown` with `DATA_GRAPH_CREATE_UNCONFIRMED`. The graph may still exist. Retrieve it, or deploy the same file again. Do not create it again.

An identical existing definition returns `unchanged` with zero writes. A different existing definition follows the Update chapter.

Sample output is not in this guide yet.
{% endcapture %}
{% capture create_connect %}
Creates a root-only graph through the API 67 MCP endpoint. It refreshes fully every seven days, and incremental refresh stays off.

Creation starts processing automatically. Get approval for the resource use first.

Save `graph-create.json`:

```json
{
  "toolName": "d360_data_graph_create",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-create.json' --target-org TARGET_ALIAS
```

```json
{ "name": "CustomerGraph", "status": "creating", "version": "1" }
```

The automatic work has already started. Do not submit another create or refresh while it is running.
{% endcapture %}
{% include operation-tabs.html id="graphs-create" label="Create" cli_state="unknown" cli_reason="No standard CLI workflow for creating runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Creates a root-only graph through the API 67 MCP endpoint; processing starts automatically." connect_body=create_connect plugin_state="available" plugin_reason="Creates a native graph after preview and absence checks; processing starts automatically." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
### Native API68 — existing-target UPDATE

Retrieve the graph in the default data space first. Then edit the native file, for example its description, schedule or fields.

```sh
sf data360 retrieve -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview --wait-timeout 1800
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing --wait-timeout 1800
```

After the update is confirmed, run the same file without `--allow-processing`:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --wait-timeout 1800
```

The plugin sends one PUT, and Salesforce decides what changes. Label, description, refresh schedule, incremental refresh, added fields, related objects, joins and field settings go as written. The plugin refuses changes to the graph name, data space, root object, and a node's object, path or type.

Omitting retained fields or branches preserves them rather than removing them. An omitted description is kept too. The target supplies both join endpoints, generated bindings and other retained properties.

Before the PUT, the plugin requires item `ready`, metadata `Ready` and DataGraph record `READY` / `ACTIVE`. Success means a readback confirmed the change, not the PUT response. An identical ready definition reports `unchanged` with zero writes and needs no `--allow-processing`.

`--wait-timeout` is a positive integer in seconds, default `1800`, for the whole run. Polls wait at least 20 seconds, subject to the remaining deadline. The command warns upfront on stderr that processing can take seconds to many minutes, up to 30 minutes. Progress goes to stderr. Add `--json` for clean structured stdout.

HTTP 429/503, timeouts and uncertain outcomes are not automatically replayed. Check the graph before you run again.

The bounded test made one description-only PUT, then checked readiness and preservation independently. Verification used one final fresh archive, with zero-write checks, not another PUT.

### Separate API67 facade — existing-owner LastName append

This separate route appends one projected Text field, `LastName`, to an existing graph. It edits the API 67 file, not the native file. Retrieve the graph with `--api-version auto`, then edit `./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json`:

```sh
sf data360 retrieve -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version auto -d ./project
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json --api-version auto --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json --api-version auto --allow-processing
```

Append `LastName` after the existing ordered `Id` key and `FirstName` fields. Keep the full configuration unchanged. Check that the owning transform finished before you write. Complete equality needs no processing acknowledgement. A real append requires `--allow-processing` and may process automatically. Do not replay an unknown outcome.

Sample output is not in this guide yet.
{% endcapture %}
{% capture update_connect %}
Changes the existing graph through the API 67 MCP endpoint. Send the full definition, not only the change.

First check the generated transform. Its last run must be `ACTIVE` / `SUCCESS`, with a completed run date. `ready` alone is not enough, and not every state allows an edit. If the state is unclear, stop. Do not force a refresh to unlock editing.

Use the exact `dayZeroTransformDevName` returned by the owner graph. Do not guess the name. Save `graph-transform-get.json`, replacing `RETURNED_TRANSFORM_NAME`:

```json
{ "toolName": "d360_transform_get", "paramsJson": "{\"dataTransformNameOrId\":\"RETURNED_TRANSFORM_NAME\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-transform-get.json' --target-org TARGET_ALIAS
```

Check the returned name, default data space and `creationSource: Data Graph` against a fresh graph read.

Save `graph-update.json`. Keep the label and description, and add only the `LastName` field. The `editScheduleOnly` flag stays outside `input`:

```json
{
  "toolName": "d360_data_graph_update",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true},{\"sourceFieldName\":\"ssot__LastName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}},\"editScheduleOnly\":false}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-update.json' --target-org TARGET_ALIAS
```

```json
{ "name": "CustomerGraph", "status": "processing", "version": "1" }
```

Read back with `graph-get.json`. The graph can pass through `processing` and `editing_post_sync` before `ready`. Settling takes time. Do not repeat the update while it settles.

The example omits the optional `creationMode`, and the update is still accepted. An identical repeat keeps identities, version and configuration. It does not guarantee zero writes or no processing. Project templates are not refreshed by this update.

**Observed PUT, not a documented contract.** Salesforce accepted `PUT /services/data/v68.0/ssot/data-graphs/{name}` in testing, with HTTP 200. This route is not in the public Graph Connect specification when checked. Its availability is not a claim of a documented or supported API contract. After the PUT, reads showed the new description and ready state, with version `"0"` unchanged. Do not repeat a mutation while the graph settles.

**Known failures:**

- PATCH is refused with HTTP 405 on the tested routes.
{% endcapture %}
{% include operation-tabs.html id="graphs-update" label="Update" cli_state="unknown" cli_reason="No standard CLI workflow for updating runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Changes the existing graph with a full definition, after its transform finishes." connect_body=update_connect plugin_state="available" plugin_reason="Updates a native graph after preview and readiness checks; processing may start." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one native graph. The selector and the local file must name the same graph. Preview first, then confirm:

```sh
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --confirm-delete
```

`--confirm-delete` is required. Before the delete, the plugin checks that the graph is ready and matches the org, identity and created date. It also checks the root and configuration. The known dependency and related-segment lists must be empty. Unknown or non-empty lists block the delete.

The delete response decides the result. A 2xx response means deleted, and a 4xx response shows Salesforce's error. The delete does not cascade and does not remove the local file. Preview is read-only.

Sample output is not in this guide yet.

**Known failures:**

- A by-name metadata read can still show a deleted graph for a while after the delete.
{% endcapture %}
{% capture delete_connect %}
Deletes the graph through the API 67 MCP endpoint, after checking dependencies and ownership. Save `graph-delete.json`:

```json
{ "toolName": "d360_data_graph_delete", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-delete.json' --target-org TARGET_ALIAS
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS
```

```json
{ "success": true }
```

Confirm that the exact graph is no longer found. Check the generated object and transform names you saved in the Read chapter, with the same access as before. Unreadable does not prove physical removal. Deleting the graph does not prove that generated objects, mappings or internal state are removed.

The read-back sample is not in this guide yet.
{% endcapture %}
{% include operation-tabs.html id="graphs-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI workflow for deleting runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Deletes a graph through the API 67 MCP endpoint." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one native graph after preview and an exact confirmation flag." plugin_body=delete_plugin %}

Never delete the shared `DataGraphStateTable__dlm` or the source unified object as guessed cleanup. Local request files and any retrieved file remain.

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Read (API 67 MCP endpoint):**

- A ready, root-only graph in the source org was read. Its root, key flags, description and refresh settings were checked.
- The generated ID, VALUE and root-fragment objects were read through API 65 at the exact names the graph returned. This shows those objects are readable in the source org. It does not show that processing finished or that the same setup works in another org.
- Consumer-detail flags do not promise a complete list of external dependencies.

**Read (native API 68 retrieval):**

- Recursive retrieval kept projected fields, key qualifiers, relationship paths, retained generated bindings and refresh configuration, including qualified multihop branches.
- Retained bindings were matched to the target independently. Source-org record IDs did not become target authority.
- An installed public retrieval preserved the full recursive artifact before the bounded UPDATE. This does not establish cross-org qualification.

**Identity Resolution roots:**

- The logical root was matched to the exact unified Individual object returned by its owning ruleset. The ruleset was read through the API 67 MCP endpoint and the native API, and all twelve output and link objects were verified through API 65 Connect REST and Metadata API reads.
- The root's Text field definitions and explicit Id key were checked. Generated names were not guessed, and source-org IDs were not reused.
- A returned `sourceObject.devName` can name the graph's own node. It is not by itself proof of the owner or root.
- In a two-org check, the portable API identities matched while the org-local IDs differed. One setup graph in each org reached `ready`, and its transform reported `ACTIVE` / `SUCCESS` with a completed run. The source graph projected Id, FirstName and LastName. The target projected Id and FirstName.
- This establishes the correlation only. It does not establish a portable graph creation workflow.

**Create:**

- Native deploy creates the graph only after independent absence and root checks, with `--allow-processing`.
- Creation materializes supporting resources. It defaults to a daily full refresh with incremental refresh disabled, even when the file omits the schedule.
- A three-field graph took about 7 minutes to build. A graph with one related object took about 17 minutes in a live test.
- No native Git selection, mixed families, dependency expansion or cascade is admitted.
- Live API 68 create, read and delete qualification and the offline installed-package routing smoke are separate results. Neither is live installed cross-org qualification.
- The API 67 create is root-only and starts processing automatically. It has no processing-free or cross-org guarantee.
- The create input uses `creationMode: DEFAULT`.

**Update (native API 68):**

- Native API tests separately verified label, description, additive-field, child and multihop changes with retained bindings. These are observations, not a documented API contract.
- In the installed CLI test, one description-only PUT was followed by independent readiness and full recursive preservation checks. JSON and human repeats were unchanged with zero writes. A final fresh archive checked the stderr warning and clean JSON output with zero-write checks, not another PUT.
- This does not qualify every additive edit through the installed CLI, general cross-org portability or successful computation.
- The raw PUT observation settled about two minutes after acceptance. Processing can take seconds to many minutes, depending on graph complexity, data and load. The fixed waits are not completion guarantees.
- Before the PUT, reads confirmed `Status: READY`, `LastRunStatus: ACTIVE` and metadata status `Ready`. Item `ready` alone was not enough.
- PATCH on both tested routes returned HTTP 405. PUT on the object item route was not part of the qualified workflow.

**Update (API 67 MCP endpoint):**

- The generated transform moved through `PENDING` and `IN_PROGRESS` before `status: ACTIVE`, `lastRunStatus: SUCCESS` and a completed `lastRunDate`.
- In a source-only test, adding LastName while keeping label and description unchanged settled at `ready`, version `"1"`, about 30 minutes after the single update. The transform reported a new successful run before the graph finished settling.
- A complete root-only update that omitted `creationMode` also succeeded. Fresh reads reached `ready`, version `"1"`, with a new completed owner-transform run reporting `ACTIVE` / `SUCCESS`. The create-to-final-read observation took about nine minutes.
- GET omitted `creationMode`. Complete comparison retained the existing field properties, root and node bindings, generated bindings and refresh settings, with only LastName appended.
- This does not establish preservation of an unreadable creation mode for arbitrary graphs or other update variants.
- The generated `sourceObject.devName` is an owner-node binding. Do not copy it as the logical root name into a new request.
- Two-org target update: the existing target Identity Resolution ruleset was unchanged and not updated. After five settlement polls, the graph was `ready`, and its owner-returned transform kept its identity with `ACTIVE` / `SUCCESS` and a later completed run. All twelve output and link objects and the root schema and key were confirmed unchanged. Source-org IDs were not used for target-local identities.
- A repeat of the same desired configuration found both resources unchanged. It sent zero write requests and no explicit processing jobs. This is a comparison-before-write result. Replaying the raw `graph-update.json` request is not proven write-free or processing-free.
- Automatic processing from the one substantive update was observed. No explicit refresh or run was needed.
- This does not establish portable Identity Resolution or Graph creation, missing-prerequisite provisioning, arbitrary roots or edits, or a complete cross-org lifecycle.
- Automatic and API 67 retrieval stay separate from explicit API 68.

**Delete:**

- Live API 68 create, read and delete qualification passed after stale metadata readback was reconciled.
- The by-name metadata read kept serving a stale copy of a deleted graph for about 11 to 12 minutes in live tests. For this reason the plugin does not read back after the DELETE.
- Exhaustive external consumer exclusion remains unverified.
- A generated VALUE DMO was still readable after its graph was deleted.
- Generated mapping, transform and internal-state removal, successful computation, physical storage and credits cleanup are not proven.
- Installed-package smoke verifies offline command routing, not live installed cross-org qualification.
- An uncertain mutation must not be replayed.

**Not verified:** nested graphs; exhaustive external consumers; removal of generated objects, mappings, transforms or internal state; physical storage and credits; successful computation; general cross-org lifecycle; arbitrary edits; portable creation; live installed cross-org qualification.

**Error codes:** `DATA_GRAPH_CREATE_UNCONFIRMED` (plugin create could not confirm the graph; the graph may exist).

</details>