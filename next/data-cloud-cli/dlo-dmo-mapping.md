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
  read: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  update: { status: "partial", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Read its setup and safety guidance before running these examples.

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** (`ObjectSourceTargetMap`) connects fields in a Data Lake Object (DLO), the source, to fields in a Data Model Object (DMO), the target. Both objects must already exist, with matching keys.

**Example used in every chapter:** the mapping `CustomerMapping`, from the DLO `CustomerSource__dll` to the DMO `Customer__dlm`.

{% include crud-summary.html %}

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every mapping.

## Read

{% capture read_cli %}
Downloads the mapping as an XML file with the Metadata API.

**Metadata API (XML):** this uses `ObjectSourceTargetMap` definitions, not the native Connect REST JSON route.

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0
```

The file is saved as `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the metadata name from your org, not a name guessed from the objects.
{% endcapture %}

{% capture read_connect %}
Reads the mapping over the Connect REST API. Nothing in the org changes. Use the server-returned mapping name.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method GET
```

A sample response is not in this guide yet. A GET confirms the status, the DLO and DMO bindings and every field pair.
{% endcapture %}

{% capture read_plugin %}
Saves the mapping as one JSON file. The pairs Salesforce generates are left out of the file.

```sh
sf data360 retrieve -m mapping:CustomerMapping -o SOURCE_ALIAS
```

The file is `data360/mapping/CustomerMapping.mapping-meta.json`. It is a native JSON definition, not an `ObjectSourceTargetMap` XML fallback. A sample file is not in this guide yet.

**Known failures:**

- Inventory retrieval fails with `NATIVE_INVENTORY_UNCONFIRMED`. The `-m mapping` and bare `sf data360 retrieve` attempts produced no files.
- A retrieve by type only timed out. Use the exact `mapping:Name` selection.
{% endcapture %}

{% include operation-tabs.html id="mapping-read" label="Read" cli_state="available" cli_reason="Retrieves the mapping XML using its actual metadata member name." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Reads the mapping over the native Connect REST route." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves one mapping by exact name. Inventory retrieval is not supported." plugin_body=read_plugin %}

## Create

{% capture create_cli %}
Deploys a mapping file that lists every field pair. Both objects must already exist. Keep all field pairs from the retrieved file.

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

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun
```

Sample result, with `--json` added:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }] } }
```

Read the mapping back to confirm the source, target and field pairs. Salesforce adds system pairs such as `KQ_Id__c` by itself.
{% endcapture %}

{% capture create_connect %}
Creates the mapping with one native POST. Both objects must already exist.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings?dataspace=default --target-org TARGET_ALIAS --method POST --body @mapping-create.json --header Content-Type:application/json
```

Save `mapping-create.json`. It names both objects and lists the field pairs you author, by developer name only:

```json
{
  "sourceEntityDeveloperName": "CustomerSource__dll",
  "targetEntityDeveloperName": "Customer__dlm",
  "fieldMapping": [
    { "sourceFieldDeveloperName": "Id__c", "targetFieldDeveloperName": "Id__c" },
    { "sourceFieldDeveloperName": "Alpha__c", "targetFieldDeveloperName": "Alpha__c" }
  ]
}
```

Include the pair that joins the two primary keys. Leave out the pairs Salesforce generates (`KQ_Id__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`) and any selectors from another org. Salesforce returns HTTP `201` and names the mapping itself. A sample response is not in this guide yet. A GET afterwards confirms the mapping is `ACTIVE`, the server-generated name, your pairs and the generated pairs.
{% endcapture %}

{% capture create_plugin %}
Creates the mapping from the project file, `data360/mapping/CustomerMapping.mapping-meta.json`. Preview first.

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

A sample of the output is not in this guide yet. Execution ends with a `Deployed: n (x created / y updated / z failed)` line.
{% endcapture %}

