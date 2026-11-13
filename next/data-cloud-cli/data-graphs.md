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

A template is a saved configuration. The API examples below manage the runtime graph instead.

**Example used in every chapter:** the graph `CustomerGraph`, rooted in `UnifiedssotIndividualMkt__dlm`. Creation projects `ssot__Id__c` (the key) and `ssot__FirstName__c`; the update adds `ssot__LastName__c`. Check your root, fields, types and key first. Do not change the underlying object to fit the example. The plugin commands use `ExampleGraph` as the graph name; replace it with yours.

**Plugin qualification:** The plugin handles any graph the API accepts in the default data space, one graph per operation, at API 68.0. The live-tested shapes are listed under Evidence.

{% include crud-summary.html %}

## Read


{% capture read_plugin %}
<a id="optional-sf-plugin-data-native-api68-crd"></a>

The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data) adds API-led operations. It is not a standard Salesforce CLI graph command. The default `auto` and `--api-version 68.0` both use API 68.0. Any other version is refused with `INVALID_SCOPE`.

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
```

The command saves `ExampleGraph.native-dataGraph.json` under `data360/dataGraphs` in your source package. The file keeps the root, related objects with their join paths, fields of every type, key settings, generated bindings and the refresh schedule. The root can be a standard object such as `ssot__Individual__dlm` or a unified Identity Resolution output such as `UnifiedssotIndividualMkt__dlm`.

Sample output is not in this guide yet.
{% endcapture %}
{% capture read_connect %}
### Native API68 read

Reads one graph by name. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/data-graphs/CustomerGraph' --target-org TARGET_ALIAS
```

Excerpt of a ready graph:

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1", "type": "none", "dataspaceName": "default", "primaryObjectName": "UnifiedssotIndividualMkt__dlm", "valuesDmoName": "CustomerGraph_1793202629475_VALUE__dlm", "dayZeroTransformDevName": "Dg_CustomerGraph_1793202651897" }
```

The response also holds `sourceObject` with fields and related objects, the refresh settings and the generated object, mapping and transform names. A missing graph answers HTTP 400 with `INTERNAL_ERROR` and the message "Data Graph not found with name …", not 404.

There is no list route: `GET /ssot/data-graphs` without a name answers `INTERNAL_ERROR` "Empty Data Graph Name". List the graphs of a data space through the metadata route:

```sh
sf api request rest '/services/data/v68.0/ssot/data-graphs/metadata?dataspace=default' --target-org TARGET_ALIAS
```

Each entry under `dataGraphMetadata` has `developerName`, `status` and the root. Here the status is spelled `Ready`, while the item read says `ready`. Add `&dataGraphEntityName=CustomerGraph` to read one graph. This metadata read is not reliable right after a create or delete; see the Create and Delete chapters.

For a root from an [Identity Resolution output](/next/data-cloud-cli/identity-resolution/#read), match the root to the exact unified Individual object before you use it.
{% endcapture %}
{% include operation-tabs.html id="graphs-read" label="Read" cli_state="unknown" cli_reason="No standard CLI workflow for reading runtime graphs is supplied." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, listMetadata on DataGraph lists names, but readMetadata returns only the name and retrieve returns no file." connect_state="available" connect_reason="Native API68 read by name and list through the metadata route." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves the graph as a native file with API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the graph from the native file retrieved above. Confirm first that the name is absent in the target and the root exists there. Preview writes nothing.

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing
```

Creation starts processing automatically and uses org resources. Get approval first. The command then requires `--allow-processing`.

Create sends the file as written: the root, related objects with their joins, field types and refresh schedule. Salesforce adjusts what it stores. It adds key-qualifier fields to related objects, and a unified root reads back with node type `derived`. Retrieve the graph after creating it to get the stored form.

Preview checks the root, because no API answer exists before a write. A missing root object reports `DATA_GRAPH_ROOT_NOT_FOUND`. For a unified root, preview reads the Identity Resolution rulesets and names the owner with `DATA_GRAPH_OWNER`. It reports `DATA_GRAPH_OWNER_NOT_FOUND` when no ruleset owns the root, and `DATA_GRAPH_OWNER_NOT_PUBLISHED` when the owner is not published yet. The deploy itself does not check the owner. Salesforce decides.

