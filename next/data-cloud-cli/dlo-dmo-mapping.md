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
  delete: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "yes" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** (`ObjectSourceTargetMap`) connects fields in a Data Lake Object (DLO), the source, to fields in a Data Model Object (DMO), the target. Both objects must already exist, with matching keys.

**Example used in every chapter:** the mapping `CustomerMapping`, from the DLO `CustomerSource__dll` to the DMO `Customer__dlm`.

{% include crud-summary.html %}

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every mapping. A claim marked **offline-tested** rests on the plugin code and its offline tests; no live run is recorded for it.

## Read

{% capture read_cli %}
Downloads the mapping as an XML file with the Metadata API.

**Metadata API (XML):** this uses `ObjectSourceTargetMap` definitions, not the native Connect REST JSON route.

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0
```

The file is saved as `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the metadata name from your org, not a name guessed from the objects. `sf org list metadata --metadata-type ObjectSourceTargetMap --target-org SOURCE_ALIAS` lists the names.
{% endcapture %}

{% capture read_connect %}
Reads the mapping over the Connect REST API. Nothing in the org changes. Use the server-returned mapping name.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method GET
```

**Response excerpt (HTTP 200)**, limited to the keys this page relies on; the plugin code (offline-tested) defines this shape:

```json
{
  "developerName": "CustomerSource_map_Customer_1794467679481",
  "status": "ACTIVE",
  "sourceEntityDeveloperName": "CustomerSource__dll",
  "targetEntityDeveloperName": "Customer__dlm",
  "fieldMappings": [
    {
      "developerName": "Id__c_fieldmap_Id__c",
      "sourceFieldDeveloperName": "Id__c",
      "targetFieldDeveloperName": "Id__c"
    },
    {
      "developerName": "Note__c_fieldmap_Note__c",
      "sourceFieldDeveloperName": "Note__c",
      "targetFieldDeveloperName": "Note__c"
    }
  ]
}
```

A GET confirms the status, the DLO and DMO bindings and every field pair, including the four pairs Salesforce generates (`KQ_Id__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`). The `developerName` of each pair is the selector that the pair DELETE in the Update chapter needs.

A list of mappings needs `dmoDeveloperName` or `sourceObjectName`. Listing by CRM source object (`sourceObjectName=Contact`) shows the same DLO-to-DMO mappings in another form: the CRM object and its field names, no status, no pair selectors and fewer pairs. The item read by name returns the DLO form shown above.
{% endcapture %}

{% capture read_plugin %}
Saves the mapping as one JSON file. The pairs Salesforce generates are left out of the file.

```sh
sf data360 retrieve -m mapping:CustomerMapping -o SOURCE_ALIAS
```

The file is `data360/mapping/CustomerMapping.mapping-meta.json`. It is a native JSON definition, not an `ObjectSourceTargetMap` XML fallback; the plugin reads mappings through the native API route only:

```json
{
  "schemaVersion": 1,
  "kind": "mapping",
  "identity": {
    "apiName": "CustomerMapping",
    "dataSpace": "default"
  },
  "spec": {
    "sourceEntityDeveloperName": "CustomerSource__dll",
    "targetEntityDeveloperName": "Customer__dlm",
    "fieldMappings": [
      {
        "sourceFieldDeveloperName": "Id__c",
        "targetFieldDeveloperName": "Id__c"
      },
      {
        "sourceFieldDeveloperName": "Note__c",
        "targetFieldDeveloperName": "Note__c"
      }
    ]
  }
}
```

A retrieved file also carries a `developerName` selector on each pair; a hand-written file may leave it out. Retrieve and deploy decide with one rule, from fresh reads of the source DLO and the target DMO, which pairs Salesforce generated. Besides the primary-key pair `KQ_Id__c`, Salesforce generates a `KQ_*` pair for other fields, for example `KQ_RefId__c` onto `KQ_RefId__c` once a relationship starts at `RefId__c`. The file leaves these pairs out, and deploy does not count them as a difference. A mapping that is not from a DLO to a DMO is saved as-is with a warning, and deploy does not send that file. When those reads fail, retrieve refuses with `MAPPING_GENERATED_PAIRS_UNPROVEN` and writes nothing for that mapping.

**Output:**

```text
Downloaded mapping:CustomerMapping (retrieved).
Downloaded mapping: 1
```

If the file already exists and differs, the command stops unless you add `--overwrite` (`-x`). `--output-dir` (`-d`) sets the project root, which defaults to the current directory. The optional `--dataspace NAME` (alias `--data-space`) selects a data space other than `default`; non-default spaces are offline-tested only. The default and `auto` select API `68.0`; numeric pins from `61.0` are kept as given.

`sf data360 retrieve -m mapping -o SOURCE_ALIAS` saves every mapping of the org, and `sf data360 retrieve -o SOURCE_ALIAS` without `-m` saves all DLOs, DMOs and mappings. One retrieve takes any mix of families: bare `-m mapping` or `mapping:Name` selectors can stand beside segments, calculated insights, streams, transforms, graphs or identity resolution, and each family is read in turn.

A bare `-m mapping` reads the per-DMO mapping lists six at a time and takes each mapping from its list entry instead of a separate read; in a live test the list entry equalled the separate read for all 143 mappings of the test org. Each source DLO is read once per run, however many mappings name it. Files, warnings and errors keep the name order. In a live test the bare retrieve of those 143 mappings took 138 s instead of 547 s and wrote byte-identical files.

A listed mapping that is read separately and answers `404` was deleted while the bare retrieve ran: it is skipped with a warning that it was deleted during the retrieve, and the run still succeeds. A mapping selected exactly as `mapping:<Name>` that is gone still fails with `MAPPING_HTTP_ERROR`.
{% endcapture %}

{% capture read_metadata %}
### Metadata API read of the mapping

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes. Use the metadata member name from `listMetadata`, not a name guessed from the objects.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>ObjectSourceTargetMap</met:type>
      <met:fullNames>CustomerMapping</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds `fullName`, `creationType` and a `fieldSourceTargetMaps` list. Each entry pairs a `sourceField` such as `CustomerSource__dll.Id__c` with a `targetField` such as `Customer__dlm.Id__c`. `listMetadata` with the type `ObjectSourceTargetMap` returns the full names in the org.
{% endcapture %}

{% include operation-tabs.html id="mapping-read" label="Read" cli_state="available" cli_reason="Retrieves the mapping XML using its actual metadata member name." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata and listMetadata, using the metadata member name." metadata_body=read_metadata connect_state="available" connect_reason="Reads the mapping over the native Connect REST route." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves one mapping by exact name, or all mappings with -m mapping." plugin_body=read_plugin %}

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

Include the pair that joins the two primary keys. Leave out the pairs Salesforce generates (`KQ_Id__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`) and any selectors from another org. Salesforce returns HTTP `201` and names the mapping itself. A GET afterwards, shaped as in the Read chapter, shows the mapping `ACTIVE` with the server-generated name, your pairs and the generated pairs.

Salesforce accepts a Number pair and a pair between differently named fields, for example `Note__c` onto `Other__c`.

**Known failures:**

- A mapping without a pair joining the two primary keys is refused with HTTP `400` `MISSING_ARGUMENT`: "Unable to find Primary Key of DLO in POST request of Mapping Creation".
- Salesforce creates mappings only from a DLO to a DMO. A DMO or a CRM object as the source is refused ("Need api name of DLO").
{% endcapture %}

{% capture create_plugin %}
Creates the mapping from the project file, `data360/mapping/CustomerMapping.mapping-meta.json`, in the shape shown in the Read chapter. A hand-written file lists the authored pairs only and may use any name; Salesforce names the mapping it creates. Preview first.

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

`--preview` reads the target and reports the planned step; it never writes. Execution ends with a `Deployed: n (x created / y updated / z failed)` line. The output format is offline-tested.

```text
Created: mapping:CustomerMapping.
Deployed: 1 (1 created / 0 updated / 0 failed)
```

The plugin sends the authored pairs as the file lists them and applies no local rule on field types or names; Salesforce decides. It refuses a pair that names a missing field (`MAPPING_FIELD_NOT_FOUND`), and a preview of a pair between different data types adds the non-blocking note `MAPPING_FIELD_TYPES_DIFFER`. The file needs the pair that joins the two primary keys: Salesforce rejects a new mapping without it with HTTP `400`, reported as `MAPPING_HTTP_ERROR`.

Selectors are exact `mapping:Name`; bare types and wildcards are refused. One command may also create the parents: with `-m dlo:CustomerSource__dll -m dmo:Customer__dlm -m mapping:CustomerMapping` the plugin deploys the DLO, then the DMO, then the mapping, whatever the selector order, and settles each parent before the next write. A preview whose parents are only planned reports `planned-dependencies` (`MAPPING_DEPENDENCIES_PLANNED`) for the mapping. `--dataspace NAME` (alias `--data-space`) selects a non-default data space, which is offline-tested only.

**Standard DMO as target.** A mapping may target a standard DMO such as `ssot__Brand__dlm`. The authored pairs may name standard and custom fields, for example `Id__c` onto `ssot__Id__c` and `Name__c` onto `ssot__Name__c`. Salesforce then adds four generated pairs: `DataSource__c` onto `ssot__DataSourceId__c`, `DataSourceObject__c` onto `ssot__DataSourceObjectId__c`, `InternalOrganization__c` onto `ssot__InternalOrganizationId__c` and `KQ_Id__c` onto `KQ_Id__c`. The first mapping onto a never-mapped standard DMO activates it permanently (enabled, category `OTHER`, generated `KQ_Id__c`), and deleting the mapping does not undo that; the plugin announces it with `MAPPING_ACTIVATES_STANDARD_DMO`. A platform-generated DMO, or a custom DMO under a namespaced name, is refused (`MAPPING_TARGET_UNSUPPORTED`).
{% endcapture %}

{% capture create_metadata %}
### Metadata API create of the mapping

Send `createMetadata` to the Metadata SOAP endpoint, with the same URL and headers as the Read tab. The metadata name is yours, and it is also the name the Connect API uses.

```xml
<met:createMetadata>
  <met:metadata xsi:type="met:ObjectSourceTargetMap" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerMapping</met:fullName>
    <met:creationType>Custom</met:creationType>
    <met:masterLabel>Customer Mapping</met:masterLabel>
    <met:sourceObjectName>CustomerSource__dll</met:sourceObjectName>
    <met:targetObjectName>Customer__dlm</met:targetObjectName>
    <met:fieldSourceTargetMaps>
      <met:creationType>Custom</met:creationType>
      <met:filterApplied>false</met:filterApplied>
      <met:filterOperationType>Equal</met:filterOperationType>
      <met:isSourceFormula>false</met:isSourceFormula>
      <met:sourceField>CustomerSource__dll.Id__c</met:sourceField>
      <met:targetField>Customer__dlm.Id__c</met:targetField>
    </met:fieldSourceTargetMaps>
    <!-- One fieldSourceTargetMaps entry per authored pair. -->
  </met:metadata>
