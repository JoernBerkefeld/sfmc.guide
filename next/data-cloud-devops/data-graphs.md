---
layout: page
title: "Data Graphs"
description: "API workflows using Salesforce CLI authentication and transport for Data Graphs, with separate optional plugin capabilities and verified limits."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/data-graphs/
redirect_from:
  - /next/data-cloud-cli/data-graphs/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "partial", plugin: "yes" } }
  update: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "partial", plugin: "yes" } }
  delete: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "partial", plugin: "yes" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

This badge does not verify untested writes or general CRUD support.

<a id="operational-data-graphs"></a>

A **Data Graph** gathers selected fields and related data around a **root** object, the graph's starting object. A **projected** field is one included in the graph's output. A full refresh rebuilds the output. An incremental refresh processes only changes.

A template is a saved configuration. The API examples below manage the runtime graph instead.

**Example used in every chapter:** the graph `CustomerGraph`, rooted in `UnifiedssotIndividualMkt__dlm`. Creation projects `ssot__Id__c` (the key) and `ssot__FirstName__c`; the update adds `ssot__LastName__c`. Check your root, fields, types and key first. Do not change the underlying object to fit the example. The plugin commands use `ExampleGraph` as the graph name; replace it with yours.

**Plugin qualification:** The plugin handles any graph the API accepts, in any data space (`--dataspace`, `default` when omitted), at API 68.0. One command can name several graphs, each with its own `data-graph:Name` selector; retrieve reads them one after another. The live-tested shapes are listed under Evidence.

**Plugin flags used on this page** (`sf data360 retrieve`, `deploy` and `delete`; the command aliases `datacloud:`, `d360:` and `dc:` work too): `--api-version` (`auto`, the default, and `68.0` both select API 68.0; anything else is `INVALID_SCOPE`), `--dataspace` (alias `--data-space`; only the `default` data space is supported), `--preview` (read-only), `--allow-processing` (acknowledges that create and update start processing), `--wait-timeout` (seconds, default 1800, deploy only), `--keep-local-files` (delete only), and `-d` / `--source-dir` to name the graph file for `deploy`; `delete` selects the graph by name with `-m`. A retrieve can carry several graphs together with other families in one run. A deploy or delete can carry graphs together with other families: deploy runs graphs last, after the identity resolution they are built on is published, and delete runs them first. Deletion does not cascade. `--changed-since` includes graph files changed in the range with the rest of the range.

{% include crud-summary.html %}

## Read


{% capture read_plugin %}
<a id="optional-sf-plugin-data-native-api68-crd"></a>

The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data) adds API-led operations. It is not a standard Salesforce CLI graph command. The default `auto` and `--api-version 68.0` both use API 68.0. Any other version is refused with `INVALID_SCOPE`.

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
```

The command saves `./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json`. The file keeps the root, related objects with their join paths, fields of every type, key settings, generated bindings and the refresh schedule. The root can be a standard object such as `ssot__Individual__dlm` or a unified Identity Resolution output such as `UnifiedssotIndividualMkt__dlm`. The file is a JSON document with `kind: native-data-graph` and `apiVersion: 68.0`. Graph settings the plugin does not know stay in the file, and deploy refuses them by key path; a graph the format cannot represent, such as one with an unusual schedule, is saved as-is with a warning and is not deployed. A draft graph (saved but never built) is saved as-is too (`DATA_GRAPH_DRAFT`): Salesforce does not let the API update or build a draft. A delete removes it (see Delete).

A Real-Time Data Graph (`type` `REALTIME`) uses the same file. It also holds the settings of the UI page "Real-Time Consumption Limits" (`isRealTimeToggleEnabled`, `processIngestionApi`, `processSalesforceCrm`, `isRecordCachingDisabled`, `sessionEnd`, `sessionEndTimeUnit`, `cacheDurationInDays`, `maxRecordsCached`), sent as written on create and update with `--allow-processing`; Salesforce decides.

Without `--api-version` the command also uses API 68.0. In the test org all six existing graphs retrieved this way and previewed `unchanged` (verification DB: `graph-native-any-shape`, `graph-auto-routes-native68`). A graph that does not exist is an HTTP 400 on the API read, not a 404; the plugin reports the missing graph.
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

For a root from an [Identity Resolution output](/next/data-cloud-devops/identity-resolution/#read), match the root to the exact unified Individual object before you use it.
{% endcapture %}
{% include operation-tabs.html id="graphs-read" label="Read" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7 has no DataGraph metadata type: sf project retrieve start stops with a RegistryError. sf org list metadata lists graph names only." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, listMetadata on DataGraph lists names, but readMetadata returns only the name and retrieve returns no file." connect_state="available" connect_reason="Native API68 read by name and list through the metadata route." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves every graph (bare -m data-graph) or one by name, as a native file with API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the graph from the native file retrieved above. Confirm first that the name is absent in the target and the root exists there. Preview writes nothing.

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing
```

