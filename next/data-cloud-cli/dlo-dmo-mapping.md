---
layout: page
title: "DLO-DMO-mapping"
description: "Salesforce CLI workflows and verified operation limits for DLO-to-DMO mapping: ObjectSourceTargetMap."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/dlo-dmo-mapping/
redirect_from:
  - /next/data-cloud-cli/object-source-target-map/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  retrieve: { status: "partial", methods: [cli, api, plugin] }
  create: { status: "partial", methods: [cli, api, plugin] }
  update: { status: "partial", methods: [cli, api, plugin] }
  delete: { status: "partial", methods: [api, plugin] }
---

*Last updated: November 2, 2026, 20:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** — `ObjectSourceTargetMap`.

This is the definition that connects fields in a DLO to fields in a DMO. Both objects must already exist with matching fields, primary keys and key qualifiers.

**API family:** The native JSON route
`/services/data/vXX.0/ssot/data-model-object-mappings` (including its item and
field-mapping routes) belongs to the **Data 360 Connect REST API**, not the
SOAP-based Metadata API. Salesforce lists mapping routes separately in the
[Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec)
and shows the full versioned URL in its
[mapping use case](https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.md).
Native plugin requests to this family use authenticated `sf api request rest`;
that is API access through a CLI runner, not a dedicated out-of-the-box mapping
command. The `sf project` XML examples in the CLI sections below instead use
Metadata API with `ObjectSourceTargetMap`. This attribution alone does not qualify
a native mapping workflow, alter the existing API-tab ratings or establish CRUD
support at an untested version.

{% include crud-summary.html %}

**Partial Plugin coverage — bounded installed API68 acceptance passed:** a fresh
local tarball, verified against the unchanged compiled tree, passed strict-selection
guards, read-only mixed preview, reverse-order mixed create, canonical retrieval,
zero-write unchanged redeployment, one additive field-pair update and guarded
non-last deletion. Last-mapping preview and execution were blocked without writes.
This qualifies only the operation-specific scopes below, not general CRUD,
arbitrary schemas, cross-org portability or field-pair removal. All four ratings
remain partial because these limitations still apply.

**Native API evidence:** separate API68 experiments proved mapping create and GET,
a selector-free additive field-pair PATCH, and conditional non-last deletion. They
are distinct from the installed plugin acceptance above and do not qualify API61–67 mapping writes. Default/`auto` selects
API68; explicit numeric `>=61.0` admission is not a live-tested version range.
Mapping DELETE is currently restricted by the implementation to API68.

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** the `sf project` retrieve/deploy examples on this page use
`ObjectSourceTargetMap` definitions, not the native Connect REST JSON route.

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the actual metadata member name from your org, not a name guessed from the source and target objects.

An independent exact-name standard Metadata API 65 retrieve was reverified on
October 29, 2026 for one retained mapping in one source org. The separately
retrieved XML matched the exported definition byte for byte in a configured
package source directory. This is source-only definition evidence: it does not
establish primary-key or key-qualifier compatibility, prerequisite readiness,
cross-org portability or operational deployment. No target calls, writes or
processing were performed in this check; it does not requalify the bounded
write examples below.

{% endcapture %}
{% capture retrieve_api %}
```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method GET --include
```

Use the server-returned mapping name. Independent API68 GET confirmed `ACTIVE`,
exact DLO/DMO bindings and all field pairs; the CLI is an API request runner here.
{% endcapture %}
{% capture retrieve_plugin %}
```sh
sf data360 retrieve -m mapping:CustomerMapping -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project --json
```