</met:createMetadata>
```

The answer is `success` `true`. The Connect GET by the same name then shows the mapping `ACTIVE` with the authored pairs plus `KQ_Id__c` onto `KQ_Id__c`. `readMetadata` returns the authored pairs only.

**Known failures:**

- A source DLO that exists only as a definition (created by deploy or `createMetadata`, see [Data Lake Object](/next/data-cloud-cli/data-lake-object/)) is refused with `UNKNOWN_EXCEPTION`, "An unexpected error occurred". The Connect API refuses it too.
{% endcapture %}

{% include operation-tabs.html id="mapping-create" label="Create" cli_state="available" cli_reason="Creates a mapping between existing custom objects with a complete XML file." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with createMetadata between a Connect-created DLO and DMO. The mapping reads ACTIVE under the authored name." metadata_body=create_metadata connect_state="available" connect_reason="Creates the mapping with one native request, confirmed by a read." connect_body=create_connect plugin_state="available" plugin_reason="Creates the mapping from a project file, confirmed by a read. Observed at API 68.0 (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_cli %}
Changes the label and adds field pairs. Edit `masterLabel` in the complete retrieved file, or add a `fieldSourceTargetMaps` entry in the shape of the Create chapter, and leave the object references alone.

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun
```

The output reports `Changed` for the edited file. Sending the same file again reports `Unchanged`. These are separate invocations. Read the mapping through the Connect API afterwards: an added pair is listed next to the existing ones.