Creation starts processing automatically and uses org resources. Get approval first. The command then requires `--allow-processing`. Without it the create stops with `PROCESSING_ACKNOWLEDGEMENT_REQUIRED`. A create of a graph whose same-named predecessor is still being deleted (Salesforce still lists it) stops with `DATA_GRAPH_PENDING`; wait and run it again. In both cases nothing is written, and the run ends `DEPLOY_EXECUTION_BLOCKED`.

Create sends the file as written: the root, related objects with their joins, field types and refresh schedule. A hand-written file may leave out each node's `type`: the create then sends none and Salesforce sets it (a create without node types answered 201 at API 68). Salesforce adjusts what it stores. It adds key-qualifier fields to related objects, and a unified root reads back with node type `derived`. Retrieve the graph after creating it to get the stored form.

Preview checks the root, because no API answer exists before a write. A missing root object reports `DATA_GRAPH_ROOT_NOT_FOUND`. For a unified root, preview reads the Identity Resolution rulesets and names the owner with `DATA_GRAPH_OWNER`. It reports `DATA_GRAPH_OWNER_NOT_FOUND` when no ruleset owns the root, and `DATA_GRAPH_OWNER_NOT_PUBLISHED` when the owner is not published yet. The deploy itself does not check the owner. Salesforce decides.

The command waits while Salesforce builds the graph, up to `--wait-timeout` seconds (default 1800). Progress prints to stderr. A new graph reads `creating` with empty generated names at first. It then reads `processing` for a few seconds and `ready` before the generated day-zero object, mapping and transform names exist. Its metadata stays `Inprogress` for about five minutes after that.

If the plugin cannot confirm the graph, it reports `failed` / `unknown` with `DATA_GRAPH_CREATE_UNCONFIRMED` and names the check that failed: `request`, `response`, `settlement`, `identity` or `deadline` (the wait timed out). The graph may still exist. Retrieve it, or deploy the same file again. Do not create it again.

If Salesforce answers the create with HTTP 429 or 503, the request was not processed. The plugin waits for the `Retry-After` time, or 20 seconds without one, and sends the same request again until the wait budget ends.

An identical existing definition returns `unchanged` with zero writes. A different existing definition follows the Update chapter.

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

Root, related objects with their joins (`path` entries with `fieldName` and `parentFieldName`, and a `jsonPath` such as `$.ssot__ContactPointEmail__dlm`), field settings and both refresh settings are sent as written. A different root and related objects were accepted. Salesforce recomputes each node's `jsonPath` and `devName` on create and update, whatever you send.

**Salesforce's schedule limits:** `fullRefreshConfig.schedule` accepts only day or hour frequencies, and not every value: Day 1 and Hour 1 were accepted, Hour 6 and Hour 12 were refused. `OnDemand` depends on an org feature. A graph cannot be switched to streaming while it is being edited.

The response is an echo with `status: "creating"` and an empty `valuesDmoName`. It does not prove the graph will finish. Read the graph by name until it is `ready`:

1. `creating` with empty generated names.
2. `creating` with `idDmoName`, `valuesDmoName` and the fragment names set.
3. `processing` for a few seconds.
4. `ready`, with the day-zero mapping and transform names following shortly after.

The metadata route then reports `Inprogress` for about five minutes. A three-field graph took about 7 minutes in total; graphs with a related object or a unified root took about 16 to 17 minutes. Salesforce adds key-qualifier fields to related objects and can store a different node `type` than you sent: a unified root comes back as `derived`. Read the graph after it is ready to get the stored form.

