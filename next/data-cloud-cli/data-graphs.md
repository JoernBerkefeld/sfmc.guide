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
  retrieve: { status: "yes", methods: [api, plugin], method_statuses: { cli: "unknown", api: "yes", plugin: "partial" } }
  create: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  update: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="operational-data-graphs"></a>

A **Data Graph** brings selected fields and related data together around a **root** object, the starting object for that graph. **Projected** fields are the fields included in its output. A full refresh rebuilds that output; an incremental refresh processes changes.

A Data Graph template is a saved configuration. The following API 67 MCP facade operations create and manage the **runtime graph** instead; these are not qualified native graph CRUD endpoints.

This example starts with a customer key and first name, then adds the last name. It assumes the existing `UnifiedssotIndividualMkt__dlm` and its Text fields `ssot__Id__c`, `ssot__FirstName__c` and `ssot__LastName__c`. Check your actual root, mapped fields, types and key before using it. Do not change the underlying DMO just to fit the example.

**Creation automatically processes** and generates supporting objects/transform. Updates can process too. Obtain permission for the resource use; there is no processing-free or cross-org guarantee. Like the other REST examples, request files are local inputs and responses go to stdout, not `force-app`.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_plugin %}
<a id="optional-sf-plugin-data-native-api68-crd"></a>