**Known failures:**

- A pair left out of the file is not removed. The deploy reports `Changed`, and the pair stays. To remove a pair, use the Connect API pair DELETE or the plugin.
- A pair whose target field you change is added as a new pair; the old pair stays. Retargeting therefore needs the old pair removed on another route.
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

A single pair is removed with a DELETE on the pair's selector, taken from the `developerName` of that pair in a GET. Salesforce answers HTTP `204`:

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME/field-mappings/Beta__c_fieldmap_Beta__c --target-org TARGET_ALIAS --method DELETE
```

Pair add and pair DELETE also work with `v64.0` in the path. A Number source can be mapped onto a Text target, and a source that already has a target can get a second one; the second pair is added next to the first, it does not replace it.

**Known failures:**

- Salesforce does not delete the primary-key pair or the generated pairs (`KQ_Id__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`). Removing every ordinary pair leaves these five.
- A PATCH whose body names another source DLO or another target DMO than the mapping's own is refused with HTTP `404` `NOT_FOUND` ("Mis-match between Input request & Map … Is Valid Interface: false"). Nothing changes. Create a new mapping instead.
{% endcapture %}

{% capture update_metadata %}
### Metadata API update of the mapping

Read the mapping with `readMetadata` (Read tab), change the record, then send the whole record with `updateMetadata` to the same endpoint and headers.

```xml
<met:updateMetadata>
  <met:metadata xsi:type="met:ObjectSourceTargetMap" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerMapping</met:fullName>
    <met:creationType>Custom</met:creationType>
    <met:masterLabel>Customer Mapping Updated</met:masterLabel>
    <met:sourceObjectName>CustomerSource__dll</met:sourceObjectName>
    <met:targetObjectName>Customer__dlm</met:targetObjectName>
    <!-- Every pair from readMetadata, plus the pairs to add. -->
  </met:metadata>