Saves `./project/data360/mapping/CustomerMapping.mapping-meta.json`, a versioned
native JSON definition, not an `ObjectSourceTargetMap` XML fallback. Retrieval
preserves logical source/target bindings and returned field pairs, including
server-generated system/qualifier pairs. Saved mapping names and source selectors
are not target identity: deploy resolves a unique target mapping by its DLO/DMO
bindings and uses the target's server-generated name/selectors. Installed API68
canonical retrieval passed and preserved all six returned pairs/selectors. Deploying
the retrieved file unchanged also passed with zero writes. Select that file with
`--source-dir ./project/data360/mapping/CustomerMapping.mapping-meta.json` **instead
of** `-m`; do not combine both selection modes. `--overwrite` permits replacing
changed local output only.
{% endcapture %}
{% include operation-tabs.html id="mapping-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the mapping XML using its actual metadata member name." cli_body=retrieve_cli api_state="available" api_reason="Independent native API68 mapping GET verified." api_body=retrieve_api plugin_state="available" plugin_reason="Installed API68 canonical JSON retrieval and unchanged zero-write redeployment passed." plugin_body=retrieve_plugin %}

## Create

{% capture create_cli %}
Start with a complete retrieved mapping file at `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. For example, one field pair looks like this:

```xml
<ObjectSourceTargetMap xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <fieldSourceTargetMaps>
    <creationType>Custom</creationType>
    <filterApplied>false</filterApplied>
    <filterOperationType>Equal</filterOperationType>
    <isSourceFormula>false</isSourceFormula>
    <sourceField>CustomerSource__dll.Id__c</sourceField>
    <targetField>Customer__dlm.Id__c</targetField>
  </fieldSourceTargetMaps>
  <!-- Other retrieved field pairs omitted. -->
  <masterLabel>Customer Mapping</masterLabel>
  <sourceObjectName>CustomerSource__dll</sourceObjectName>
  <targetObjectName>Customer__dlm</targetObjectName>
</ObjectSourceTargetMap>
```

Keep **all** field pairs in the real file. Once you have checked the existing custom objects and confirmed that this mapping does not already exist:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }] } }
```

Read the mapping back and compare the source, target and every runtime field pair. Salesforce can generate system qualifier pairs such as `KQ_Id__c` that were not in the XML; do not add guessed pairs yourself. This example does not cover arbitrary formulas or filters, and it does not guarantee that mapping creation performs no internal processing.

{% endcapture %}
{% capture create_api %}
Native API68 POST to `/services/data/v68.0/ssot/data-model-object-mappings?dataspace=default`
with explicit source/target developer names and names-only `fieldMapping` pairs
returned `201`. A separate GET confirmed the server-generated mapping name,
`ACTIVE`, requested pairs and generated system/qualifier pairs. Both parents
already existed; this is not a complete ingestion or arbitrary formula recipe.
{% endcapture %}

{% capture create_plugin %}
### Plugin create — bounded API68 qualification

From the project containing `data360/mapping/CustomerMapping.mapping-meta.json`:

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview --json
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --json
```

Installed API68/default mixed creation passed with reverse-order selectors;
execution still created DLO → DMO → Mapping. This is a bounded fresh-fixture result,
not arbitrary-schema or cross-org lifecycle qualification.
Deploy/delete require exact `type:ApiName` selections, not bare types or wildcards.
Mixed deploy orders DLO → DMO → Mapping regardless of selector order and must
independently verify the requested parent definitions before mapping access.
Preview reports planned dependencies without writes; that installed check passed.
The corrected actual run independently confirmed parent definitions before mapping
creation and returned confirmed-created outcomes for all three families: native
DLO POST `201` → DMO POST `201` → mapping POST `201`. Do not
assume a DMO must report `ACTIVE` or be enabled merely because a DLO does.
{% endcapture %}

{% include operation-tabs.html id="mapping-create" label="Create" cli_state="available" cli_reason="Complete mapping between existing custom objects; formulas, filters and processing-free creation are not established." cli_body=create_cli api_state="available" api_reason="Bounded native API68 create with independent ACTIVE readback." api_body=create_api plugin_state="available" plugin_reason="Installed API68 reverse-order mixed create passed with independent parent and mapping readbacks." plugin_body=create_plugin %}

## Update

**Shared restriction (CLI / API / Plugin):** the completed native Connect REST
API68 comparison rejected changing only the DLO, only the DMO, or both through the
field-mapping PATCH route, for both last and non-last mappings. All six requests
returned HTTP `404` for an input/existing-binding mismatch, not an absent original
mapping. This is not a claim that every update is impossible: a separate native
API68 selector-free field-mapping PATCH successfully added a field pair, whereas
the Metadata API example below establishes only a label change. These API results
do not establish experimental coverage of CLI and Plugin retargeting.
{: .mapping-shared-restriction }

{% capture update_cli %}
The verified change is the **label only**. Edit `masterLabel` in the complete file, leaving all pairs and object references alone:

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

Then deploy it:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

The file entry can report `Changed`; sending the same file again can report `Unchanged`. These are separate invocations, and neither proves that Salesforce performed no internal work. Read back the label and pairs. Retargeting, field removal and formula/filter updates have not been verified.

{% endcapture %}
{% capture update_api %}
Native API68 `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}/field-mappings?dataspace=default`
added one names-only field pair without a historical selector. Independent GET
confirmed the addition and preserved prior pairs/selectors. Replaying the same API
addition was idempotent, not proof that the plugin performs zero writes. Attempts
to replace an existing target pair could return `200` while ignoring the request;
adding another target for an existing source was additive, not replacement.
{% endcapture %}

{% capture update_plugin %}
### Plugin update — bounded installed API68 qualification

Preserve all saved pairs and bindings and add exactly one nonconflicting pair, then:

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview --json
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --json
```

