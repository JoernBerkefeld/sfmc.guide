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
  update: { status: "yes", methods: [api, plugin] }
  delete: { status: "yes", methods: [cli, api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

This badge does not verify untested writes or general CRUD support.

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
Downloaded dmo:Customer__dlm (retrieved).
Downloaded dmo: 1
```

If that file already exists and differs, the command stops unless you add `--overwrite`.

<details>
<summary>What the saved file leaves out</summary>

The file holds only the authored fields. Salesforce-generated fields are left out: `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`, and the key qualifier, for example `KQ_Id__c`. A key qualifier combines the ID with source context to avoid collisions. The primary key `Id__c` always stays. Custom qualifiers and `keyQualifierName` references stay as read. Native CREATE generates the left-out fields again, and deploy keeps them from the org. Leaving them out is therefore not field deletion or proof of mapping auto-pair behavior. A retrieved file deploys back `unchanged`. The raw API response remains complete. The file is not a complete ingestion/mapping/relationship export.

Current default/`auto` is API68; explicit numeric versions from `61.0` are kept as given. On a standard DMO, the standard fields of a standard DMO are compared only when they are listed. Fields read as `creationType=System` are generated. On the DMO API the key qualifier is marked `creationType=System` and `usageTag=KeyQualifier`, unlike DLO Metadata's `usageTag=KEY_QUALIFIER`.

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

{% include operation-tabs.html id="dmo-read" label="Read" split_api=true cli_state="available" cli_reason="Downloads the object's XML definition and its fields." cli_body=read_cli metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata by exact name. listMetadata does not list DMOs." metadata_body=read_metadata connect_state="available" connect_reason="Tested at API versions 61.0 to 68.0 (see Evidence)." connect_body=read_connect plugin_state="available" plugin_reason="Tested at API version 68.0 (see Evidence)." plugin_body=read_plugin %}

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

**Known failures:**

- A name with a double underscore before `__dlm` is refused.
- An array field type is refused by Salesforce. The plugin reports it as an HTTP error.
{% endcapture %}

{% include operation-tabs.html id="dmo-create" label="Create" split_api=true cli_state="unknown" cli_reason="No verified CLI command creates a DMO." metadata_state="unknown" metadata_reason="Creating a DMO by deploying object XML has not been tested." connect_state="available" connect_reason="Tested for empty custom DMOs at API versions 61.0 to 68.0 (see Evidence)." connect_body=create_connect plugin_state="available" plugin_reason="Tested at API version 68.0 (see Evidence)." plugin_body=create_plugin %}

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

An equal definition returns `outcome: "unchanged"` and `mutation: "not-attempted"`; comparison sends no POST or PATCH. Preservation and unsupported-addition checks still run first.

**Refused before anything is written:**

- Changing a field's data type, or moving the primary key.
- Adding a generated field or a second primary key.
- Leaving out a custom field that exists in the target. Removing it needs `--allow-field-removal`.

<details>
<summary>Removing a field that a mapping uses</summary>

When Salesforce removes a field through the Metadata API, it drops that field's mapping pairs itself. The deploy must therefore also name every mapping that holds a pair for that field. Otherwise the command is refused before any write, with `DMO_FIELD_REMOVAL_MAPPED`.

```sh
sf data360 retrieve -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --overwrite
sf data360 deploy -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --allow-field-removal
```

The DMO deploys first and drops the field with its pairs. Its result lists `removedFields` and `droppedPairs`. The mapping files then find those pairs already gone. With one mapping file this takes about 29 seconds. Deleting the field directly, see the Delete chapter, takes about 28 seconds for a field mapped by two mappings.

If the state does not settle, the command stops with `DMO_FIELD_REMOVAL_SIDE_EFFECT` or `MAPPING_UNMAP_PERSISTENCE_UNCONFIRMED`. Nothing is retried or rolled back.

</details>
{% endcapture %}

{% include operation-tabs.html id="dmo-update" label="Update" split_api=true cli_state="unknown" cli_reason="General DMO XML updates have not been tested." metadata_state="unknown" metadata_reason="Schema changes through the Metadata API have not been tested." connect_state="available" connect_reason="Tested for labels and added fields at API versions 61.0 to 68.0 (see Evidence)." connect_body=update_connect plugin_state="available" plugin_reason="Tested at API version 68.0 on empty custom DMOs (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
This uses a deletion manifest that your integration supplies. This page does not create those files. Use them only on an empty custom DMO that you own.

`destructiveChangesPost.xml` names the one object to delete:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>Customer__dlm</members>
    <name>CustomObject</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --target-org TARGET_ALIAS --test-level NoTestRun --wait 5
```

**Result** (illustrative `componentSuccesses` excerpt of a completed deletion):

```json
{ "status": 0, "result": { "done": true, "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "CustomObject", "fullName": "Customer__dlm", "deleted": true, "success": true }] } } }
```

Check afterwards that the object is gone. The local XML files stay on your computer.
{% endcapture %}

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
Deletes the object and its local file. Check the object name first, and that it is empty and owned by you. The command has no confirmation prompt.

```sh
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS
```

Deletion does not cascade. After a confirmed deletion it removes
the local `data360/dmo/<Name>.dmo-meta.json` file. `--keep-local-files` keeps it.

**Output:**

```text
deleted dmo Customer__dlm
```

The object is gone and its local file is removed. Running the command again reports that the object is already absent.

**Known failures:**

- Standard, namespaced and platform-generated DMOs are refused before anything is deleted.
- The last mapping of a custom DMO cannot be deleted on its own. Deleting the DMO removes its mapping.

<details>
<summary>Delete one custom field instead of the whole object</summary>

Use `--field` to remove named custom fields and keep the object. Without `--confirm-delete` nothing is removed, because mappings change.

```sh
sf data360 delete -m dmo:Customer__dlm --field Note__c -o TARGET_ALIAS --confirm-delete
```

The command sends one Metadata API destructive change. Salesforce drops each field's pairs from every mapping that holds one. If the mapping plan changed since it was read, the command stops with `MAPPING_UNMAP_PLAN_CHANGED`, and nothing is written. The result lists `removedFields` and `unmappedPairs`. For a field mapped by two mappings the command takes about 28 seconds. The primary key and generated fields are refused.

</details>
{% endcapture %}

{% include operation-tabs.html id="dmo-delete" label="Delete" split_api=true cli_state="available" cli_reason="Needs a deletion manifest that your integration supplies." cli_body=delete_cli metadata_state="unknown" metadata_reason="A raw Metadata API delete has not been tested on its own." connect_state="available" connect_reason="Tested on empty, unmapped custom DMOs (see Evidence)." connect_body=delete_connect plugin_state="available" plugin_reason="Tested on empty, unmapped custom DMOs (see Evidence)." plugin_body=delete_plugin %}

<details>
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
- An added field is visible about 28 seconds after the write (API `65.0`). Poll instead of assuming a fixed delay.

**Create rules at API `68.0`:**

- Only `Profile`, `Engagement` and `Other` can be created (POST `201`). The other category values return HTTP `400`.
- `eventDateTimeFieldName` is refused with HTTP `400` as an unrecognized field. An Engagement object is created without it.
- The field data types `Number`, `Text`, `Date`, `DateTime`, `Url`, `Phone`, `Email`, `Percent`, `Boolean` and `Currency` are created. `ArrayOfFloats` and `ArrayOfTexts` return HTTP `400`. A `Currency` field adds `cdp_sys_record_currency__c`.
- Object and field labels longer than 40 characters return HTTP `400`.
- Supplying `keyQualifierName` is refused. The key qualifier `KQ_<key>__c` is generated.
- Keys outside the input schema return HTTP `400`.
- A field `description` is accepted but never returned, so it cannot be confirmed. The object `description` round-trips.

**Update rules at API `68.0`:**

- PATCH sets and clears the object description and changes existing field labels. It adds Number, DateTime and Boolean fields as well as Text.
- A changed field data type returns HTTP `200`, but reads still show the original type and key after 60 seconds of polling.
- A PATCH that leaves out existing fields keeps them. Omission is not removal.
- Field item paths return `404`, and PUT on the object returns `405`. Removing a custom field goes through the Metadata API with a destructive change for the member `<ObjectName>__dlm.<FieldName>__c` (API `65.0` and `68.0`, empty custom DMOs).
- Salesforce removes a mapped field and silently drops exactly that field's pairs. The mappings stay active.

**Plugin behaviour:**

- The plugin keeps no local allowlists. It checks only the shape of the saved file. Category, field data types, labels and descriptions are sent as authored, and Salesforce decides. Its error is reported.
- Default and `auto` select API `68.0`; explicit numeric versions from `61.0` are kept as given, and admitting a version is not a live test of it.
- Refused before any write: `UNSUPPORTED_DMO_FIELD_CHANGE` (a type change or a moved key, or a missing custom field without `--allow-field-removal`), `UNSUPPORTED_DMO_FIELD_ADDITION` (a generated field or a second key), `UNSUPPORTED_DMO_TARGET` (a namespaced or generated name), and `DMO_FIELD_REMOVAL_MAPPED`.
- Preview lists planned removals as `removedFields` and `DMO_FIELD_REMOVAL_PLANNED` and writes nothing.
- After a deploy, reads confirm the result. The plugin never repeats a write. If the reads do not confirm, it fails with `DMO_PERSISTENCE_UNCONFIRMED`.
- If the local file cannot be removed after a deletion, the command fails with `LOCAL_FILE_REMOVAL_FAILED` after the org result.
- Standard DMOs: custom fields can be added, relabelled and removed, and the label and description can change. Standard and system fields cannot change, and the category is ignored. A first mapping onto a standard DMO enables it permanently; the plugin announces this with `MAPPING_ACTIVATES_STANDARD_DMO`.
- This does not broaden standalone DMO CRUD or its tested versions.

**Portability:** Tested at API `68.0`, from the plugin's source tree against two orgs, on empty, unmapped custom DMOs in the default data space: a zero-write repeat, retrieval, an unchanged deploy into the second org with byte-identical retrieved files, and deletion. Files retrieved from a source org and from a second org after an unchanged deploy are byte-identical. An unchanged-source export comparison across API versions is not verified.

**Not verified:** Populated, mapped or related DMOs. Standard DMOs in active use. Non-default data spaces. Relationships. SQL or flex DMOs. An installed released package. The API `68.0` breadth at any other version. Whether `isDynamicLookup` is stored. In addition, cascade behavior and DMOs with dependencies are not verified.

**Existing objects:** A SQL query against an existing DMO can return SQLSTATE `42P01` even when the object exists. That is not an empty result. GET `404` can also mean the caller cannot access the DMO. Neither is proof that no record store exists.

**Official examples:** Salesforce's own Postman examples: [create](https://www.postman.com/salesforce-developers/salesforce-developers/request/lxdbfg4/create-data-model-object) and [update](https://www.postman.com/salesforce-developers/salesforce-developers/request/rschuxv/update-data-model-object).

</details>