</met:updateMetadata>
```

The answer is `success` `true`. A new label reads back through `readMetadata`, and an added pair is listed by the Connect GET next to the existing ones.

**Known failures:**

- A pair left out of the record is not removed, although the answer is `success` `true`.
- A pair with a changed target field is added as a new pair; the old pair stays.
{% endcapture %}

{% capture update_plugin %}
Deploys the field pairs in the JSON file. New pairs are added. Authored pairs left out of `fieldMappings` are removed. Keep the primary-key pair in the file. Preview first.

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

The file is the desired set of authored pairs. For example, to drop `Note__c` and add `Beta__c`, edit `spec.fieldMappings` to:

```json
[
  { "sourceFieldDeveloperName": "Id__c", "targetFieldDeveloperName": "Id__c" },
  { "sourceFieldDeveloperName": "Beta__c", "targetFieldDeveloperName": "Beta__c" }
]
```

Execution removes the omitted pairs one at a time, each with one DELETE on a freshly read selector, then adds all new pairs with one names-only PATCH. A preview lists the removals before the additions and writes nothing. The output names the changed pairs and ends with the `Deployed:` count (offline-tested format):

```text
Updated: mapping:CustomerMapping.
Deleted field mappings: Note__c -> Note__c
Added field mappings: Beta__c -> Beta__c
Deployed: 1 (0 created / 1 updated / 0 failed)
```

To retarget a pair, replace it in the file with the new pair; the old connection goes first, then the new one is added. The mapping's DLO and DMO never change. Any authored pair may be omitted, whatever its field names, data types or target (custom or standard field); Salesforce decides whether the removal is accepted. The generated pairs may be listed or left out, and are never removed. A file that drops the primary-key pair is refused with `MAPPING_PROTECTED_PAIR_REQUIRED`, and a pair whose layout the plugin cannot prove is refused with `MAPPING_PROTECTED_LAYOUT_UNPROVEN`, both before any write. There is no write retry and no rollback; a failure after a write is reported as failed with an unknown mutation, and a mixed batch stops there.

Reconciliation runs from API `61.0`; the default and `auto` select `68.0`. An unchanged file reports `unchanged` and sends nothing.
{% endcapture %}

Mapping updates are limited to the field pairs and the label; the source and target objects of an existing mapping are not changed.
{: .mapping-shared-restriction }
{% include operation-tabs.html id="mapping-update" label="Update" cli_state="available" cli_reason="Partial: changes the label and adds pairs, tested at API 68.0. A pair left out of the file is not removed, so retargeting does not work." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="Partial: updateMetadata changes the label and adds pairs, tested at API 68.0. A pair left out is not removed." metadata_body=update_metadata connect_state="available" connect_reason="Adds pairs with one PATCH and removes a pair with a DELETE, tested at API 64.0 and 68.0. Replacement is not supported." connect_body=update_connect plugin_state="available" plugin_reason="Adds, removes and retargets pairs from a JSON file, observed at API 61.0, 64.0 and 68.0. Not a general guarantee." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
Deletes the whole mapping with one destructive deploy. Neither object is deleted. Salesforce does not delete the last mapping of a custom DMO; delete that DMO instead.

Get the mapping's metadata name with `sf org list metadata --metadata-type ObjectSourceTargetMap --target-org SOURCE_ALIAS`. In an empty folder named `destructive`, save a `package.xml` that selects nothing:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>68.0</version>
</Package>
```