The implementation resolves fresh target bindings/name, compares logical pair sets
and sends only a selector-free new-pair delta. It rejects removal, replacement,
retargeting and multi-pair additions before mutation. Installed API68 acceptance
added only `Beta__c` → `Beta__c` with exactly one selector-free PATCH `200`, preserving
all six previous pairs/selectors. The DLO representation and DMO schema, key and
label were unchanged; the DMO's derived `Beta__c.isMapped: true` flag appeared as
expected, so the entire raw DMO was **not** unchanged across this update.
Unchanged redeployment both before and after the addition passed with zero writes
after fresh reads. Saved source selectors are never replayed as target IDs.
{% endcapture %}

{% include operation-tabs.html id="mapping-update" label="Update" cli_state="available" cli_reason="Label-only update; retargeting, field removal and formula/filter updates are not verified." cli_body=update_cli api_state="available" api_reason="Native API68 selector-free single-pair addition only; not replacement." api_body=update_api plugin_state="available" plugin_reason="Installed API68 selector-free single-pair addition and zero-write unchanged redeployment passed; not removal or replacement." plugin_body=update_plugin %}

### Individual field-pair removal: separate API67 facade evidence

A selector-aware **API67 MCP facade** operation removed ordinary `Alpha__c`, then
`Beta__c` pairs: **7 → 6 → 5 pairs**. Each selector came from the observed target
mapping, not a guessed name or source artifact. Independent API67 GETs after every
attempt confirmed the mapping stayed `ACTIVE`, unchanged bindings and unaffected
pairs/selectors, and preservation of both parents and their key/schema settings.

Deleting primary-key `Id__c` was rejected. Deleting `KQ_Id__c`, `DataSource__c`,
`DataSourceObject__c` and `InternalOrganization__c` was also rejected because they
were system-generated mappings. Those five pairs remained: removing all ordinary
nonkey pairs did **not** produce a zero-pair mapping or remove the relationship.
This is one qualified fixture, not a universal minimum pair count.

The facade returned HTTP `201` envelopes for both successful results and errors;
that is **not the underlying native DELETE status**. Native API68 individual
field-pair DELETE remains unqualified. The plugin still rejects field-pair removal;
this facade evidence does not add Plugin removal support. The installed API68
whole-mapping deletion below is a separate qualified operation.

### Completed API68 binding-retarget comparison

On November 2, 2026, each case first tested the last mapping, then repeated the
attempt only after a separate DLO-to-original-DMO survivor mapping was independently
`ACTIVE`: two distinct DLO mappings then existed for the original DMO.