{% include operation-tabs.html id="mapping-create" label="Create" cli_state="available" cli_reason="Creates a mapping between existing custom objects with a complete XML file." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Creates the mapping with one native request, confirmed by a read." connect_body=create_connect plugin_state="available" plugin_reason="Creates the mapping from a project file, confirmed by a read." plugin_body=create_plugin %}

## Update

{% capture update_cli %}
Changes the label only. Edit `masterLabel` in the complete file, leaving the pairs and object references alone.

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun
```

The output reports `Changed` for the edited file. Sending the same file again reports `Unchanged`. These are separate invocations.
{% endcapture %}

{% capture update_connect %}
Adds field pairs to an existing mapping with one PATCH. Existing pairs are kept.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME/field-mappings?dataspace=default --target-org TARGET_ALIAS --method PATCH --body @mapping-add-pair.json --header Content-Type:application/json
```

Save `mapping-add-pair.json`. It repeats both objects and lists only the pairs to add:

```json
{
  "sourceEntityDeveloperName": "CustomerSource__dll",
  "targetEntityDeveloperName": "Customer__dlm",
  "fieldMapping": [
    { "sourceFieldDeveloperName": "Beta__c", "targetFieldDeveloperName": "Beta__c" }
  ]
}
```

Use the server-generated mapping name from a GET in the path. The objects in the body must match the mapping's own. HTTP `200` is not proof of the change. Read the mapping afterwards.

**Known failures:**

- Changing the source or the target object through this route returns HTTP `404`.
- Replacing an existing target pair can return HTTP `200` and change nothing.
{% endcapture %}

{% capture update_plugin %}
Deploys the field pairs in the JSON file. New pairs are added. Authored pairs left out of `fieldMappings` are removed. Keep the primary-key pair in the file. Preview first.

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

The output names the added and removed pairs, then ends with the `Deployed:` count, for example `Deployed: 2 (1 created / 1 updated / 1 failed)`.
{% endcapture %}


Mapping updates is restricted: the API results below do not establish CLI or plugin retargeting.
{: .mapping-shared-restriction }
{% include operation-tabs.html id="mapping-update" label="Update" cli_state="available" cli_reason="Changes the label only. Retargeting and field removal are not verified through the CLI." cli_body=update_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Adds one pair, or two Text pairs, with one request. Replacement is not supported." connect_body=update_connect plugin_state="available" plugin_reason="Adds, removes and retargets bounded Text pairs in a JSON file. Not a general guarantee." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
No CLI command deletes a mapping in this guide. Not verified.
{% endcapture %}

{% capture delete_connect %}
Deletes one mapping with a native DELETE. Salesforce does not delete the last mapping of a custom DMO.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method DELETE
```

The response has no body (HTTP `204`). A GET afterwards should return `404`.

**Known failures:**

- Deleting the last mapping of a custom DMO fails with HTTP `500`.
- Deleting a non-last mapping can also remove DMO fields.
{% endcapture %}

{% capture delete_plugin %}
Deletes the whole mapping with one Metadata API deployment. It does not delete either parent object. Preview first.

```sh
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

There is no confirmation prompt or extra execution flag. The second command changes the org immediately. A sample of the output is not in this guide yet.

**Known failures:**

- The last mapping of a custom DMO is refused before any write. Delete the DMO instead, with `sf data360 delete --metadata dmo:Customer__dlm -o TARGET_ALIAS`.
{% endcapture %}


Mapping deletes is restricted: the API results below do not establish CLI or plugin retargeting.
{: .mapping-shared-restriction }
{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="unknown" cli_reason="No verified CLI command deletes a mapping." cli_body=delete_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Partial. Deletes one non-last mapping on bounded empty fixtures." connect_body=delete_connect plugin_state="available" plugin_reason="Partial. Observed on empty objects. The last mapping of a custom DMO is refused." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-model-object-mappings` (including its item and field-mapping routes) belongs to the **Data 360 Connect REST API**, not the SOAP-based Metadata API. Salesforce lists mapping routes separately in the [Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) and shows the full versioned URL in its [mapping use case](https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.md). Native plugin requests to this family use authenticated `sf api request rest`; that is API access through a CLI runner, not a dedicated out-of-the-box mapping command. The `sf project` XML examples in the CLI sections instead use Metadata API with `ObjectSourceTargetMap`. This attribution alone does not qualify a native mapping workflow, alter the existing API-tab ratings or establish CRUD support at an untested version.

### Plugin coverage and installed acceptance

**Partial Plugin coverage — keep installed acceptance separate from implementation:** bounded installed API68 acceptance passed strict-selection guards, mixed preview/create, exact canonical retrieval, unchanged redeployment and single-pair Text/compatible Number additions. New installed API68 canonical JSON reconciliation passed bounded Text removal, two-pair Text batch addition and both Text field-pair retarget directions. Whole-mapping deletion through the plugin is observed at API68 on empty objects in two orgs; see [Delete](#delete). These are empty-fixture results, not general lifecycle qualification.

**Cross-org acceptance:** an installed API68/default workflow retrieved an exact source mapping, changed only its logical DLO/DMO bindings to compatible target-local empty Other/Text fixtures, then passed create, canonical retrieve, one additive Text pair and a GET-only unchanged repeat. Explicit previews were read-only. The last mapping of each owned custom DMO and its parents remain, because Salesforce does not delete the last mapping of a custom DMO; no DMO-object deletion, cascade or complete cleanup was tested. This does not qualify general cross-org schemas, populated objects, inventory completeness, lower-version portability or the released package.

Retrieve and Create remain Yes within their supplied scopes; Update remains Partial. Plugin Retrieve Yes qualifies exact `mapping:Name` selection only. Type-only and bare inventory reads failed with `NATIVE_INVENTORY_UNCONFIRMED` and zero artifacts. A later mapping type-only acceptance attempt timed out, not passed. Neither inventory mode is acceptance-qualified by the exact retrieval result.

**Current implementation:** the JSON file is desired state for API68 field-pair reconciliation. Omitted authored pairs are individually unmapped first, then additions are sent together in one names-only PATCH. Whole-mapping deletion admits exact API61–68 pins, with default/`auto` selecting API68, and deletes the mapping with one Metadata API destructive deployment for `ObjectSourceTargetMap`. Only the last mapping of a **custom** DMO is refused, **before any write**. Delete is Partial for API and Plugin in the supplied-workflow ratings: the evidence is bounded, not a general-purpose deletion guarantee. Out-of-the-box CLI deletion remains not tested.

**Native API evidence:** API68 create/GET, qualified batch additions, ordinary field unmaps and both Text field-pair retarget directions were independently observed. Removing the ordinary pairs one at a time and then deleting the non-last mapping with a native DELETE preserved the bounded fixtures at API61 and API68. API62–67 are not live-tested for deletion. API60 read-route rejection and the documented API61 floor do not prove an API60 DELETE failure: no such DELETE was attempted. A direct non-last native DELETE can remove DMO fields despite HTTP `204`, and a native DELETE of the last mapping of a custom DMO returns HTTP `500`. See [Delete](#delete) for what the plugin does instead. The deferred `totalSize` inventory issue remains a known issue; it was not investigated or requalified in this update.

**Dataspace option:** Native commands accept optional `--dataspace NAME` (alias `--data-space`); use only one spelling. There is no CLI default. Mapping requests include the `dataspace` query only when explicitly supplied. Omission keeps the documented default context for local identity checks without injecting `dataspace=default` into HTTP requests. Requested scope, saved identity and fresh mapping/parent identities must agree before writes. See the [shared scope and output guidance](/next/data-cloud-cli/#native-plugin-scope-and-readable-results). This implementation support does not establish nondefault-space live acceptance, resolve inventory completeness or broaden the bounded mapping qualifications above.

### Read evidence

Independent exact-name standard Metadata API 65 retrieve was reverified for one retained mapping in one source org. The separately retrieved XML matched the exported definition byte for byte in a configured package source directory. This is source-only definition evidence: it does not establish primary-key or key-qualifier compatibility, prerequisite readiness, cross-org portability or operational deployment. No target calls, writes or processing were performed in this check; it does not requalify the bounded write examples below.

Independent API68 GET confirmed `ACTIVE`, exact DLO/DMO bindings and all field pairs; the CLI is an API request runner here.

Plugin retrieval writes the authored pairs. Each pair Salesforce generates is also checked against fresh reads of the source DLO and the target DMO, so a generated pair left out of a file is never read as a removal. When those reads fail, retrieve refuses with `MAPPING_GENERATED_PAIRS_UNPROVEN` and writes nothing. Saved mapping names and source selectors are not target identity: deploy resolves a unique target mapping by its DLO/DMO bindings and uses the target's server-generated name/selectors. Observed at API68 through the plugin in one org: a custom mapping retrieved with its four authored pairs only and a mapping onto `ssot__Brand__dlm` with `Name__c` → `ssot__Name__c` and `Id__c` → `ssot__Id__c`; both deployed back `unchanged`, and the org still held every generated pair. Select that file with `--source-dir ./project/data360/mapping/CustomerMapping.mapping-meta.json` **instead of** `-m`; do not combine both selection modes. `--overwrite` permits replacing changed local output only.

Exact-selection retrieval passed, not inventory discovery. The `sf data360 retrieve -m mapping` and bare `sf data360 retrieve` attempts failed with `NATIVE_INVENTORY_UNCONFIRMED`, producing zero artifacts. A later mapping type-only acceptance attempt timed out, not passed. Do not treat an error or timeout as a successful guard, or infer inventory support from exact-selection retrieval.

### Create evidence

Native API68 POST to `/services/data/v68.0/ssot/data-model-object-mappings?dataspace=default` with explicit source/target developer names and names-only `fieldMapping` pairs returned `201`. A separate GET confirmed the server-generated mapping name, `ACTIVE`, requested pairs and generated system/qualifier pairs. Both parents already existed; this is not a complete ingestion or arbitrary formula recipe.

### Plugin create — bounded API68 qualification

Installed API68/default mixed creation passed with reverse-order selectors; execution still created DLO → DMO → Mapping. This is a bounded fresh-fixture result, not arbitrary-schema or cross-org lifecycle qualification. Separate installed API68 creation against existing compatible parents also passed with nonidentical field names: `Alpha__c` → `Label__c`, alongside `Id__c` → `Id__c`. One POST returned `201`; independent GET confirmed `ACTIVE` and all six pairs, including four generated pairs. Matching source and target field names are not a prerequisite of this result. Deploy/delete require exact `type:ApiName` selections, not bare types or wildcards. Mixed deploy orders DLO → DMO → Mapping regardless of selector order and must independently verify the requested parent definitions before mapping access. Preview reports planned dependencies without writes; that installed check passed. The corrected actual run independently confirmed parent definitions before mapping creation and returned confirmed-created outcomes for all three families: native DLO POST `201` → DMO POST `201` → mapping POST `201`. Do not assume a DMO must report `ACTIVE` or be enabled merely because a DLO does.

### Update evidence

**Shared API restriction:** the completed native Connect REST API68 comparison rejected changing only the DLO, only the DMO, or both through the field-mapping PATCH route, for both last and non-last mappings. All six requests
returned HTTP `404` for an input/existing-binding mismatch, not an absent original
mapping. This is not a claim that every update is impossible: a separate native API68 selector-free field-mapping PATCH successfully added a field pair, whereas the Metadata API example above establishes only a label change. These API results do not establish experimental coverage of CLI and Plugin retargeting.

Native API68 `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}/field-mappings?dataspace=default` added one names-only field pair without a selector. Independent GET confirmed the addition and preserved prior pairs/selectors. Replaying the same API addition was idempotent, not proof that the plugin performs zero writes. Attempts to replace an existing target pair could return `200` while ignoring the request; adding another target for an existing source was additive, not replacement.

A separate native API68 request added **two independent Text pairs in one PATCH**: `Beta__c` → `Beta__c` and `Gamma__c` → `Gamma__c`. HTTP `200` was followed by independent `ACTIVE` readback: six pairs became eight, each new pair appeared exactly once, and all six prior pair objects and selectors were preserved. Both DLO representations were unchanged; the DMO schema, keys, identity and other properties were preserved, allowing the expected per-field `isMapped` flags. This qualifies that two-pair request, not arbitrary batch sizes or unrestricted replacement. The plugin passed the bounded installed Text batch-addition and reconciliation checks below.

### Plugin update — bounded installed API68 desired-state acceptance

Edit `fieldMappings` in the JSON file, preserving the DLO/DMO bindings and the primary-key pair. The file may list only the authored pairs: the pairs Salesforce generated (three system pairs and the key qualifier pair) are taken from the org's copy and treated as part of the file. A retrieved file lists exactly the authored pairs, so it behaves like a hand-written one. Preview the exact selection before execution.

The current implementation resolves fresh target bindings/name and compares exact logical pair sets; saved selectors are never target IDs. At API68, omitting an eligible authored pair from `fieldMappings` requests its removal, not just an addition-only delta. Preview lists ordered unmaps followed by additions. Execution uses freshly observed field selectors for individual DELETEs, verifies preservation after each, then sends additions in one selector-free PATCH (`fieldMapping` on the wire). It requires exact final desired pairs and preserved retained selectors, parents and inventory. There is no write retry or rollback; a failure after any write is failed/unknown, and a mixed batch stops at that item.

Any authored pair can be removed this way: its target may be a custom or a standard field, source and target names may differ, and the type need not be Text. Salesforce decides whether the removal is accepted. Additions in reconciliation are custom nonkey Text pairs with no special usage/qualifier or conflicting target. Both same-source/new-target and new-source/same-target **Text field-pair** retargets are implemented; they do not change the mapping's DLO/DMO bindings. Native API68 evidence proved those two directions on the same fresh empty fixture in sequence, not on populated objects or arbitrary schemas. The authored primary-key pair must stay in the file (`MAPPING_PROTECTED_PAIR_REQUIRED`). The generated qualifier and system pairs may be left out of the file and are never removed. The full desired plan and fresh evidence-bound parent policy must pass before the first write; later drift stops execution. API61–67 deletion admission does not widen this API68-only reconciliation path. The existing single compatible addition path, including Number, is preserved.

In simple terms: remove an authored pair from `spec.fieldMappings` and deploy that JSON file to remove the field mapping. The operation removes the connection, not the DMO field itself. Keep the primary-key pair; the generated qualifier and system pairs may be listed or left out. For a field-pair retarget, replace the old pair with the new one; execution removes the old connection before adding the new one. This does not retarget the source DLO or target DMO.

Omit `--json` for readable output. Each component has its own action line with its type and API name. After a confirmed mapping update, separate comma-separated `Deleted field mappings: source -> target, ...` and `Added field mappings: source -> target, ...` lines show the changed pairs. Empty lists are omitted; a retarget appears in both. Preview lines say `Planned`; unchanged or failed updates do not claim completed field changes. `--json` retains the structured result without these human-readable lines.

Execution finishes with `Deployed: n (x created / y updated / z failed)`; `n` counts only confirmed created and updated components, not unchanged, blocked or unattempted items or individual field operations. A failed mapping counts once as failed, not as updated. Preview does not claim completed deployments. For example: `Deployed: 2 (1 created / 1 updated / 1 failed)`.

Readable retrieval output lists each successful name, grouped by type, then `Downloaded mapping: n` after the mapping items. The count includes unchanged local files retrieved successfully, but excludes failed names. Named, type-only and bare selection use the same successful-component count, never API `totalSize`. This display change does not establish mapping inventory completeness or qualify the unconfirmed inventory workflows described above.

**Single-pair installed acceptance:** the plugin added only `Beta__c` → `Beta__c` with exactly one selector-free PATCH `200`, preserving all six previous pairs/selectors. The DLO representation and DMO schema, key and label were unchanged; the DMO's derived `Beta__c.isMapped: true` flag appeared as expected, so the entire raw DMO was **not** unchanged across this update. Unchanged redeployment both before and after the addition passed with zero writes after fresh reads. Saved source selectors are never replayed as target IDs.

Adding `Beta__c` and `Gamma__c` together was refused with `UNSUPPORTED_MAPPING_MULTI_PAIR_UPDATE`, with zero writes and an unchanged mapping, in one bounded check. The current implementation does not use that limit. After the native two-pair addition, deploying the complete JSON definition was unchanged with zero writes.

**Completed installed API68 reconciliation:** one JSON change removed `A__c` → `A__c` and batch-added `D__c` → `D__c` plus `E__c` → `E__c`. Execution used one observed-selector DELETE `204`, then one names-only PATCH `200`. Separate changes retargeted `B__c` → `B__c` to `B__c` → `C__c`, then `D__c` → `D__c` to `F__c` → `D__c`, each with DELETE `204` then PATCH `200`. These ran sequentially on the same fresh empty fixture, not independent pristine fixtures. Each preview and unchanged repeat performed zero writes. Independent GETs verified exact desired pairs, retained selectors, full DLO preservation, DMO schema/nonflag preservation and only expected mapped-flag changes. Installed removal coverage here is Text only, not Number removal.

**Pair onto a standard field:** on the standard DMO `ssot__Brand__dlm`, deploying the retrieved mapping file without the pair `Name__c` → `ssot__Name__c` removed that pair at API68.

**Hand-written files with authored pairs only:** observed at API68 through the plugin in one org. A DLO, a custom DMO and their mapping, written by hand with only the authored fields and pairs, were created and deployed again: all three reported `unchanged` and nothing was written. With one field added to the DLO and to the DMO, and one pair added and one authored pair dropped in the mapping file, all three reported `updated`; the mapping then held the two kept authored pairs, the new pair, the key pair and the four generated pairs. A hand-written DLO and a mapping onto the standard DMO `ssot__Brand__dlm` with the pairs `Id__c` → `ssot__Id__c` and `Name__c` → `ssot__Name__c` were created and deployed again: `unchanged`.

**Timings:** measured at API68 through the plugin in one org, on empty fixtures. The plugin reads over one authenticated connection per org; only writes run through the Salesforce CLI.

| Operation | Time |
| --- | --- |
| Create a DLO, a custom DMO and their mapping | 45 s |
| Unchanged redeploy of two DLOs, a DMO and two mappings | 9 s |
| Mapping deploy removing one pair | 17 s |
| Two mapping deploys, each adding one pair | 32 s |
| DLO, DMO and mapping together: one field added to the DLO and the DMO, one pair added and one dropped | 64 s |

A compatible **Number** pair, `Count__c` → `Count__c`, then passed as a single plugin addition: one names-only PATCH `200`, independent `ACTIVE` readback from eight to nine pairs, and preservation of all eight prior pair objects/selectors. Parent definitions were preserved with only expected DMO `isMapped` flag changes allowed. Repeating that deployment was unchanged with zero writes. This qualifies one compatible Number addition, not every data type, Number-based creation or plugin multi-pair updates.

### API 61 create and single addition

The plugin admits mapping operations from API 61. At explicit API 61, empty custom Other/Text objects passed mapping create, exact retrieval, one added Text pair and an unchanged repeat. Independent reads confirmed the mapping was ACTIVE and every earlier pair and field stayed the same. This covers that path, not general CRUD at API 61.

### Protected pairs

Native API61 and API68 unmaps of ordinary Text and Number pairs returned `204` and always left five pairs: the primary-key pair `Id__c` and the generated pairs `KQ_Id__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`. Removing every ordinary pair did **not** produce a zero-pair mapping or remove the relationship. No native API68 attempt to delete one of those five pairs is recorded; through the API 67 MCP facade, deleting each of them was rejected. Later installed API68 Text reconciliation passed as described above; it does not establish installed Number-removal coverage.

### Completed API68 binding-retarget comparison

On the comparison date, each case first tested the last mapping, then repeated the attempt only after a separate DLO-to-original-DMO survivor mapping was independently `ACTIVE`: two distinct DLO mappings then existed for the original DMO.

- **a — DLO only:** alternate source DLO, original target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **b — DMO only:** original source DLO, alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **c — both:** alternate source DLO and alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.

All six used `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{originalMappingName}/field-mappings?dataspace=default`, with the desired source/target developer names and a names-only `Beta__c` → `Beta__c` field addition. That valid Text field existed on every parent and was not already mapped. The service rejected the mismatch between the requested bindings and those resolved from the original mapping name (`Is Valid Interface: false`). Independent original GETs returned HTTP `200`, `ACTIVE`, with the same name, source/target selectors and all six field pairs; survivor mappings and all parent schemas/primary keys were unchanged. Separate target/pair reads found no alternate binding. No deletion was attempted in this comparison.

This establishes a limitation of that tested API68 route in one org, not universal unavailability of every Salesforce retarget mechanism or plugin acceptance. `replaceSource` was not attempted: its semantics were undocumented in the inspected contract. Do not infer a replacement or last-mapping-deletion workaround from it.

### Delete evidence

**Shared destructive-safety restriction:** Salesforce does not delete the last mapping of a custom target DMO; see [Salesforce Help](https://help.salesforce.com/s/articleView?id=001993463&language=en_US&type=1). A native DELETE of it returns HTTP `500`, and the Metadata API answers with an internal error. Deleting the DMO removes its mapping; do that only with a DMO that is yours to delete. A direct native DELETE of a non-last mapping can return HTTP `204` and still remove DMO fields. Evidence is limited to empty objects and the versions below, not general-purpose deletion.

**Partial coverage:** a native DELETE of a non-last mapping returns HTTP `204`; for the last mapping of a custom DMO it returns HTTP `500`. At API61 and API68, removing the ordinary pairs one at a time and then deleting the non-last mapping preserved bounded empty fixtures; see the [native evidence and limits](#native-unmap-first-evidence-and-limits). This is not a standalone direct-DELETE recipe or general preservation guarantee: a direct non-last DELETE also removed DMO fields in one experiment.

### Plugin delete — one Metadata API destructive deployment

`sf data360 delete -m mapping:<Name>` sends one Metadata API destructive deployment: type `ObjectSourceTargetMap`, member the mapping developer name. It does not unmap pairs first and sends no native DELETE. Exact API61.0–68.0 pins are admitted; default/`auto` selects 68.0. The behaviour is observed live at API68 only. Other versions are rejected for this path; numeric admission on unrelated read/create paths is not deletion support.

Before the write, the plugin reads the mapping, all mappings of the target DMO and the DMO. If the mapping is the **last mapping of a custom DMO**, it stops there with `MAPPING_LAST_MAPPING_DELETE_BLOCKED`; the message names the DMO and the command that deletes it. Another DMO on the same DLO does not change this. Being the last mapping of a **DLO** is no obstacle. The last mapping of a **standard** DMO is deleted normally; the DMO stays enabled with its generated `KQ_Id__c` field and no mapped fields. Preview performs the same reads and the same refusal without a write.

The plugin deletes the whole mapping whatever pairs it holds, including pairs onto standard fields and mappings onto standard DMOs. To remove only single field pairs while keeping the mapping, edit `spec.fieldMappings` in the JSON file and use `sf data360 deploy` as described under Update, not `delete`. After a confirmed deletion the plugin removes the local mapping file (`data360/mapping/<Name>.mapping-meta.json`, or a hand-written file whose binding matches) and lists it in `removedLocalFiles`; `--keep-local-files` keeps it, and preview lists it as `localFiles` with `exists`. Bare `mapping` and wildcard selections are not accepted. This deletes the selected relationship, not either parent object.

After the write, the plugin polls (up to 6 reads, 5 seconds apart) until the mapping reads `404`. It then requires that the DMO's other mappings (pairs and selectors) and the DMO's field names are exactly what they were.

| Diagnostic | Meaning |
|---|---|
| `MAPPING_LAST_MAPPING_DELETE_BLOCKED` | Last mapping of a custom DMO. Nothing is written. Delete the DMO instead. |
| `MAPPING_DELETE_FAILED` | Salesforce did not confirm the deployment. The message carries Salesforce's problem text. The deployment is never retried. |
| `MAPPING_DELETION_UNCONFIRMED` | The deployment was confirmed, but the mapping was still readable after the last poll. |
| `MAPPING_DELETE_SIDE_EFFECT` | The mapping is gone, but another mapping of the DMO or the DMO's field names changed. |

There is no rollback and no parent deletion. After a confirmed deletion the local mapping file is removed unless `--keep-local-files` is set; a failed removal keeps the org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`. Observed at API68: the preview listed the mapping file, and the delete removed it (27 seconds).

**Observed at API68 through the plugin, on empty objects in the default data space:**

- **Non-last mapping of a custom DMO** with two mappings: deleted in 21 seconds. The other mapping and all 8 DMO fields were unchanged.
- **Last mapping of the same custom DMO:** refused in 4 seconds with the message described above. Nothing was written.
- **Only mapping of the standard DMO `ssot__Brand__dlm`:** deleted in two orgs (25 and 28 seconds). In one of them the mapping still held the pair onto the standard field `ssot__Name__c`.

Populated objects, non-default data spaces and API61–67 are not verified for plugin deletion.

### Native unmap-first evidence and limits

At API61 and API68, fresh owned empty fixtures removed unique ordinary Text and Number pairs one at a time (`204`), leaving the five protected pairs, then deleted the selected non-last mapping once (`204`). Typed GET absence, complete inventory, unchanged DLOs, preserved DMO schema and exact settled survivor equality confirmed the bounded result. The survivor initially reported CREATING, then returned to ACTIVE through read-only checks; it was not immediately byte-unchanged. The only baseline DMO differences were the expected mapped-flag removals during unmaps. API61 fixtures were provisioned at API68: this is API61 deletion/readback evidence, not API61 creation proof. Neither fixture qualifies populated objects, arbitrary pair types, shared targets, cross-org portability or universal preservation.

### Whole-mapping native DELETE evidence

Native DELETE used `/services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}?dataspace=default`. In one bounded experiment, deleting the last mapping returned HTTP `500`; a non-last mapping returned HTTP `204` with an empty body, followed by two exact mapping GET `404` readbacks while both parent objects remained. Installed API68 acceptance also recorded a non-last DELETE `204`, independent typed `404` absence, an `ACTIVE` byte-equivalent survivor and byte-equivalent parent definitions. These are fixture observations, not current support or a preservation guarantee. They do not establish that CLI, API and Plugin deletion were all experimentally tested.

A later observed non-last native DELETE HTTP `204` removed the selected mapping **and the DMO's `Count__c`/`Gamma__c` fields**. The surviving mapping and both DLOs remained unchanged. This was actual server-side field loss, not merely derived `isMapped` drift or readback uncertainty. The request sends no parent DELETE; that does not prevent server-side effects. It remains a warning against a direct native DELETE; the plugin does not send one and compares the DMO's field names after its deployment.

The comparison depended on the **target DMO's remaining DLO mappings**: adding a second DMO to the same DLO did **not** unlock deletion of the first mapping. A second DLO mapped to the same DMO allowed the observed non-last DELETE, not a guarantee of safe deletion.

Deleting the qualified empty, owned DMO cascaded its mapping and left the DLO intact in a separate bounded observation. This is not permission to delete a business or shared parent as a workaround, and does not establish a plugin cascade feature.

**Not verified:** populated or related objects; non-default data spaces; CLI field removal and formula/filter updates; Number removal through the plugin; API62–67 for create, read, update and delete; inventory completeness; the released package; general cross-org portability.

</details>