Save `destructiveChanges.xml` beside it, naming only the mapping:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerMapping</members>
    <name>ObjectSourceTargetMap</name>
  </types>
  <version>68.0</version>
</Package>
```

```sh
sf project deploy start --metadata-dir destructive --target-org SOURCE_ALIAS --wait 10
sf org list metadata --metadata-type ObjectSourceTargetMap --target-org SOURCE_ALIAS
```

The deploy must report success. The list must no longer show `CustomerMapping`. Check that the DMO's other mappings and fields are unchanged. This also deletes the only mapping of a standard DMO and a mapping that holds pairs onto standard fields.

**Known failures:**

- The last mapping of a custom DMO fails with an internal error. A repeat or a dry run fails the same way.
{% endcapture %}

{% capture delete_connect %}
Deletes one mapping with a native DELETE. Salesforce does not delete the last mapping of a custom DMO.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method DELETE
```

The response has no body (HTTP `204`). A GET afterwards should return `404`.

**Known failures:**

- Deleting the last mapping of a custom DMO fails with HTTP `500`.
- An unrecorded experiment once saw a native DELETE of a non-last mapping also remove DMO fields. A recorded retest at API 68 did not reproduce it: the DMO's field names and its other mapping, with every pair selector, stayed unchanged. Read the DMO and its other mappings afterwards anyway.
{% endcapture %}

{% capture delete_metadata %}
### Metadata API delete of the mapping

Send `deleteMetadata` to the same endpoint and headers as the Read tab, with the metadata member name from `listMetadata`. Neither object is deleted.

```xml
<met:deleteMetadata>
  <met:type>ObjectSourceTargetMap</met:type>
  <met:fullNames>CustomerMapping</met:fullNames>
</met:deleteMetadata>
```

The answer is `success` `true`. Afterwards the Connect GET of the mapping answers `404` `NOT_FOUND`, and the DMO's field names and its other mappings are unchanged.

**Known failures:**

- The last mapping of a custom DMO is refused with `UNKNOWN_EXCEPTION`, "An unexpected error occurred"; the mapping stays. Delete the DMO instead.
{% endcapture %}

{% capture delete_plugin %}
Deletes the whole mapping with one Metadata API deployment. It does not delete either parent object. Preview first.