The command waits while Salesforce builds the graph, up to `--wait-timeout` seconds (default 1800). Progress prints to stderr. A new graph reads `creating` with empty generated names at first. It then reads `processing` for a few seconds and `ready` before the generated day-zero object, mapping and transform names exist. Its metadata stays `Inprogress` for about five minutes after that.

If the plugin cannot confirm the graph, it reports `failed` / `unknown` with `DATA_GRAPH_CREATE_UNCONFIRMED` and names the check that failed: `request`, `response`, `settlement`, `identity` or `deadline` (the wait timed out). The graph may still exist. Retrieve it, or deploy the same file again. Do not create it again.

If Salesforce answers the create with HTTP 429 or 503, the request was not processed. The plugin waits for the `Retry-After` time, or 20 seconds without one, and sends the same request again until the wait budget ends.

An identical existing definition returns `unchanged` with zero writes. A different existing definition follows the Update chapter.

Sample output is not in this guide yet.
{% endcapture %}
{% capture create_connect %}
### Native API68 create

Creates a graph with one POST. Creation starts processing automatically, so get approval for the resource use first.

```sh
sf api request rest '/services/data/v68.0/ssot/data-graphs' --method POST --body '@graph-native-create.json' --target-org TARGET_ALIAS
```

Save `graph-native-create.json`. It is the graph definition without generated names: no `idDmoName`, `valuesDmoName`, day-zero or incremental mapping and transform names, no node `fragmentDMOName`, and no `devName` on path entries or fields:

```json
{
  "name": "CustomerGraph",
  "label": "Customer Graph",
  "description": "Customer key and given-name projection",
  "dataspaceName": "default",
  "primaryObjectName": "UnifiedssotIndividualMkt__dlm",
  "type": "NONE",
  "sourceObject": {
    "name": "UnifiedssotIndividualMkt__dlm",
    "devName": "CustomerGraph_UnifiedssotIndividualMkt",
    "label": "Unified Individual MKT",
    "jsonPath": "$",
    "path": [],
    "type": "standard",
    "fields": [
      { "sourceFieldName": "ssot__Id__c", "dataType": "Text", "isKeyColumn": true, "isProjected": true, "usageTag": "NONE" },
      { "sourceFieldName": "ssot__FirstName__c", "dataType": "Text", "isKeyColumn": false, "isProjected": true, "usageTag": "NONE" }
    ],
    "relatedObjects": []
  },
  "fullRefreshConfig": { "schedule": { "frequency": 7, "timeGranularity": "Day" } },
  "incrementalRefreshConfig": { "enabled": false }
}
```

Root, related objects with their joins (`path` entries with `fieldName` and `parentFieldName`, and a `jsonPath` such as `$.ssot__ContactPointEmail__dlm`), field settings and both refresh settings are sent as written. A different root, related objects and any schedule were accepted. Salesforce replaces the node `devName` with its own.

The response is an echo with `status: "creating"` and an empty `valuesDmoName`. It does not prove the graph will finish. Read the graph by name until it is `ready`:

1. `creating` with empty generated names.
2. `creating` with `idDmoName`, `valuesDmoName` and the fragment names set.
3. `processing` for a few seconds.
4. `ready`, with the day-zero mapping and transform names following shortly after.

The metadata route then reports `Inprogress` for about five minutes. A three-field graph took about 7 minutes in total; graphs with a related object or a unified root took about 16 to 17 minutes. Salesforce adds key-qualifier fields to related objects and can store a different node `type` than you sent: a unified root comes back as `derived`. Read the graph after it is ready to get the stored form.

Do not send the POST again while the first one is building. If the outcome is unclear, read the graph by name first.