Do not send the POST again while the first one is building. If the outcome is unclear, read the graph by name first.

{% endcapture %}
{% include operation-tabs.html id="graphs-create" label="Create" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7: a source-format deploy stops with a RegistryError, and a metadata-format deploy at API 68.0 is refused because the server finds no DataGraph file in the zip, whatever folder or suffix is used." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, createMetadata is refused with REQUIRED_FIELD_MISSING (DeveloperName, MasterLabel), and the type cannot carry them: a developerName, DeveloperName or masterLabel element is rejected as invalid in type DataGraph." connect_state="available" connect_reason="Native API68 POST of any graph shape. Processing starts automatically." connect_body=create_connect plugin_state="available" plugin_reason="Creates a native graph after preview and absence checks; processing starts automatically." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
### Native API68 — existing-target UPDATE

Retrieve the graph in the default data space first. Then edit the native file, for example its description, schedule or fields.

```sh
sf data360 retrieve -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview --wait-timeout 1800
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing --wait-timeout 1800
```

After the update is confirmed, run the same file without `--allow-processing`:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --wait-timeout 1800
```

The file is the desired state. The plugin sends it in one PUT, and Salesforce decides what changes. Label, description, refresh schedule, incremental refresh, the fields and related objects as the file lists them, field settings and the root object go as written. A field or related object left out of the file is not sent.

Salesforce only adds to a graph. At API 68 it refuses with 400 a removed field (also `isProjected: false`), a removed related object, another related object in place of an existing one, and a root change. The plugin reports that answer as `rejected`, with Salesforce's message on the item (`REQUEST_FAILED`), and nothing is written. The key-qualifier fields Salesforce added stay when the file leaves them out.

The plugin refuses a join change of an existing related object before any write (`DATA_GRAPH_JOIN_CHANGE`). Preview reports the graph as present and the run as `DEPLOY_PREVIEW_BLOCKED`; the deploy ends `DEPLOY_EXECUTION_BLOCKED`. Salesforce accepts such a PUT, rebuilds the graph and keeps the old join. A graph read back with another join than the plugin sent reports `DATA_GRAPH_CHANGE_NOT_APPLIED`, never `updated`. To change a join, delete the graph and create it again.

The name and the data space identify the graph. A PUT cannot rename a graph. A file with another name creates or addresses another graph, and the old graph is not renamed. A node's type, reference and projected name are set by Salesforce: a file may leave them out, and a stated one must match the org. A related object added by an update without `type` is sent without one; that is not verified live.

Settings left out of the file, such as the description, the refresh schedule, a node's label or criteria and field settings, keep their org values: the plugin fills them in from the graph it read. To clear a setting, give it an explicit value. Schedules are limited as described in the Create chapter. For the objects and fields the org already holds, the org supplies both join endpoints, generated bindings and other retained properties.

Before the PUT, the plugin requires item `ready`, metadata `Ready` and DataGraph record `READY` / `ACTIVE`. Success means a readback confirmed the change, not the PUT response. An identical ready definition reports `unchanged` with zero writes and needs no `--allow-processing`.

`--wait-timeout` is a positive integer in seconds, default `1800`, for the whole run. Polls wait at least 20 seconds, subject to the remaining deadline. The command warns upfront on stderr that processing can take seconds to many minutes, up to 30 minutes. Progress goes to stderr. Add `--json` for clean structured stdout.

HTTP 429 or 503 means Salesforce did not process the PUT. The plugin waits for the `Retry-After` time, or 20 seconds without one, and sends the same PUT again until the wait budget ends. If the budget runs out first, the item is `failed` / `not-attempted`. Timeouts and other uncertain outcomes are not resent. Check the graph before you run again.

The bounded test made one description-only PUT, then checked readiness and preservation independently. Verification used one final fresh archive, with zero-write checks, not another PUT. Later live updates changed the description, changed the refresh schedule from 7 days to 1 day and added a field, on a standard root and on a unified root.

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

**Observed PUT, not a documented contract.** Salesforce accepted `PUT /services/data/v68.0/ssot/data-graphs/{name}` in testing, with HTTP 200. This route is not in the public Graph Connect specification when checked. Its availability is not a claim of a documented or supported API contract. After a description-only PUT, reads showed the new description and ready state, with version `"0"` unchanged. Later PUTs changed the description, changed the refresh schedule from 7 days to 1 day and added a field, on a standard root and on a unified root. They were ready again after about 4.5 minutes and 38 seconds. A body that leaves out an existing field or related object, swaps a related object, changes the root or renames the graph is refused with 400 (2026-11-18); a join change answers 200 but the old join stays. Key-qualifier fields Salesforce added may be left out and stay. A body without `fullRefreshConfig` reset the schedule to 1 day. Do not repeat a mutation while the graph settles.

**Known failures:**

- PATCH is refused with HTTP 405 on the tested routes.

{% endcapture %}
{% include operation-tabs.html id="graphs-update" label="Update" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7: a source-format deploy stops with a RegistryError, and a metadata-format deploy at API 68.0 is refused because the server finds no DataGraph file in the zip." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, the DataGraph type carries only fullName, so updateMetadata has no setting to send. On an existing test graph it reported success and changed nothing, and a masterLabel element is rejected as invalid in type DataGraph." connect_state="available" connect_reason="Native API68 PUT of the full definition; needs a settled graph." connect_body=update_connect plugin_state="available" plugin_reason="Updates a native graph after preview and readiness checks; processing may start." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one native graph, selected by name. Preview first, then run the delete:

```sh
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version 68.0 --preview
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version 68.0
```

The delete takes no confirmation flag. The graph's current definition is read from the org by its name first, also by the preview; a graph the org does not have reports `unchanged`. Before the delete, the plugin checks that the graph is ready and matches the org, identity and created date. It also checks the root and configuration. The known dependency and related-segment lists must be empty. Unknown or non-empty lists block the delete.

A draft graph saved as-is (`DATA_GRAPH_DRAFT`) can be deleted too: by name with `-m data-graph:Name`, or from its file, by deleting the as-is file and running `sf data360 delete --changed-since <ref> --confirm-delete`. A draft has no id or created date, so those two checks are skipped. The default data space and the empty dependency and related-segment lists are still required. A live draft deleted this way was `deleted` / `confirmed-deleted` and was then gone from the graph read, the graph list and the metadata list.

The delete response decides the result. A 2xx response is `deleted` / `confirmed-deleted`. A 4xx response is `failed` / `rejected` with Salesforce's error. A 429 or 503 is resent within the 120-second delete budget; if it never gets through, the item is `failed` / `not-attempted`. Any other 5xx or a transport failure is `failed` / `unknown`. The delete does not cascade. After a confirmed deletion the plugin removes the graph's canonical file, `data360/dataGraphs/ExampleGraph.native-dataGraph.json` in the current project, when it is a regular file; add `--keep-local-files` to keep it. Nothing is removed on `--preview` (the file is listed instead), nor for an unchanged, blocked, failed, rejected or unconfirmed delete. A failed removal keeps the confirmed org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`. A live delete confirmed in 66 seconds and removed the local file (verification DB: `graph-native-create-delete-settlement`). Preview is read-only.

The plugin does not read the graph back after the delete, because the by-name metadata read is not reliable at that point (see Known failures).

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
sf data query --query "SELECT Id FROM DataGraph WHERE DataGraphApiName = 'CustomerGraph'" --target-org TARGET_ALIAS
```

Do not check deletion with the metadata route. After a delete it keeps returning a stale copy of the graph for about 11 to 12 minutes, alternating with not found, and the copy can carry an older description. Do not send the DELETE again because of that stale copy.

{% endcapture %}
{% include operation-tabs.html id="graphs-delete" label="Delete" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7: sf project delete source stops with a RegistryError. A destructive metadata-format deploy at API 68.0 naming an existing test graph reported success with zero components, and the graph was still there afterwards." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, deleteMetadata on an existing test graph is refused with FIELD_INTEGRITY_EXCEPTION: the graph is called standard and cannot be deleted." connect_state="available" connect_reason="Native API68 DELETE by name, checked by item read and SOQL." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one native graph selected by name, after a preview." plugin_body=delete_plugin %}

Never delete the shared `DataGraphStateTable__dlm` or the source unified object as guessed cleanup. Through the API route, local request files and retrieved files remain; the plugin removes only the graph file it was given.

<details markdown="1">
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
- Blocked creates (live, 2026-11-16): a create without `--allow-processing` stopped before any write with `PROCESSING_ACKNOWLEDGEMENT_REQUIRED`. A graph created (about 300 s to ready), deleted with `sf data360 delete` and deployed again at once stopped with `DATA_GRAPH_PENDING`: the read by name already answered "Data Graph not found", while the metadata read or the graph list still held it. Both runs ended `DEPLOY_EXECUTION_BLOCKED`, and the graph read by name confirmed that nothing was created.
- Creation materializes supporting resources. What Salesforce stores when the file omits the refresh schedule has no verification entry; name `fullRefreshConfig` and `incrementalRefreshConfig` explicitly and read the graph after creating it.
- A three-field graph took about 7 minutes to build. A graph with one related object took about 17 minutes in a live test. A graph on a unified Identity Resolution root took about 16 minutes.
- During the build the graph read `creating` with an empty `valuesDmoName`, then `creating` with the generated names set, then `processing` for about 9 seconds, then `ready`. The day-zero names appeared shortly after `ready`, and metadata stayed `Inprogress` for about 5 minutes.
- Live creates covered a standard `ssot__Individual__dlm` root with a related object and a 7-day schedule, and a unified root owned by a published Identity Resolution ruleset.
- A graph can be deployed beside other families and selected with `--changed-since`; graphs run last, and a graph on the unified DMO of a selected identity resolution starts only after that ruleset is `PUBLISHED`. Dependencies are never pulled in, and nothing cascades.
- Create, update and delete at `auto` (no `--api-version`) ran through API 68.0: create confirmed in 1040 s, a repeat was `unchanged`, update confirmed in 42 s, delete confirmed in 43 s (verification DB: `graph-auto-routes-native68`).
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
- PUTs on a probe graph (2026-11-18): Salesforce refused with 400 a removed field at the root and on a related object, `isProjected: false` on an existing field, a removed related object, another related object in place of the existing one, and a root change. A PUT with the old name in the URL and a new name in the body was refused (`INVALID_API_INPUT`). A join change answered 200 and rebuilt the graph, but the old join stayed; fields added in the same PUT were applied. Each refused PUT left the graph unchanged.

**Delete:**

- Live API 68 create, read and delete passed. Each deletion was confirmed independently: the graph read by name returned not found and a SOQL query on `DataGraph` returned zero rows.
- After a delete, the by-name metadata read alternated between not found and a stale copy with the description from before an update. In the longest observation the last stale answer came about 11.5 minutes after the delete, and the read was stable from then on. Shorter observations stopped after about 5 minutes. For this reason the plugin does not read back after the DELETE. The DELETE answer decides.
- No live HTTP 429 or 503 was seen on graph writes. The resend behaviour is covered by tests only.
- Exhaustive external consumer exclusion remains unverified.
- A generated VALUE DMO was still readable after its graph was deleted.
- Generated mapping, transform and internal-state removal, successful computation, physical storage and credits cleanup are not proven.
- Installed-package smoke verifies offline command routing, not live installed cross-org qualification.
- An uncertain mutation must not be replayed.

**Metadata API (API 68.0):** `DataGraph` is not listed by `describeMetadata`, yet `listMetadata` on `DataGraph` returned the names of all six graphs in the org (as `default.<name>`), and `describeValueType` describes the type with only `fullName`, marked creatable, updatable and deletable. `readMetadata` for one graph returned only its name, and a `retrieve` of that member returned no file. So the Metadata API gives no graph definition to read or redeploy; use the native API 68 Connect routes or the plugin. Writes on new `Cli…` names (2026-11-16):

- `createMetadata` with `fullName` `default.CliW4Graph` or `CliW4GraphB` was refused with `REQUIRED_FIELD_MISSING` "Required fields are missing: [DeveloperName, MasterLabel]". The type has no such fields to send. Nothing was created: the list was unchanged and the Connect read by name answered "Data Graph not found".
- `updateMetadata` on a graph that does not exist returned `success: true` and changed nothing. With only `fullName` in the type, an update has no setting to carry.
- `deleteMetadata` on a graph that does not exist was refused with `FIELD_INTEGRITY_EXCEPTION` "… is standard and cannot be deleted".
- `createMetadata` cannot be given the missing fields: a `developerName`, `DeveloperName` or `masterLabel` element is rejected before any write with "Element … invalid at this location in type DataGraph". So the Metadata API cannot create a graph.

On an existing test graph, `CliB4Graph`, built through the native API 68 create (2026-11-16; listed by `listMetadata` as `default.CliB4Graph`):

- `readMetadata` returned only the name.
- `updateMetadata` with only `fullName` returned `success: true`. The native read and the `DataGraph` record (label, description, `LastModifiedDate`) were unchanged. An update that also carries `masterLabel` or `description` is rejected as an invalid element.
- `deleteMetadata` was refused with `FIELD_INTEGRITY_EXCEPTION` "The DataGraph called 'default.CliB4Graph' is standard and cannot be deleted". The graph stayed `ready`.
- The test graph was then deleted through the native API 68 DELETE. The read by name answered "Data Graph not found", and a SOQL query on `DataGraph` returned zero rows.

**Salesforce CLI (CLI 2.151.7, API 68.0):** `sf org list metadata-types` does not list `DataGraph`, while `sf org list metadata --metadata-type DataGraph` lists the graph names. `sf project retrieve start --metadata DataGraph:<name>`, `sf project deploy start --metadata DataGraph:CliW4Graph` and `sf project delete source --metadata DataGraph:CliW4GraphD` all stop with `RegistryError` "Missing metadata type definition in registry for id 'DataGraph'" (exit code 1), and so does a retrieve from a `package.xml` manifest. A metadata-format deploy (`--metadata-dir`, `--dry-run`) naming `DataGraph` `CliW4Graph` was refused with "An object 'CliW4Graph' of type DataGraph was named in package.xml, but was not found in zipped directory" for every folder and suffix tried (`dataGraphs/*.dataGraph`, `dataGraph/`, `datagraphs/*.datagraph`, `*.dataGraph-meta.xml`, `dataGraphDefinitions/`): without a `describeMetadata` entry the server has no folder for the type. A destructive metadata-format deploy naming a graph that does not exist passed with zero components. On the existing test graph `CliB4Graph`, the same update deploy (member `default.CliB4Graph`) was refused with "not found in zipped directory". A destructive deploy naming it, as `default.CliB4Graph` or `CliB4Graph`, passed with zero components as a check-only run. Run for real, it reported `Succeeded` with zero components, and the graph was still `ready` afterwards. The standard CLI therefore cannot create, update or delete a graph.

**Not verified:** nested graphs; exhaustive external consumers; removal of generated objects, mappings, transforms or internal state; physical storage and credits; successful computation; general cross-org lifecycle; arbitrary edits; portable creation; live installed cross-org qualification.

**Error codes:**

- `DATA_GRAPH_CREATE_UNCONFIRMED`: plugin create could not confirm the graph; the graph may exist.
- `PROCESSING_ACKNOWLEDGEMENT_REQUIRED`: a create or update without `--allow-processing`; nothing written, run ends `DEPLOY_EXECUTION_BLOCKED`.
- `DATA_GRAPH_PENDING`: a graph of the same name is still being deleted or built; nothing written, run ends `DEPLOY_EXECUTION_BLOCKED`.
- `DATA_GRAPH_ROOT_NOT_FOUND`: preview found no root object.
- `DATA_GRAPH_OWNER_NOT_FOUND`: preview found no Identity Resolution ruleset that owns the unified root.
- `DATA_GRAPH_OWNER_NOT_PUBLISHED`: the owning ruleset is not published.
- `DATA_GRAPH_OWNER` (information): names the owning ruleset.
- `DATA_GRAPH_JOIN_CHANGE`: the file changes the join of an existing related object; nothing written, run ends `DEPLOY_PREVIEW_BLOCKED` (preview) or `DEPLOY_EXECUTION_BLOCKED`.
- `REQUEST_FAILED`: Salesforce refused the PUT (for example a removed field); its message is on the item, nothing written.
- `DATA_GRAPH_CHANGE_NOT_APPLIED`: Salesforce accepted the update, but the graph read back still has another join.
- `INVALID_SCOPE`: an API version other than `auto` or 68.0.

</details>