```sh
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

There is no confirmation prompt or extra execution flag. The second command changes the org immediately.

When `data360/mapping/CustomerMapping.mapping-meta.json` is a valid mapping file, `CustomerMapping` is the authored name: the plugin finds the org mapping the way deploy does, by the file's source DLO and target DMO, whatever name Salesforce gave it, and reports the org name as `targetApiName`. No org mapping with that binding reports `unchanged`; two or more are refused with `AMBIGUOUS_MAPPING_TARGET` before any write. Without such a file, the name is the exact org name. A mapping whose read answers HTTP 404 is already gone and reports `unchanged`, so a repeated delete changes nothing.

`--preview` reads the mapping, the DMO's other mappings and the DMO, applies the same refusal, and lists the local file it would remove; it writes nothing. After a confirmed deletion the plugin removes the local mapping file, `data360/mapping/<Name>.mapping-meta.json` or the hand-written file whose DLO and DMO match, and lists it in `removedLocalFiles`. `--keep-local-files` keeps it. The output format is offline-tested:

```text
deleted mapping CustomerMapping
```

**Known failures:**

- The last mapping of a custom DMO is refused before any write. Delete the DMO instead, with `sf data360 delete --metadata dmo:Customer__dlm -o TARGET_ALIAS`; Salesforce removes the mapping with it.
- Delete by the authored name uses deploy's lookup, so a mapping that is not `ACTIVE` is refused with `MAPPING_TARGET_NOT_SETTLED`; the exact org name still works.
{% endcapture %}

Mapping deletion is limited: Salesforce does not delete the last mapping of a custom DMO.
{: .mapping-shared-restriction }
{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="available" cli_reason="Partial. One destructive deploy, tested at API 68 on empty objects. The last mapping of a custom DMO fails." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="Partial. deleteMetadata deletes a non-last mapping, tested at API 68.0 on empty objects. The last mapping of a custom DMO is refused." metadata_body=delete_metadata connect_state="available" connect_reason="Partial. Deletes one non-last mapping on bounded empty fixtures." connect_body=delete_connect plugin_state="available" plugin_reason="Observed on empty objects at API 68.0. The last mapping of a custom DMO is refused before any write, because Salesforce does not delete it." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-model-object-mappings` (including its item and field-mapping routes) belongs to the **Data 360 Connect REST API**, not the SOAP-based Metadata API. Salesforce lists mapping routes separately in the [Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) and shows the full versioned URL in its [mapping use case](https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.md). The plugin sends these requests over one in-process connection with the Salesforce CLI's stored authentication; removing a whole mapping still runs one Metadata API destructive deploy through the CLI. The `sf project` XML examples in the CLI sections instead use Metadata API with `ObjectSourceTargetMap`. This attribution alone does not qualify a native mapping workflow, alter the existing API-tab ratings or establish CRUD support at an untested version.

### Observed at API 68 unless noted

Empty synthetic fixtures in the default data space. Each result was confirmed by an independent read.

