---
layout: page
title: "Data Model Object (DMO)"
description: "Salesforce CLI workflows and verified operation limits for Data Model Object (DMO): CustomObject, __dlm."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-model-object/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "yes", methods: [api, plugin] }
  update: { status: "yes", methods: [cli, api, plugin] }
  delete: { status: "yes", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

This badge does not verify untested writes or general CRUD support. A claim marked **offline-tested** rests on the plugin code and its offline tests; no live run is recorded for it.

<a id="data-model-object-dmo-customobject-dlm"></a>

**Data Model Object (DMO)** is a custom object with the `__dlm` suffix. A DMO is the shape your data is mapped into, such as a customer or an order.

**Example used in every chapter:** `Customer__dlm`, an empty custom DMO with a text key `Id` and a text field `Note`. Each method below works on this same object.

{% include crud-summary.html %}

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every DMO.

"API" means the Metadata API or the Connect API. Each one is listed on its own. The CLI runs on the Metadata API, but that alone does not show that the Metadata API works when called directly.

## Read

{% capture read_cli %}
Downloads the object and its fields as XML files into your project folder.

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --wait 5
```

**Metadata API (XML):** this command uses the Metadata API and saves XML files. It is separate from the native Connect REST JSON route on the Connect API tab.

**Files written** (a real retrieve of the same shape, renamed to our example; system fields are written too):

```text
force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml
force-app/main/default/objects/Customer__dlm/fields/DataSource__c.field-meta.xml
force-app/main/default/objects/Customer__dlm/fields/DataSourceObject__c.field-meta.xml
force-app/main/default/objects/Customer__dlm/fields/Id__c.field-meta.xml
force-app/main/default/objects/Customer__dlm/fields/InternalOrganization__c.field-meta.xml
force-app/main/default/objects/Customer__dlm/fields/KQ_Id__c.field-meta.xml
force-app/main/default/objects/Customer__dlm/fields/Note__c.field-meta.xml
```

**Object file:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Customer</label>
    <mktDataModelAttributes>
        <creationType>Custom</creationType>
        <dataModelTaxonomy>Salesforce_SFDCReferenceModel_0_93</dataModelTaxonomy>
        <dataSpaceName>default</dataSpaceName>
        <isEnabled>false</isEnabled>
        <isSegmentable>false</isSegmentable>
        <isUsedForMetrics>false</isUsedForMetrics>
        <labelOverride>Customer</labelOverride>
        <masterLabel>Customer</masterLabel>
        <objectCategory>Salesforce_SFDCReferenceModel_0_93.Related</objectCategory>
    </mktDataModelAttributes>
</CustomObject>
```

**Id__c:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Id__c</fullName>
    <label>Id</label>
    <length>60</length>
    <mktDataModelFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <isDynamicLookup>false</isDynamicLookup>
        <labelOverride>Id</labelOverride>
        <masterLabel>Id</masterLabel>
        <primaryIndexOrder>1</primaryIndexOrder>
        <usageTag>None</usageTag>
    </mktDataModelFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

**Note__c:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Note__c</fullName>
    <label>Note</label>
    <length>60</length>
    <mktDataModelFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <isDynamicLookup>false</isDynamicLookup>
        <labelOverride>Note</labelOverride>
        <masterLabel>Note</masterLabel>
        <usageTag>None</usageTag>
    </mktDataModelFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```
{% endcapture %}

{% capture read_connect %}
Reads the object over the Connect API. Nothing in the org changes.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method GET
```

**Response (HTTP 200):**

```json
{
  "category": "OTHER",
  "creationType": "Custom",
  "dataSpaceName": "default",
  "fields": [
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source",
      "name": "DataSource__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source Object",
      "name": "DataSourceObject__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "isPrimaryKey": true,
      "keyQualifierName": "KQ_Id",
      "label": "Id",
      "name": "Id__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Internal Organization",
      "name": "InternalOrganization__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Key Qualifier Id",
      "name": "KQ_Id__c",
      "type": "Text",
      "usageTag": "KeyQualifier"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "label": "Note",
      "name": "Note__c",
      "type": "Text",
      "usageTag": "None"
    }
  ],
  "hasExternalDataLakeObjectMappings": false,
  "id": "0gjXXXXXXXXXXXXXXX",
  "isEditable": true,
  "isEnabled": false,
  "isSegmentable": false,
  "label": "Customer",
  "name": "Customer__dlm"
}
```

Keep it for reference. Do not send it back as input, because it contains values that Salesforce generates.

**Known failures:**

- At API version 60.0 this request returns "not found", even for an object that exists.
{% endcapture %}

{% capture read_plugin %}
Saves the object as one JSON file. You can deploy that file to another org later.

```sh
sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS
```

**File written:** `data360/dmo/Customer__dlm.dmo-meta.json`

```json
{
  "schemaVersion": 1,
  "kind": "dmo",
  "identity": {
    "apiName": "Customer__dlm",
    "dataSpace": "default"
  },
  "spec": {
    "label": "Customer",
    "category": "Other",
    "fields": [
      {
        "name": "Id__c",
        "label": "Id",
        "dataType": "Text",
        "isPrimaryKey": true,
        "creationType": "Custom",
        "isDistinct": false,
        "keyQualifierName": "KQ_Id",
        "usageTag": "None"
      },
      {
        "name": "Note__c",
        "label": "Note",
        "dataType": "Text",
        "isPrimaryKey": false,
        "creationType": "Custom",
        "isDistinct": false,
        "usageTag": "None"
      }
    ]
  }
}
```

The keys `creationType`, `isDistinct`, `usageTag` and `keyQualifierName` come from reads only. A retrieved file keeps them, a deploy never sends them, and a file may differ from the org in them without causing an update. `spec.description` is present only when the object has a description.

**Output:**

```text
Downloaded dmo:Customer__dlm (retrieved).
Downloaded dmo: 1
```

If that file already exists and differs, the command stops unless you add `--overwrite` (`-x`). `--output-dir` (`-d`) sets the project root, which defaults to the current directory.

`sf data360 retrieve -m dmo -o SOURCE_ALIAS` saves every DMO of the data space, and `sf data360 retrieve -o SOURCE_ALIAS` without `-m` saves all DLOs, DMOs and mappings. Both are offline-tested. An empty inventory succeeds with no files. Standard, namespaced and platform-generated DMOs can be retrieved.

The optional `--dataspace NAME` (alias `--data-space`) selects a data space other than `default`. A file saved for one data space is never replaced by another space's file, even with `--overwrite`. Non-default data spaces are offline-tested only.

<details markdown="1">
<summary>What the saved file leaves out</summary>

The file holds only the authored fields. Salesforce-generated fields are left out: `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`, and the key qualifier, for example `KQ_Id__c`. A key qualifier combines the ID with source context to avoid collisions. The primary key `Id__c` always stays. Custom qualifiers and `keyQualifierName` references stay as read. Native CREATE generates the left-out fields again, and deploy keeps them from the org. Leaving them out is therefore not field deletion or proof of mapping auto-pair behavior. A retrieved file deploys back `unchanged`. The raw API response remains complete. The file is not a complete ingestion/mapping/relationship export.

Current default/`auto` is API68; explicit numeric versions from `61.0` are kept as given. The standard fields of a standard DMO are compared only when they are listed. Fields read as `creationType=System` are generated. On the DMO API the key qualifier is marked `creationType=System` and `usageTag=KeyQualifier`, unlike DLO Metadata's `usageTag=KEY_QUALIFIER`.

</details>
{% endcapture %}

{% capture read_metadata %}
### Metadata API read of the object

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes. Use the exact object name, including `__dlm`.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>CustomObject</met:type>
      <met:fullNames>Customer__dlm</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds `fullName`, `label`, `mktDataModelAttributes` and the `fields` list. Each field carries `mktDataModelFieldAttributes`; the primary key field has `primaryIndexOrder` set. `listMetadata` with the type `CustomObject` did not return any DMO at API 68.0, so you need to know the name first; the Connect API tab lists them.
{% endcapture %}

{% include operation-tabs.html id="dmo-read" label="Read" split_api=true cli_state="available" cli_reason="Downloads the object's XML definition and its fields." cli_body=read_cli metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata by exact name. listMetadata does not list DMOs." metadata_body=read_metadata connect_state="available" connect_reason="Tested at API versions 61.0 to 68.0 (see Evidence)." connect_body=read_connect plugin_state="available" plugin_reason="Offline-tested; the native routes it uses are observed at API 68.0 (see Evidence)." plugin_body=read_plugin %}

## Create

{% capture create_connect %}
Saves the object definition as `dmo-create.json`, then sends it. Use the name without `__dlm`; Salesforce adds the suffix.

```json
{"name":"Customer","label":"Customer","category":"Other","dataSpaceName":"default","fields":[{"name":"Id","label":"Id","dataType":"Text","isPrimaryKey":true},{"name":"Note","label":"Note","dataType":"Text","isPrimaryKey":false}]}
```

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects --target-org SOURCE_ALIAS --method POST --body @dmo-create.json --header Content-Type:application/json
```

**Response (HTTP 201):**

```json
{
  "category": "OTHER",
  "creationType": "Custom",
  "dataSpaceName": "default",
  "fields": [
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source",
      "name": "DataSource__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source Object",
      "name": "DataSourceObject__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "isPrimaryKey": true,
      "keyQualifierName": "KQ_Id",
      "label": "Id",
      "name": "Id__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Internal Organization",
      "name": "InternalOrganization__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Key Qualifier Id",
      "name": "KQ_Id__c",
      "type": "Text",
      "usageTag": "KeyQualifier"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "label": "Note",
      "name": "Note__c",
      "type": "Text",
      "usageTag": "None"
    }
  ],
  "hasExternalDataLakeObjectMappings": false,
  "id": "0gjXXXXXXXXXXXXXXX",
  "isEditable": true,
  "isEnabled": false,
  "isSegmentable": false,
  "label": "Customer",
  "name": "Customer__dlm"
}
```

Read it again in the Read chapter to confirm that it exists.

**Known failures:**

- Labels longer than 40 characters are refused.
- Names that already end in `__dlm` or `__c` are refused. Send the bare name.
- A DMO needs exactly one primary key. Zero or two are refused.
{% endcapture %}

{% capture create_plugin %}
Creates the object from a JSON file in the same format as the plugin file in the Read chapter. The command first checks that the object does not exist yet.

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS
```

**File you deploy** (`data360/dmo/Customer__dlm.dmo-meta.json`):

```json
{
  "schemaVersion": 1,
  "kind": "dmo",
  "identity": {
    "apiName": "Customer__dlm",
    "dataSpace": "default"
  },
  "spec": {
    "label": "Customer",
    "category": "Other",
    "fields": [
      {
        "name": "Id__c",
        "label": "Id",
        "dataType": "Text",
        "isPrimaryKey": true
      },
      {
        "name": "Note__c",
        "label": "Note",
        "dataType": "Text",
        "isPrimaryKey": false
      }
    ]
  }
}
```

**Output:**

```text
Created: dmo:Customer__dlm.
Deployed: 1 (1 created / 0 updated / 0 failed)
```

Running the same command again prints `Unchanged: dmo:Customer__dlm.` and writes nothing.

Add `--preview` to compare without writing anything:

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --preview
```

The preview reads the target and reports the planned step; it never sends a POST or PATCH. `--dataspace NAME` (alias `--data-space`) selects a non-default data space, which is offline-tested only. The object `description` round-trips, while a field `description` and `isDynamicLookup` are accepted on input and never returned, so the plugin cannot confirm a change to them alone.

**Known failures:**

- A name with a double underscore before `__dlm` is refused.
- An array field type is refused by Salesforce. The plugin reports it as an HTTP error.
{% endcapture %}

{% include operation-tabs.html id="dmo-create" label="Create" split_api=true cli_state="unknown" cli_reason="No verified CLI command creates a DMO." metadata_state="unknown" metadata_reason="Creating a DMO by deploying object XML has not been tested." connect_state="available" connect_reason="Tested for empty custom DMOs at API versions 61.0 to 68.0 (see Evidence)." connect_body=create_connect plugin_state="available" plugin_reason="Offline-tested; the native routes it uses are observed at API 68.0 (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_connect %}
Send one kind of change per request, then read the object again to confirm it.

To change the label, save `{"label":"Customer (updated)"}` as `dmo-update.json`:

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method PATCH --body @dmo-update.json --header Content-Type:application/json
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method GET
```

To add a text field, save this as `dmo-update.json` instead:

```json
{"fields":[{"name":"UpdateNote","label":"Update Note","dataType":"Text"}]}
```

**Response (HTTP 200), showing the state before the change:**

```json
{
  "category": "OTHER",
  "creationType": "Custom",
  "dataSpaceName": "default",
  "fields": [
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source",
      "name": "DataSource__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Data Source Object",
      "name": "DataSourceObject__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "isPrimaryKey": true,
      "keyQualifierName": "KQ_Id",
      "label": "Id",
      "name": "Id__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Internal Organization",
      "name": "InternalOrganization__c",
      "type": "Text",
      "usageTag": "None"
    },
    {
      "creationType": "System",
      "isDistinct": false,
      "label": "Key Qualifier Id",
      "name": "KQ_Id__c",
      "type": "Text",
      "usageTag": "KeyQualifier"
    },
    {
      "creationType": "Custom",
      "isDistinct": false,
      "label": "Note",
      "name": "Note__c",
      "type": "Text",
      "usageTag": "None"
    }
  ],
  "hasExternalDataLakeObjectMappings": false,
  "id": "0gjXXXXXXXXXXXXXXX",
  "isEditable": true,
  "isEnabled": false,
  "isSegmentable": false,
  "label": "Customer",
  "name": "Customer__dlm"
}
```

That reply is not a confirmation (the mutation echo). Use the GET to check the saved result.

**Known failures:**

- Changing the category is refused.
- Changing an existing field's data type returns success, but the type stays the same.
- Removing a field is not possible through this API.
{% endcapture %}

{% capture update_plugin %}
Change the local file, keeping every existing custom field with its type and key settings. Then deploy it. The command writes only what differs.

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS
```

**Output** after a changed label:

```text
Updated: dmo:Customer__dlm.
```

Running the same command again prints `Unchanged: dmo:Customer__dlm.` The change is read back before the command reports success.

An equal definition returns `outcome: "unchanged"` and `mutation: "not-attempted"`; comparison sends no POST or PATCH. Preservation and unsupported-addition checks still run first. `--preview` reports the planned label, description and field changes without writing.

`spec.description` absent means the description is not managed and the target keeps its value. An empty string clears it.

**Refused before anything is written:**

- Changing a field's data type, or moving the primary key.
- Adding a generated field or a second primary key.
- Leaving out a custom field that exists in the target. Removing it needs `--allow-field-removal`.

<details markdown="1">
<summary>Standard DMOs such as ssot__Brand__dlm</summary>

A standard DMO (`creationType` `Standard`) is never created and never deleted by the plugin. A deploy onto an existing one writes only:

- custom fields: add, relabel, and remove with `--allow-field-removal`;
- the object label, sent only when it differs;
- the object description, with the same absent-or-empty rule as above.

The category is ignored. Standard and system fields are never sent and may be left out of the file; one that the file lists and that differs from the org is refused with `UNSUPPORTED_DMO_FIELD_CHANGE`. A new field must be a plain custom field: a name starting with `ssot__` is refused (`UNSUPPORTED_DMO_FIELD_ADDITION`), as Salesforce itself rejects an edit of a standard field with "Data model fields cannot start with ssot__" (raw API, API 68). A platform-generated DMO, or a custom DMO under a namespaced name, is refused with `UNSUPPORTED_DMO_TARGET`. Everything on this standard-DMO list is offline-tested; the raw API behaviour is recorded under Evidence.

</details>

<details markdown="1">
<summary>Removing a field that a mapping uses</summary>

When Salesforce removes a field through the Metadata API, it drops that field's mapping pairs itself. The deploy must therefore also name every mapping that holds a pair for that field. Otherwise the command is refused before any write, with `DMO_FIELD_REMOVAL_MAPPED`.

```sh
sf data360 retrieve -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --overwrite
sf data360 deploy -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --allow-field-removal
```

The DMO deploys first and drops the field with its pairs. Its result lists `removedFields` and `droppedPairs`. The mapping files then find those pairs already gone. Observed at API 68 for a field mapped by two mappings, with both mapping files and the DMO in one command: about 29 seconds. Deleting that field directly, see the Delete chapter, took about 28 seconds. `--preview` lists the planned removals (`DMO_FIELD_REMOVAL_PLANNED`) and writes nothing.

If the state does not settle, the command stops with `DMO_FIELD_REMOVAL_SIDE_EFFECT` or `MAPPING_UNMAP_PERSISTENCE_UNCONFIRMED`. Nothing is retried or rolled back.

</details>
{% endcapture %}

{% capture update_cli %}
Removes one custom field from a custom DMO with a destructive deploy. Salesforce also drops that field's pairs from every mapping that holds one. Other changes to a DMO through the CLI are not verified; use the API or plugin tab for labels and added fields.

In an empty folder named `destructive`, save a `package.xml` that selects nothing:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>68.0</version>
</Package>
```

Save `destructiveChanges.xml` beside it, naming only the field:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>Customer__dlm.Note__c</members>
    <name>CustomField</name>
  </types>
  <version>68.0</version>
</Package>
```

```sh
sf project deploy start --metadata-dir destructive --target-org TARGET_ALIAS --wait 10
```

Sample result excerpt, with `--json` added:

```json
{ "status": 0, "result": { "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "CustomField", "fullName": "Customer__dlm.Note__c", "deleted": true }] } } }
```

Read the DMO and its mappings afterwards: the field and its pairs are gone, everything else is unchanged. Do not remove the primary key or generated fields.
{% endcapture %}

{% include operation-tabs.html id="dmo-update" label="Update" split_api=true cli_state="available" cli_reason="Only removing one custom field is verified, at API 68 on empty custom DMOs." cli_body=update_cli metadata_state="unknown" metadata_reason="Schema changes through the Metadata API have not been tested." connect_state="available" connect_reason="Tested for labels and added fields at API versions 61.0 to 68.0 (see Evidence)." connect_body=update_connect plugin_state="available" plugin_reason="Offline-tested; field removal is observed at API 68.0 on empty custom DMOs (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_connect %}
Deletes the object, then checks that it is gone. Use this only on an empty custom DMO that you own. Check ownership and dependencies first.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method DELETE
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method GET
```

**Response (HTTP 204):** no body.

**Then the GET (HTTP 404):**

```json
[
  {
    "errorCode": "ITEM_NOT_FOUND",
    "message": "No record exists or User might not have access to DMO with Developer name : Customer__dlm"
  }
]
```

The DELETE reply alone is not proof; check with the GET.
{% endcapture %}

{% capture delete_plugin %}
Deletes the object and its local file. Check the object name first, and that it is empty and owned by you. The command has no confirmation prompt and runs no dependency check; Salesforce's answer is reported as it comes.

```sh
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS --preview
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS
```

`--preview` only reads: it checks the target, reports the planned deletion and lists the local file it would remove. The plugin deletes only the DMO. Salesforce removes the DMO's mapping with it; the DLO stays. After a confirmed deletion the plugin removes the local `data360/dmo/<Name>.dmo-meta.json` file. `--keep-local-files` keeps it. `--dataspace NAME` (alias `--data-space`) selects a non-default data space, which is offline-tested only.

**Output:**

```text
deleted dmo Customer__dlm
```

The object is gone and its local file is removed. Running the command again reports that the object is already absent.

**Known failures:**

- Standard, namespaced and platform-generated DMOs are refused before anything is deleted, in the preview as well (`UNSUPPORTED_DMO_TARGET`).
- The last mapping of a custom DMO cannot be deleted on its own. Deleting the DMO removes its mapping.

<details markdown="1">
<summary>Delete one custom field instead of the whole object</summary>

Use `--field` to remove named custom fields and keep the object. Mappings change as well, so check the preview first; the delete takes no confirmation flag.

```sh
sf data360 delete -m dmo:Customer__dlm --field Note__c -o TARGET_ALIAS --preview
sf data360 delete -m dmo:Customer__dlm --field Note__c -o TARGET_ALIAS
```

The command sends one Metadata API destructive change. Salesforce drops each field's pairs from every mapping that holds one. If the mapping plan changed since it was read, the command stops with `MAPPING_UNMAP_PLAN_CHANGED`, and nothing is written. The result lists `removedFields` and `unmappedPairs`. For a field mapped by two mappings the command took about 28 seconds at API 68. The primary key and generated fields are refused.

Add `--preview` to list the planned field removals, the pairs Salesforce drops and the local files; it writes nothing, in the org or on disk. After a successful removal, the existing local `data360/dmo` and `data360/mapping` files under `--output-dir` (default: the current directory) are refreshed from the org. No file is created or deleted, and `--keep-local-files` does not apply to this form. A failed refresh keeps the org result and exits nonzero with `LOCAL_REFRESH_FAILED`. `--field` cannot be combined with another selector, `--changed-since` or `--delete-dlo`.

</details>
{% endcapture %}

{% include operation-tabs.html id="dmo-delete" label="Delete" split_api=true cli_state="unknown" cli_reason="Deleting a whole DMO with a destructive deploy has no verification record and is unproven. Removing one custom field that way is verified; see the Update chapter." metadata_state="unknown" metadata_reason="A raw Metadata API delete has not been tested on its own." connect_state="available" connect_reason="Tested on empty, unmapped custom DMOs (see Evidence)." connect_body=delete_connect plugin_state="available" plugin_reason="Offline-tested for the whole object; field removal is observed at API 68 (see Evidence)." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-model-objects` (and its item routes) belongs to the **Data 360 Connect REST API**, listed in the [Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec). It is not the SOAP-based Metadata API. Salesforce CLI here only sends the authenticated request. This does not expand the tested versions or plugin qualification.

**Responses by version:**

- API `61.0`–`68.0`: POST returns `201`, GET `200`, PATCH `200` and DELETE `204`. API `61.0` is the lowest version observed to work, in one org; it is not a universal minimum or a plugin guard.
- API `60.0` returns HTTP `404` for all four (`NOT_FOUND`, `The requested resource does not exist`), including for a DMO that exists.
- Create and read return the object directly, with a `fields` list. Responses use field `type` where requests use `dataType`.
- Category input `Other` is returned as `OTHER`.
- A PATCH reply shows the pre-update state. A separate GET, not that response, confirms persistence.
- A text key `Id` and one further field `Note` produces six fields, including generated fields such as `Id__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c` and `KQ_Id__c`. Adding one field gives seven.
- A label PATCH changes only the object XML `label`, `labelOverride` and `masterLabel`. A field-adding PATCH adds only the new field's `field-meta.xml` and leaves existing object and field XML byte-identical. Primary-index order `1` and key-qualifier attributes are kept. A field-adding PATCH leaves the entire runtime object and entire Metadata object equal to their state before the PATCH, apart from the new field.
- API `61.0`–`68.0` return DELETE `204`. After DELETE, GET returns `404`, and Metadata retrieval no longer finds the object.
- For a DMO without relationships, the relationship GET returns HTTP `204` (API `67.0`).
- An added field was visible about 28 seconds after the write at API `65.0`. At API `68.0` each PATCH change was visible on the first read after the write. Visibility timing differs by version, so poll instead of assuming a fixed delay.

**Create rules at API `68.0`:**

- Only `Profile`, `Engagement` and `Other` can be created (POST `201`). The other category values return HTTP `400`.
- `eventDateTimeFieldName` is refused with HTTP `400` as an unrecognized field. An Engagement object is created without it.
- The field data types `Number`, `Text`, `Date`, `DateTime`, `Url`, `Phone`, `Email`, `Percent`, `Boolean` and `Currency` are created. `ArrayOfFloats` and `ArrayOfTexts` return HTTP `400`. A `Currency` field adds `cdp_sys_record_currency__c`.
- Object and field labels longer than 40 characters return HTTP `400`.
- Supplying `keyQualifierName` is refused. The key qualifier `KQ_<key>__c` is generated.
- Keys outside the input schema return HTTP `400`.
- A field `description` and `isDynamicLookup` are accepted but never returned, so neither can be confirmed. The object `description` round-trips.

**Update rules at API `68.0`:**

- PATCH sets and clears the object description and changes existing field labels. It adds Number, DateTime and Boolean fields as well as Text.
- A changed field data type returns HTTP `200`, but reads still show the original type and key after 60 seconds of polling.
- A PATCH that leaves out existing fields keeps them. Omission is not removal.
- Field item paths return `404`, and PUT on the object returns `405`. Removing a custom field goes through the Metadata API with a destructive change for the member `<ObjectName>__dlm.<FieldName>__c` (API `65.0` and `68.0`, empty custom DMOs).
- Salesforce removes a mapped field and silently drops exactly that field's pairs. The mappings stay active.

**Plugin behaviour (offline-tested):** the plugin code and its offline tests back everything in this block. The native DMO requests it sends are the raw routes recorded above. DMOs that the plugin deploys inside mapping and relationship batches are recorded at API 68; standalone plugin retrieve, create, update and delete of a DMO have no live record.

- The plugin keeps no local allowlists. It checks only the shape of the saved file. Category, field data types, labels and descriptions are sent as authored, and Salesforce decides. Its error is reported.
- Default and `auto` select API `68.0`; explicit numeric versions from `61.0` are kept as given, and admitting a version is not a live test of it.
- Refused before any write: `UNSUPPORTED_DMO_FIELD_CHANGE` (a type change or a moved key, or a missing custom field without `--allow-field-removal`), `UNSUPPORTED_DMO_FIELD_ADDITION` (a generated field or a second key), `UNSUPPORTED_DMO_TARGET` (a platform-generated, untyped or namespaced DMO, or the deletion of a standard DMO), and `DMO_FIELD_REMOVAL_MAPPED`.
- Preview lists planned removals as `removedFields` and `DMO_FIELD_REMOVAL_PLANNED` and writes nothing.
- After a deploy, polled reads (up to 6, five seconds apart) confirm the result. The plugin never repeats a write. If the reads do not confirm, it fails with `DMO_PERSISTENCE_UNCONFIRMED`.
- If the local file cannot be removed after a deletion, the command fails with `LOCAL_FILE_REMOVAL_FAILED` after the org result.
- Standard DMOs: custom fields can be added, relabelled and removed, and the label and description can change. Standard and system fields cannot change, and the category is ignored. A first mapping onto a standard DMO enables it permanently; the plugin announces this with `MAPPING_ACTIVATES_STANDARD_DMO`.
- This does not broaden standalone DMO CRUD or its tested versions.

**Portability (offline-tested):** a retrieved file deploys into another org as `unchanged` when the target already holds the same definition, and creates the DMO when it does not. An unchanged-source export comparison across API versions is not verified.

**Standard CLI:** `sf org list metadata --metadata-type CustomObject` lists no DMOs, so take the name from a mapping file or the API; `sf project retrieve start --metadata CustomObject:<name>__dlm` then saved the object and its fields at API 68.0. At API 68 a `destructiveChanges.xml` deploy that named one `CustomField` removed that custom field, also when two mappings held it: each mapping lost only that pair, and the DMO and its other fields were unchanged. Deleting a whole DMO with a destructive deploy and creating a DMO from object XML are not recorded and are unproven.

**Not verified:** Populated, mapped or related DMOs. Standard DMOs in active use. Non-default data spaces. SQL or flex DMOs. An installed released package. The API `68.0` breadth at any other version. Cascade behavior and DMOs with dependencies, including a DMO that a segment or calculated insight references. Whether `isDynamicLookup` is stored.

**Existing objects:** A SQL query against an existing DMO can return SQLSTATE `42P01` even when the object exists. That is not an empty result. GET `404` can also mean the caller cannot access the DMO. Neither is proof that no record store exists.

**Official examples:** Salesforce's own Postman examples: [create](https://www.postman.com/salesforce-developers/salesforce-developers/request/lxdbfg4/create-data-model-object) and [update](https://www.postman.com/salesforce-developers/salesforce-developers/request/rschuxv/update-data-model-object).

</details>