- **a — DLO only:** alternate source DLO, original target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **b — DMO only:** original source DLO, alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **c — both:** alternate source DLO and alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.

All six used `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{originalMappingName}/field-mappings?dataspace=default`,
with the desired source/target developer names and a names-only `Beta__c` →
`Beta__c` field addition. That valid Text field existed on every parent and was not
already mapped. The service rejected the mismatch between the requested bindings
and those resolved from the original mapping name (`Is Valid Interface: false`).
Independent original GETs returned HTTP `200`, `ACTIVE`, with the same name,
source/target selectors and all six field pairs; survivor mappings and all parent
schemas/primary keys were unchanged. Separate target/pair reads found no alternate
binding. No deletion was attempted in this comparison.

This establishes a limitation of that tested API68 route in one org, not universal
unavailability of every Salesforce retarget mechanism or plugin acceptance.
`replaceSource` was not attempted: its semantics were undocumented in the inspected
contract. Do not infer a replacement or last-mapping-deletion workaround from it.

## Delete

**Shared restriction (CLI / API / Plugin):** the last-mapping removal restriction
is a platform constraint, not merely a plugin limitation; see
[Salesforce Help](https://help.salesforce.com/s/articleView?id=001993463&language=en_US&type=1).
In the bounded native Connect REST API68 experiment, deleting the last mapping
returned HTTP `500`; deleting a non-last mapping returned HTTP `204` with an empty
body, followed by two exact mapping GET `404` readbacks while both parent objects
remained. This does not establish that CLI, API and Plugin deletion were all
experimentally tested, or authorize deleting a parent as a workaround. The completed
retarget comparison above did not provide a workaround for last-mapping deletion.
{: .mapping-shared-restriction }

{% capture delete_evidence %}
Whole-mapping deletion depends on the **target DMO's remaining DLO mappings**:
adding a second DMO to the same DLO does **not** unlock deletion of the first
mapping. Adding a second DLO mapped to the same DMO permits the qualified non-last
mapping deletion while retaining its survivor.

Deleting the qualified empty, owned DMO cascades its mapping and leaves the DLO
intact. That bounded observation is not permission to delete a business or shared
parent as a workaround for the last-mapping restriction. It does not establish a
plugin cascade feature; the separate installed non-last deletion does not delete
parents.

{% endcapture %}
{% capture delete_api %}
Native API68 DELETE to `/services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}?dataspace=default`
returned `204` only in the qualified non-last case. Two independent exact GET
`404` reads confirmed absence while the distinct-DLO survivor mapping and both
parent definitions remained. The last-mapping failure above still applies; never
delete a parent as a workaround.
{% endcapture %}

{% capture delete_plugin %}
### Plugin delete — bounded installed API68 qualification

**Destructive:** only the qualified non-last mapping case is supported.

```sh
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview --json
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --json
```

Preview runs the same fresh guard without writes. Execution has no separate
confirmation prompt. The guard requires another independently read `ACTIVE`
mapping from a distinct DLO to the same DMO, verifies parents and survivor, and
blocks the last mapping before DELETE. Execution must independently confirm exact
absence and unchanged survivor/parents; it never cascades or removes local JSON.
Installed API68 non-last preview passed with zero writes; execution issued exactly
one DELETE `204`, followed by an independent typed `404` absence check. The survivor
remained `ACTIVE` and byte-equivalent, and both DLOs and the DMO were byte-equivalent
to their immediate pre-delete representations. Last-mapping preview **and** execution
returned `MAPPING_LAST_MAPPING_DELETE_BLOCKED` with zero writes. There is no parent
deletion fallback.
{% endcapture %}

{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="blocked" cli_reason="Standalone mapping deletion can fail with an internal error or sole-mapping removal restriction." api_state="available" api_reason="Native API68 non-last deletion only, with independent absence and preservation checks." api_body=delete_api plugin_state="available" plugin_reason="Installed API68 non-last DELETE/preservation passed; last-mapping preview and execution blocked without writes." plugin_body=delete_plugin %}

{{ delete_evidence | markdownify }}