- **Create:** a native POST accepts a Number pair and a pair between differently named fields (`Note__c` onto `Other__c`); the mapping reads `ACTIVE` with the authored pairs plus the four generated pairs. The plugin creates a mapping with a Number pair, a renamed pair and one source onto two targets of different types, and a retrieved file with those pairs redeploys `unchanged` with no write. A create without a primary-key pair is rejected with HTTP `400` `MISSING_ARGUMENT`.
- **Standard DMO target:** the first mapping onto a never-mapped standard DMO is created, Salesforce adds four generated pairs (three onto `ssot__*Id__c` fields and `KQ_Id__c`), and the DMO is enabled permanently: category `UNASSIGNED` becomes `OTHER`, `KQ_Id__c` is generated and `keyQualifierName` is set on the standard primary key. Deleting the mapping does not undo it.
- **Update:** a native PATCH adds a Number source onto a Text target and a source that is already mapped to another target. Pair add (PATCH `200`) and pair DELETE (`204`) work at API 64. The plugin removes an authored pair through desired-state deployment at API 61 and at API 64, leaving the other pairs unchanged. A pair onto a standard field of a standard DMO (`Name__c` onto `ssot__Name__c`) is removed with one DELETE on the observed selector; the generated pairs and the key pair stay.
- **Generated key-qualifier pairs:** after a relationship from the non-key field `RefId__c` of one custom DMO to another, Salesforce held the pair `KQ_RefId__c` onto `KQ_RefId__c` in the mapping, although `RefId__c` is no key. Through the plugin a hand-written mapping file without that pair redeployed `unchanged`, a retrieve left the pair out, and the retrieved file redeployed `unchanged`. On a standard DMO the names differ: a relationship from the non-key `ssot__Name__c` of `ssot__Brand__dlm` made Salesforce add the DMO field `KQ_Name__c` and the pair `KQ_RefId__c` onto `KQ_Name__c`. The plugin treats such a pair as generated when the mapping also maps `RefId__c` onto `ssot__Name__c`, so a hand-written file can leave it out.
- **Field removal:** removing a custom DMO field that two mappings both map, with one Metadata API `CustomField` destructive deployment, drops exactly that field's pair from each mapping. Every other pair keeps its selector and both mappings stay `ACTIVE`.
- **Delete:** a Metadata API `ObjectSourceTargetMap` destructive deployment deletes a whole mapping without touching DMO fields or other mappings. This holds for a non-last mapping of a custom DMO, for the only mapping of a standard DMO and for a mapping that holds pairs onto standard fields. Salesforce does not delete the last mapping of a custom DMO ([Salesforce Help](https://help.salesforce.com/s/articleView?id=001993463&language=en_US&type=1)). For the last mapping of a custom DMO the deployment fails with an internal error, also on a dry run and on a repeat, and a native DELETE returns HTTP `500`. Deleting the DMO removes that mapping. Through the plugin the non-last mapping took 48 seconds, and the only mapping of the standard DMO 25 and 28 seconds. The plugin also deleted a mapping by its authored name, reported a repeated delete `unchanged`, and deleted a mapping, its DMO and two DLOs in one run, with the mapping read back as `404` after the DMO's DELETE.
- **DLO dependency:** the dependency list of a mapped DLO names the mapped DMO (`DataModelObject`), not the mapping. Deleting a DLO that a mapping depends on is refused by Salesforce with HTTP `412` `DEPENDENCY_EXISTS` and changes nothing; the plugin deletes a DLO and its mapping in one command, mapping first.

### Plugin behaviour (offline-tested)

The plugin code and its offline tests back everything in this block unless an observation above says otherwise.

- **Selection:** `mapping:Name` selectors, or one local file with `--source-dir ./project/data360/mapping/CustomerMapping.mapping-meta.json` **instead of** `-m`; do not combine both selection modes. `-m mapping` retrieves every mapping. Deploy and delete accept only exact `type:ApiName` selectors.
- **Versions:** the default and `auto` select API `68.0`. Numeric pins from `61.0` are admitted for retrieve, deploy, pair reconciliation and whole-mapping deletion. Admission is not a live test of each version.
- **Identity:** saved mapping names and selectors are not target identity. Deploy resolves a unique target mapping by its DLO and DMO bindings and uses the target's server-generated name and selectors. An existing identical mapping is a zero-write repeat.
- **Pairs:** the file is the desired set of authored pairs. Omitted pairs are unmapped individually from freshly read selectors, then additions are sent in one selector-free PATCH. Generated pairs come from the org's copy and are never sent or removed. On a custom DMO a same-name `KQ_*` pair counts as generated whenever a target field names that key qualifier in its `keyQualifierName`, not only for the primary key; on a standard DMO the rule still needs the source primary key. A pair onto a field that another mapping of the DMO also targets is removed like any other, and the field stays mapped until the last such pair is gone.
- **Output:** each component prints one action line with its type and API name; `Deleted field mappings:` and `Added field mappings:` lines list the changed pairs of a confirmed update. Preview lines start with `Planned`. The `Deployed:` total counts confirmed creations and updates only, not unchanged, blocked or unattempted items. Retrieval prints `Downloaded mapping: n` for the successful names.
- **`--dataspace`:** requests carry the `dataspace` query only when the flag is given. Requested scope, saved identity and fresh parent identities must agree before a write.
- **Delete:** one Metadata API destructive deployment, type `ObjectSourceTargetMap`, member the mapping developer name. It does not unmap pairs first and sends no native DELETE. Before the write the plugin reads the mapping, all mappings of the target DMO and the DMO; if the mapping is the **last mapping of a custom DMO** it stops with `MAPPING_LAST_MAPPING_DELETE_BLOCKED` and names the command that deletes the DMO. Being the last mapping of a DLO is no obstacle, and the last mapping of a **standard** DMO is deleted normally; the DMO stays enabled with its generated `KQ_Id__c` field and no mapped fields. After the write the plugin polls (up to 6 reads, 5 seconds apart) until the mapping reads `404`, then requires that the DMO's other mappings (pairs and selectors) and the DMO's field names are exactly what they were. There is no rollback and no parent deletion. A mapping selected beside its DMO, which Salesforce removes with the DMO, is read again and reported deleted only when its read answers `404`, otherwise `deletion-unconfirmed`.

| Diagnostic | Meaning |
|---|---|
| `MAPPING_LAST_MAPPING_DELETE_BLOCKED` | Last mapping of a custom DMO. Nothing is written. Delete the DMO instead. |
| `MAPPING_DELETE_FAILED` | Salesforce did not confirm the deployment. The message carries Salesforce's problem text. The deployment is never retried. |
| `MAPPING_DELETION_UNCONFIRMED` | The deployment was confirmed, but the mapping was still readable after the last poll. |
| `MAPPING_DELETE_SIDE_EFFECT` | The mapping is gone, but another mapping of the DMO or the DMO's field names changed. |

After a confirmed deletion the local mapping file is removed unless `--keep-local-files` is set; a failed removal keeps the org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`.

### CLI, Metadata API and native retests at API 68.0

On `Cli…` probes in one org: DLOs and DMOs created through the Connect API, empty, in the default data space, sf 2.151.7. Every probe was deleted afterwards and confirmed gone through the Connect API and `readMetadata`/`listMetadata`.

- **Metadata API create:** `createMetadata` of an `ObjectSourceTargetMap` with three authored pairs (one onto a differently named field) returned `success` `true`. The Connect GET by the authored name showed the mapping `ACTIVE` with the three pairs plus `KQ_Id__c` onto `KQ_Id__c`. `readMetadata` returned the three pairs. From a DLO that exists only as a definition (created by deploy) the same call failed with `UNKNOWN_EXCEPTION`, and the Connect POST with `ITEM_NOT_FOUND` ("DLO not found").
- **Metadata API update:** `updateMetadata` of the whole record changed the label (read back through `readMetadata`) and added a pair (listed by the Connect GET). A record without one of the pairs, and a record with one pair's target field changed, both returned `success` `true`: the omitted pair stayed, and the changed pair was added beside the old one.
- **CLI update:** a deploy of the retrieved file of a Connect-created mapping without one pair reported `Changed`, and the pair stayed. A deploy that added a pair reported `Changed`, and the Connect GET listed the new pair beside the existing ones.
- **Metadata API delete:** `deleteMetadata` of a non-last mapping returned `success` `true`; the Connect GET answered `404` `NOT_FOUND`, and the DMO's field names and its other mapping were unchanged. On the last mapping of a custom DMO it returned `UNKNOWN_EXCEPTION`, and the mapping still read.
- **Native PATCH with other objects:** a field-mapping PATCH whose body named another source DLO, or another target DMO, than a non-last mapping's own answered HTTP `404` `NOT_FOUND` ("Mis-match between Input request & Map … Is Valid Interface: false"), and the pair count was unchanged.
- **Native DELETE of a non-last mapping:** HTTP `204`, then `404` on the GET. The DMO's field names and its other mapping, with every pair selector, were unchanged. An unrecorded earlier report of DMO fields removed this way was not reproduced.
- **Unlocking the last mapping:** the native DELETE of a custom DMO's only mapping answered HTTP `500` `INTERNAL_ERROR` ("… DMO is mapped to only one DLO … So cannot be removed"). It did so again after the same DLO was mapped to a second DMO. After a second DLO was mapped to the same DMO, one ordinary pair DELETE (`204`) and then the mapping DELETE (`204`, then `404` on the GET) succeeded. The DMO's field names, the other DLO's mapping and the first DLO's fields were unchanged. The earlier report of the same at API 61 remains unrecorded.

**Not verified:** populated or related objects; non-default data spaces; inventory retrieval (`-m mapping`) against a live org; formula and filter updates; whole-mapping deletion through the plugin below API 68; API 62 to 67 for create, read, update and delete; the released package; general cross-org portability.

</details>