The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data)
adds API-led operations, not out-of-the-box Salesforce CLI Graph commands. Use
explicit `--api-version 68.0` for retrieval in default space. This narrow profile
admits one `NONE` graph rooted in the enabled standard `ssot__Individual__dlm`.
Recursive retrieval preserves projected fields, key qualifiers, relationship paths,
retained generated bindings and refresh configuration, including qualified multihop
branches. Retrieve exports a distinct `ExampleGraph.native-dataGraph.json` under
the configured source package's `data360/dataGraphs` directory, not the API67 facade
`.dataGraph.json` format. Retained bindings are independently matched to the target;
source-org record IDs do not become target authority.

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
```

November 5 installed public retrieval independently preserved the full recursive
artifact before the bounded UPDATE described in the plugin Update tab. This does
not establish cross-org qualification. The API tabs retain separate API67 facade
research and native PUT observations; neither is standard resource-specific CLI
support or a general lifecycle guarantee.
{% endcapture %}
{% capture retrieve_api %}
The facade JSON illustrations on this page are decoded operation-result excerpts, not complete raw stdout or CLI envelopes. The unflagged REST runner prints the server body; inspect it for embedded errors before interpreting the decoded result.
Save `graph-get.json`, using the actual created name:

```json
{ "toolName": "d360_data_graph_get", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\",\"includeCIDetails\":true,\"includeSegmentDetails\":true}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS
```

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1" }
```

This is a read despite the HTTP POST transport. Check the root, fields/key flags, description and refresh settings, not just `ready`. We also read the generated ID, VALUE and root-fragment DMOs through API 65, using the exact names returned by the graph. That confirms those objects could be read in the source org, not that the graph's processing finished or that the same configuration works in another org. Nested graphs remain untested. Capture the exact generated object/transform references for checking deletion later; do not guess names. The consumer-detail flags do not promise a complete list of every external dependency.

**IR-owned roots:** For a graph rooted in an [Identity Resolution output](/next/data-cloud-cli/identity-resolution/#retrieve), correlate the graph's logical root with the exact unified Individual DMO returned by its owning ruleset. Read the ruleset independently through the facade and native API, and verify all twelve returned output/link DMOs through separate API 65 Connect REST and Metadata API reads. Check the root's actual Text field definitions and explicit Id key; do not guess generated names or reuse source-org IDs. A returned `sourceObject.devName` can identify the graph's own node rather than the logical DMO, so it is not by itself an owner or root binding.

A bounded qualification established this correlation for retained owned IR rulesets in two orgs: the portable API identities matched while the org-local IDs differed. One separately created setup graph in each org reached `ready`, with its exact returned transform reporting `ACTIVE` / `SUCCESS` and a completed run. Independent checks also matched the transform's input fields/key, grouping and generated outputs to that graph and root. At setup, the source graph projected Id, FirstName and LastName; the target projected Id and FirstName. These initial setup/read observations are separate from the later bounded target update described below and **do not establish a portable graph creation workflow**.

{% endcapture %}
{% include operation-tabs.html id="graphs-retrieve" label="Retrieve" cli_state="unknown" cli_reason="No standard CLI runtime graph retrieval workflow is supplied." api_state="available" api_reason="API 67 facade read with bounded owner/output correlation; not portable creation proof." api_body=retrieve_api plugin_state="available" plugin_reason="Bounded native API68 recursive retrieval and retained bindings; distinct from the API67 facade artifact." plugin_body=retrieve_plugin %}

## Create

{% capture create_plugin %}
Use the native artifact retrieved above, with a name independently confirmed absent
in the target and the qualified target-local root. Preview is read-only:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing
```

Native artifact deploy/delete accept auto/API68. Native deploy creates only after
independent absence/root checks and `--allow-processing`; creation automatically
materializes supporting resources and defaults to daily full refresh with incremental
refresh disabled despite omitting schedule input. An identical definition returns
zero-write unchanged without processing acknowledgement. A different existing
definition follows only the qualified UPDATE contract in the plugin Update tab.
CREATE remains root-only with ordered Text Id, key-qualifier and FirstName fields;
recursive retrieval/UPDATE does not enable recursive CREATE. No native Git
selection, mixed families, dependency expansion, alternate roots or cascade is
admitted. Live API68 create/read/delete qualification and offline installed-package
routing smoke are distinct; this is not live installed cross-org qualification. See the [Public Graph workflow](https://github.com/JoernBerkefeld/sf-plugin-data#public-graph-workflow)
for the complete artifact contract.
{% endcapture %}
{% capture create_api %}
Save `graph-create.json`. This is a root-only graph with a seven-day full-refresh schedule and incremental refresh disabled:

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
{% include operation-tabs.html id="graphs-create" label="Create" cli_state="unknown" cli_reason="No standard CLI runtime graph creation workflow is supplied." api_state="available" api_reason="Root-only API 67 facade creation automatically processes; no processing-free or cross-org guarantee." api_body=create_api plugin_state="available" plugin_reason="Qualified native API68 root-only create with automatic processing and independent absence checks." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
### Native API68 — bounded existing-target UPDATE

Retrieve the existing `NONE` graph in default space, rooted in the enabled standard
`ssot__Individual__dlm`. Edit only its description in the saved native artifact for
this example; preserve all other fields and configuration. Run the read and preview
before acknowledging automatic processing:

```sh
sf data360 retrieve -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version 68.0 -d ./project
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview --wait-timeout 1800
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --allow-processing --wait-timeout 1800
```

After independently confirmed success, repeat without processing acknowledgement:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --wait-timeout 1800
```

The bounded contract allows label/description changes and qualified additive
projections/related objects, including multihop relationships. It preserves retained
fields, recursive branches, key qualifiers, both join endpoints, generated bindings
and refresh configuration from the independently bound target. Omitting retained
fields or branches preserves them rather than removing them. Root/API identity,
key, qualifier, type, reparenting, join or refresh-setting changes and unsupported
nonvolatile properties block; this is not arbitrary graph editing or recursive CREATE.

Immediately before its single guarded PUT, the plugin independently requires item
`ready`, metadata `Ready` and the exact DataGraph record's `READY` / `ACTIVE` state,
with unchanged target/org/root/dataspace bindings. Independent post-write readiness
and full preservation establish `updated` / `confirmed-updated`, not the response
echo. Preview is read-only; an independently ready identical definition reports
`unchanged` with zero writes and needs no `--allow-processing`.

Native deploy's `--wait-timeout` is a positive integer in seconds, default `1800`,
for one invocation-wide readiness/write/settlement budget. GET retry/poll waits are
at least 20 seconds, subject to the remaining deadline. Executing an existing-target
workflow warns upfront on stderr that processing can take seconds to many minutes,
up to 30 minutes depending on objects, fields, data volume and service load. That
estimate is not a completion guarantee. Retry progress also goes to stderr in human
and JSON modes; optionally append `--json` for clean structured stdout. PUT HTTP
429/503, timeouts and uncertain outcomes are not automatically replayed. No native
Git selection, mixed families, dependency expansion or cascade is enabled.

**November 5, 2026 bounded qualification:** native API tests separately verified
label, description, additive-field, child and multihop changes. Installed public CLI
acceptance made one description-only PUT, followed by independent readiness and
full recursive preservation checks. JSON and human repeats were unchanged with
zero writes. A final fresh archive verified the stderr warning and clean JSON output
with zero-write checks, not another PUT. This does not qualify every additive edit
through the installed CLI, general cross-org portability or successful computation.

### Separate API67 facade — existing-owner LastName append

The implemented **API67 facade** route supports only the bounded existing-owner
LastName append. Retrieve the existing graph using auto (or numeric `67.0`), then edit
`./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json`,
not the distinct `.native-dataGraph.json` artifact. Append only the qualified non-key
projected Text LastName field to the existing ordered Text Id-key/FirstName prefix:

```sh
sf data360 retrieve -o TARGET_ALIAS -m data-graph:ExampleGraph --api-version auto -d ./project
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json --api-version auto --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.dataGraph.json --api-version auto --allow-processing
```

Preserve the ready root-only unified Individual `NONE` graph's full configuration,
seven-day refresh and disabled incremental refresh, target-local owner/root/node and
generated bindings. Independent root binding and completed owner-transform lineage
must pass before writing; source-org identities must not replace target-local ones.
The existing-owner qualification confirmed this append and a zero-write equality
repeat. Complete equality needs no processing acknowledgement; a substantive append
requires `--allow-processing` and may automatically process. Unknown outcomes must
not be replayed. This separate facade result does not qualify the native68 workflow
above, arbitrary edits, portable creation or a general cross-org lifecycle. See the [Public Graph workflow](https://github.com/JoernBerkefeld/sf-plugin-data#public-graph-workflow)
for the full bounded contract. Auto/API67 retrieval remains separate from explicit68.
{% endcapture %}
{% capture update_api %}
**Native API68 PUT — observed, not a documented contract:** On November 5, 2026,
a live test using Salesforce CLI OAuth accepted
`PUT /services/data/v68.0/ssot/data-graphs/{name}` with HTTP 200. This operation
was not listed in the official public Graph Connect specification when checked;
its observed availability is not a claim of a documented or supported API contract.
The bounded test preserved the full existing root-only definition and changed
only its description. Before writing, independent reads confirmed `Status: READY`,
`LastRunStatus: ACTIVE` and metadata status `Ready`; item `ready` alone was not
enough. After the update, independent item, metadata and DataGraph record reads
confirmed the new description and the same ready-state combination, with version
`"0"` unchanged. Settlement was confirmed about two minutes after acceptance,
not immediately. Processing can take seconds to many minutes depending on graph
complexity, data and load; do not treat a fixed wait as proof of completion or
repeat a mutation while it is settling. PATCH on both tested routes returned
HTTP 405. Later November 5 native API qualification separately confirmed bounded
label, additive-field, child and multihop changes with retained bindings. These are
observations, not a broader documented API contract. The plugin Update tab records
its separately implemented workflow and installed description-only UPDATE evidence;
this earlier raw PUT observation alone is not plugin qualification.

**Separate API67 facade workflow:** First confirm that initial generated-transform processing completed successfully and that the graph can be edited. `ready` alone is not enough, and **not every lifecycle state is mutable**. If edit eligibility is unclear, stop; this guide does not provide a universal status-to-editability check. Do not force a refresh to unlock editing.

We resolved the initial-processing check by reading the **exact `dayZeroTransformDevName` returned by the owner graph**, not by guessing a transform name. Save `graph-transform-get.json`, replacing `RETURNED_TRANSFORM_NAME` with that value:

```json
{ "toolName": "d360_transform_get", "paramsJson": "{\"dataTransformNameOrId\":\"RETURNED_TRANSFORM_NAME\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-transform-get.json' --target-org TARGET_ALIAS
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
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-update.json' --target-org TARGET_ALIAS
```

```json
{ "name": "CustomerGraph", "status": "processing", "version": "1" }
```

Read back with `graph-get.json`. The graph can pass through `processing` and `editing_post_sync` before `ready`. In the later source-only test, adding LastName while keeping label/description unchanged settled at `ready`, version `"1"`, about 30 minutes after the single update. The generated transform reported a new successful run before the graph finished settling. That duration is an observation, not a deadline or guarantee; do not repeat the update while waiting.

Independent readback confirmed the ordered Id, FirstName and LastName Text projections, only Id marked as the key, and the unchanged logical root, empty paths/related objects, seven-day schedule and disabled incremental refresh. GET omitted `creationMode`. A separate complete root-only update **omitting optional `creationMode`**, as illustrated above, also succeeded: fresh independent reads reached `ready`, version `"1"`, with a new completed owner-transform run reporting `ACTIVE` / `SUCCESS`. The create-to-final-read observation took about nine minutes; it is not a deadline or guarantee. Complete comparison retained all existing field properties, root/node and generated bindings, and refresh settings, with only LastName appended. You do not need a saved creation-time value to compare the persisted configuration: do not invent a missing GET value or require a past creation record for this bounded omission workflow. This does not establish preservation of an unreadable creation mode for arbitrary graphs or other update variants. Its generated `sourceObject.devName` was an owner-node binding, not the logical root name to copy blindly into a new request.

An identical repeat can preserve identities, version and configuration, but does not guarantee zero writes or no processing. Templates in your project are not automatically refreshed by this update.

**Bounded existing-owner target update:** The later two-org qualification completed one target Graph update through the API 67 facade, appending only the non-key projected Text LastName field to the existing Id/FirstName projection. The existing target IR ruleset was unchanged and received no update. After five settlement polls, the graph was `ready` and its exact owner-returned transform had the same identity, `ACTIVE` / `SUCCESS` and a later completed run. Separate full readbacks confirmed unchanged IR owner, all twelve output/link DMOs and root schema/key; the graph retained its previous field prefix, target-local identities, root/node/generated bindings and refresh settings, with only the supported projection append. Source-org IDs were not substituted for target-local identities.

An actual repeat of the same desired configuration then found both resources unchanged and sent **zero write requests or explicit processing jobs**. This is a bounded comparison-before-write result, **not** proof that replaying the raw `graph-update.json` request is write-free or processing-free: the earlier raw API repeat above retains that limitation. Automatic processing from the one substantive update was observed; no explicit refresh/run was needed. This continuation created no resources and does not establish portable IR/Graph creation, missing-prerequisite provisioning, arbitrary roots/edits or a complete cross-org lifecycle. The earlier pre-write refusals remain refusals; this later independently confirmed update is the new evidence.

{% endcapture %}
{% include operation-tabs.html id="graphs-update" label="Update" cli_state="unknown" cli_reason="No standard CLI runtime graph update workflow is supplied." api_state="available" api_reason="Bounded full-definition projection append after processing and edit-eligibility checks; not arbitrary edits." api_body=update_api plugin_state="available" plugin_reason="Bounded native API68 label/description/additive recursive UPDATE with preservation; separate API67 existing-owner LastName append." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Bind the exact native selector to its matching local native artifact. Preview first,
then acknowledge only the intended owned graph deletion:

```sh
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --preview
sf data360 delete -o TARGET_ALIAS -m data-graph:ExampleGraph --source-dir ./project/force-app/main/default/data360/dataGraphs/ExampleGraph.native-dataGraph.json --api-version 68.0 --confirm-delete
```

Delete requires the exact selector, matching local native artifact and
`--confirm-delete`, plus fresh ready state, org/identity/created-date, complete
configuration/root checks and explicitly empty known native dependency and
related-segment arrays. Unknown/nonempty dependencies block. **Exhaustive external
consumer exclusion remains unverified.** Independent graph-definition absence
ultimately passed live API68 create/read/delete qualification after stale metadata
readback was reconciled; an uncertain mutation must not be replayed. This does not
prove generated DMO, mapping, transform or internal-state removal, successful
computation, physical storage or credits cleanup. Preview is read-only; there is no
cascade or local artifact removal. Installed-package smoke verifies offline command
routing, not live installed cross-org qualification.
{% endcapture %}
{% capture delete_api %}
After checking dependencies and ownership, save `graph-delete.json`:

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

Confirm that the exact graph is no longer found. Check the captured generated object/transform references with the same access used before deletion; unreadable is not permission-independent proof of physical removal. A generated VALUE DMO was still readable after its graph was deleted, so deleting the graph did not confirm removal of all its generated objects. Note that **generated mapping absence and graph-specific internal-state cleanup are not proven**.

{% endcapture %}
{% include operation-tabs.html id="graphs-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI runtime graph deletion workflow is supplied." api_state="available" api_reason="Owned graph deletion through the API 67 facade; generated-object cleanup is not proven." api_body=delete_api plugin_state="available" plugin_reason="Guarded native API68 exact-artifact deletion; generated-resource cleanup is not proven." plugin_body=delete_plugin %}

Never delete the shared `DataGraphStateTable__dlm` or the source unified DMO as guessed cleanup. Local requests and any retrieved template remain.