{% endcapture %}
{% include operation-tabs.html id="graphs-create" label="Create" cli_state="unknown" cli_reason="No standard CLI workflow for creating runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="The Metadata API returns no graph definition to deploy, and a create through it has not been tested." connect_state="available" connect_reason="Native API68 POST of any graph shape. Processing starts automatically." connect_body=create_connect plugin_state="available" plugin_reason="Creates a native graph after preview and absence checks; processing starts automatically." plugin_body=create_plugin %}

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

HTTP 429 or 503 means Salesforce did not process the PUT. The plugin waits for the `Retry-After` time, or 20 seconds without one, and sends the same PUT again until the wait budget ends. If the budget runs out first, the item is `failed` / `not-attempted`. Timeouts and other uncertain outcomes are not resent. Check the graph before you run again.

The bounded test made one description-only PUT, then checked readiness and preservation independently. Verification used one final fresh archive, with zero-write checks, not another PUT. Later live updates changed the description, changed the refresh schedule from 7 days to 1 day and added a field, on a standard root and on a unified root.

Sample output is not in this guide yet.
{% endcapture %}
{% capture update_connect %}
### Native API68 update

Changes the graph with one PUT of the complete definition. Start from a fresh native read of the graph, change what you need and send the whole object back:

```sh
sf api request rest '/services/data/v68.0/ssot/data-graphs/CustomerGraph' --method PUT --body '@graph-native-update.json' --target-org TARGET_ALIAS
```

Save `graph-native-update.json`. It keeps every generated name from the read (graph objects, mapping, transform, fragment, node and field `devName`) and adds `ssot__LastName__c` without a `devName`. Drop the read-only properties such as `id`, `status`, `version`, `kind`, labels of generated objects, `dependency` and `relatedSegments`:

```json
{
  "name": "CustomerGraph",
  "label": "Customer Graph",
  "description": "Customer key and given-name projection",
  "dataspaceName": "default",
  "primaryObjectName": "UnifiedssotIndividualMkt__dlm",
  "type": "NONE",
  "sourceObject": {
    "name": "UnifiedssotIndividualMkt__dlm",
    "devName": "CustomerGraph_UnifiedssotIndividualMkt",
    "label": "Unified Individual MKT",
    "jsonPath": "$",
    "path": [],
    "type": "derived",
    "fragmentDMOName": "Dg_Mc1S_9pFaj0000001xm1EAA_FRAGMENT__dlm",
    "referenceDeveloperName": "UnifiedIndividual",
    "projectedName": "UnifiedssotIndividualMkt__dlm",
    "recencyCriteria": [],
    "fields": [
      { "devName": "CustomerGraph_Unif_akJUWVAN", "sourceFieldName": "ssot__Id__c", "dataType": "Text", "isKeyColumn": true, "isProjected": true, "usageTag": "NONE", "isDGRootKeyField": false, "fieldRoles": [] },
      { "devName": "CustomerGraph_Unif_yrsrHWum", "sourceFieldName": "ssot__FirstName__c", "dataType": "Text", "isKeyColumn": false, "isProjected": true, "usageTag": "NONE", "isDGRootKeyField": false, "fieldRoles": [] },
      { "sourceFieldName": "ssot__LastName__c", "dataType": "Text", "isKeyColumn": false, "isProjected": true, "usageTag": "NONE" }
    ],
    "relatedObjects": []
  },
  "idDmoName": "CustomerGraph_1793202628279_ID__dlm",
  "valuesDmoName": "CustomerGraph_1793202629475_VALUE__dlm",
  "dayZeroMappingDevName": "Dg_CustomerGraph_1793202651897",
  "dayZeroTransformDevName": "Dg_CustomerGraph_1793202651897",
  "fullRefreshConfig": { "schedule": { "frequency": 7, "timeGranularity": "Day" } },
  "incrementalRefreshConfig": { "enabled": false }
}
```

Use the generated names your read returns; the ones above only show their form. Only send the PUT when the item read says `ready` and the metadata route says `Ready`.

**Observed PUT, not a documented contract.** Salesforce accepted `PUT /services/data/v68.0/ssot/data-graphs/{name}` in testing, with HTTP 200. This route is not in the public Graph Connect specification when checked. Its availability is not a claim of a documented or supported API contract. After a description-only PUT, reads showed the new description and ready state, with version `"0"` unchanged. Later PUTs changed the description, changed the refresh schedule from 7 days to 1 day and added a field, on a standard root and on a unified root. They were ready again after about 4.5 minutes and 38 seconds. Fields and related objects left out of the body were kept, not removed. Do not repeat a mutation while the graph settles.

**Known failures:**

- PATCH is refused with HTTP 405 on the tested routes.

{% endcapture %}
{% include operation-tabs.html id="graphs-update" label="Update" cli_state="unknown" cli_reason="No standard CLI workflow for updating runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="The Metadata API returns no graph definition to deploy, and an update through it has not been tested." connect_state="available" connect_reason="Native API68 PUT of the full definition; needs a settled graph." connect_body=update_connect plugin_state="available" plugin_reason="Updates a native graph after preview and readiness checks; processing may start." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one native graph. The selector and the local file must name the same graph. Preview first, then confirm:

```sh
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --confirm-delete
```

`--confirm-delete` is required. Before the delete, the plugin checks that the graph is ready and matches the org, identity and created date. It also checks the root and configuration. The known dependency and related-segment lists must be empty. Unknown or non-empty lists block the delete.

The delete response decides the result. A 2xx response is `deleted` / `confirmed-deleted`. A 4xx response is `failed` / `rejected` with Salesforce's error. A 429 or 503 is resent within the 120-second delete budget; if it never gets through, the item is `failed` / `not-attempted`. Any other 5xx or a transport failure is `failed` / `unknown`. The delete does not cascade and does not remove the local file. Preview is read-only.

The plugin does not read the graph back after the delete, because the by-name metadata read is not reliable at that point (see Known failures).

Sample output is not in this guide yet.

**Known failures:**

- After a delete, the by-name metadata read (`/ssot/data-graphs/metadata?dataGraphEntityName=`) keeps returning a stale copy of the graph for about 11 to 12 minutes, alternating with not found. The copy can even carry an older description. The graph read by name and a SOQL query on `DataGraph` show it gone at once. Use those to check a deletion.
{% endcapture %}
{% capture delete_connect %}
### Native API68 delete

Deletes the graph by name, after you check its dependencies and ownership. Then read it back by name:

```sh
sf api request rest '/services/data/v68.0/ssot/data-graphs/CustomerGraph' --method DELETE --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/data-graphs/CustomerGraph' --target-org TARGET_ALIAS
```

A 2xx answer means the graph is deleted. In live tests the item read returned "Data Graph not found" at once, and a SOQL query on `DataGraph` for the name returned zero rows:

```sh
sf data query --query "SELECT Id FROM DataGraph WHERE DeveloperName = 'CustomerGraph'" --target-org TARGET_ALIAS
```

Do not check deletion with the metadata route. After a delete it keeps returning a stale copy of the graph for about 11 to 12 minutes, alternating with not found, and the copy can carry an older description. Do not send the DELETE again because of that stale copy.

{% endcapture %}
{% include operation-tabs.html id="graphs-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI workflow for deleting runtime graphs is supplied." split_api=true metadata_state="unknown" metadata_reason="A delete through the Metadata API has not been tested." connect_state="available" connect_reason="Native API68 DELETE by name, checked by item read and SOQL." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one native graph after preview and an exact confirmation flag." plugin_body=delete_plugin %}

Never delete the shared `DataGraphStateTable__dlm` or the source unified object as guessed cleanup. Local request files and any retrieved file remain.

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Read (native API 68 retrieval):**

- Recursive retrieval kept projected fields, key qualifiers, relationship paths, retained generated bindings and refresh configuration, including qualified multihop branches.
- Retained bindings were matched to the target independently. Source-org record IDs did not become target authority.
- An installed public retrieval preserved the full recursive artifact before the bounded UPDATE. This does not establish cross-org qualification.
- Six existing graphs of different shapes were retrieved and previewed read-only. All reported `unchanged`.

**Identity Resolution roots:**

- The logical root was matched to the exact unified Individual object returned by its owning ruleset, read through the native API.
- The root's Text field definitions and explicit Id key were checked. Generated names were not guessed, and source-org IDs were not reused.
- A returned `sourceObject.devName` can name the graph's own node. It is not by itself proof of the owner or root.

**Create:**

- Native deploy creates the graph only after independent absence and root checks, with `--allow-processing`.
- Creation materializes supporting resources. It defaults to a daily full refresh with incremental refresh disabled, even when the file omits the schedule.
- A three-field graph took about 7 minutes to build. A graph with one related object took about 17 minutes in a live test. A graph on a unified Identity Resolution root took about 16 minutes.
- During the build the graph read `creating` with an empty `valuesDmoName`, then `creating` with the generated names set, then `processing` for about 9 seconds, then `ready`. The day-zero names appeared shortly after `ready`, and metadata stayed `Inprogress` for about 5 minutes.
- Live creates covered a standard `ssot__Individual__dlm` root with a related object and a 7-day schedule, and a unified root owned by a published Identity Resolution ruleset.
- No native Git selection, mixed families, dependency expansion or cascade is admitted.
- Live API 68 create, read and delete qualification and the offline installed-package routing smoke are separate results. Neither is live installed cross-org qualification.

**Update (native API 68):**

- Native API tests separately verified label, description, additive-field, child and multihop changes with retained bindings. These are observations, not a documented API contract.
- In the installed CLI test, one description-only PUT was followed by independent readiness and full recursive preservation checks. JSON and human repeats were unchanged with zero writes. A final fresh archive checked the stderr warning and clean JSON output with zero-write checks, not another PUT.
- This does not qualify every additive edit through the installed CLI, general cross-org portability or successful computation.
- The raw PUT observation settled about two minutes after acceptance. Processing can take seconds to many minutes, depending on graph complexity, data and load. The fixed waits are not completion guarantees.
- Before the PUT, reads confirmed `Status: READY`, `LastRunStatus: ACTIVE` and metadata status `Ready`. Item `ready` alone was not enough.
- PATCH on both tested routes returned HTTP 405. PUT on the object item route was not part of the qualified workflow.

**Update (native API 68, any shape):**

- A live update changed the description and the refresh schedule (7 days to 1 day) and added a field. It was confirmed in about 4.5 minutes. A repeat of the same file was `unchanged` with zero writes.
- A graph on a unified root was updated the same way and confirmed in 38 seconds.
- An omitted description is kept on update.

**Delete:**

- Live API 68 create, read and delete passed. Each deletion was confirmed independently: the graph read by name returned not found and a SOQL query on `DataGraph` returned zero rows.
- After a delete, the by-name metadata read alternated between not found and a stale copy with the description from before an update. In the longest observation the last stale answer came about 11.5 minutes after the delete, and the read was stable from then on. Shorter observations stopped after about 5 minutes. For this reason the plugin does not read back after the DELETE. The DELETE answer decides.
- No live HTTP 429 or 503 was seen on graph writes. The resend behaviour is covered by tests only.
- Exhaustive external consumer exclusion remains unverified.
- A generated VALUE DMO was still readable after its graph was deleted.
- Generated mapping, transform and internal-state removal, successful computation, physical storage and credits cleanup are not proven.
- Installed-package smoke verifies offline command routing, not live installed cross-org qualification.
- An uncertain mutation must not be replayed.

**Metadata API (read-only, API 68.0):** `DataGraph` is not listed by `describeMetadata`, yet `listMetadata` on `DataGraph` returned the names of all six graphs in the org. `readMetadata` for one of them returned only its name, and a `retrieve` of that member returned no file. So the Metadata API gives no graph definition to read or redeploy; use the native API 68 Connect routes or the plugin. Metadata API create, update and delete were not tried.

**Not verified:** nested graphs; exhaustive external consumers; removal of generated objects, mappings, transforms or internal state; physical storage and credits; successful computation; general cross-org lifecycle; arbitrary edits; portable creation; live installed cross-org qualification.

**Error codes:**

- `DATA_GRAPH_CREATE_UNCONFIRMED`: plugin create could not confirm the graph; the graph may exist.
- `DATA_GRAPH_ROOT_NOT_FOUND`: preview found no root object.
- `DATA_GRAPH_OWNER_NOT_FOUND`: preview found no Identity Resolution ruleset that owns the unified root.
- `DATA_GRAPH_OWNER_NOT_PUBLISHED`: the owning ruleset is not published.
- `DATA_GRAPH_OWNER` (information): names the owning ruleset.
- `INVALID_SCOPE`: an API version other than `auto` or 68.0.

</details>