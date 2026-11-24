---
layout: page
title: "Data Lake Object (DLO)"
description: "Salesforce CLI workflows and verified operation limits for Data Lake Object (DLO): CustomObject, __dll."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/data-lake-object/
redirect_from:
  - /next/data-cloud-cli/data-lake-object/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "yes", plugin: "yes" } }
  update: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  delete: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "yes", plugin: "yes" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

This badge does not verify untested writes or general CRUD support.

<a id="data-lake-object-dlo-customobject-dll"></a>

**Data Lake Object (DLO)** is a custom object with the `__dll` suffix. It holds data from a source before that data is mapped into the data model. It uses `__dll`, not `__dlm`.

**Example used in every chapter:** `CustomerSource__dll`, an empty custom DLO with a text key `Id` and a text field `Note`.

{% include crud-summary.html %}

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every DLO. The plugin selects a DLO with `-m dlo:Name__dll`. It needs no `--source-dir`, and its commands accept an optional `--dataspace NAME` (alias `--data-space`); a non-default data space is offline-tested only.

**Enum letter case:** An enum value in `category` or a field's `dataType` that differs from Salesforce's stored spelling only in letter case counts as unchanged on deploy. The plugin sends the value as written; retrieve writes Salesforce's spelling.

## Read

{% capture read_cli %}
Downloads the object and its fields as XML files into your project folder.

```sh
sf project retrieve start --metadata CustomObject:CustomerSource__dll --target-org SOURCE_ALIAS --api-version 68.0 --wait 5
```

**Metadata API (XML):** this command uses the Metadata API and saves XML files. It is separate from the native Connect REST JSON route on the Connect API tab.

Saved files, from a test fixture named `McpMappingProbe_20261027__dll` (not the example object):

```text
force-app/main/default/objects/McpMappingProbe_20261027__dll/
  McpMappingProbe_20261027__dll.object-meta.xml
  fields/
    cdp_sys_SourceVersion__c.field-meta.xml
    DataSource__c.field-meta.xml
    DataSourceObject__c.field-meta.xml
    Id__c.field-meta.xml
    InternalOrganization__c.field-meta.xml
    KQ_Id__c.field-meta.xml
    Name__c.field-meta.xml
    Note__c.field-meta.xml
```

<details markdown="1">
<summary>McpMappingProbe_20261027__dll.object-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>MCP Mapping Probe 20261027</label>
    <mktDataLakeAttributes>
        <creationType>Custom</creationType>
        <isEnabled>true</isEnabled>
        <objectCategory>Salesforce_SFDCReferenceModel_0_93.Related</objectCategory>
    </mktDataLakeAttributes>
</CustomObject>
```

</details>

<details markdown="1">
<summary>fields/cdp_sys_SourceVersion__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>cdp_sys_SourceVersion__c</fullName>
    <label>cdp_sys_SourceVersion</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>System</definitionCreationType>
        <externalName>cdp_sys_SourceVersion</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/DataSource__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>DataSource__c</fullName>
    <label>Data Source</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>System</definitionCreationType>
        <externalName>DataSource</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/DataSourceObject__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>DataSourceObject__c</fullName>
    <label>Data Source Object</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>System</definitionCreationType>
        <externalName>DataSourceObject</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/Id__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Id__c</fullName>
    <label>Id</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <externalName>Id</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <primaryIndexOrder>1</primaryIndexOrder>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/InternalOrganization__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>InternalOrganization__c</fullName>
    <label>Internal Organization</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>System</definitionCreationType>
        <externalName>InternalOrganization</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/KQ_Id__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>KQ_Id__c</fullName>
    <label>KQ_Id</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>System</definitionCreationType>
        <externalName>KQ_Id</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>KEY_QUALIFIER</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/Name__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Name__c</fullName>
    <label>Name</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <externalName>Name</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>

<details markdown="1">
<summary>fields/Note__c.field-meta.xml</summary>

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Note__c</fullName>
    <label>Note</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <externalName>Note</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

</details>
{% endcapture %}

{% capture read_connect %}
Reads the object by its developer name over the Connect API. Nothing in the org changes.

```sh
sf api request rest /services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll --target-org SOURCE_ALIAS --method GET --include
```

The reply is HTTP 200. Its body holds a `dataLakeObjects` array with one entry, even for an exact-name read. This excerpt shows the shape for an owned, active standalone object (other keys omitted):

```json
{
  "dataLakeObjects": [
    {
      "name": "CustomerSource__dll",
      "label": "CustomerSource",
      "category": "Other",
      "status": "ACTIVE",
      "dataSpaceInfo": [{ "name": "default" }],
      "fields": [
        { "name": "Id__c", "dataType": "Text", "isPrimaryKey": true },
        { "name": "Note__c", "dataType": "Text", "isPrimaryKey": false }
      ]
    }
  ]
}
```

The real response lists seven fields: the two authored fields and five that Salesforce generates (see Create). It also carries the record ID that the update and delete requests address the object by. The dependency list of an object is a separate read:

```sh
sf api request rest /services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll/dependencies --target-org SOURCE_ALIAS
```

It answers `{ "dependencies": [], "totalSize": 0 }` for an object nothing uses. A mapped object lists the mapped DMO, with `componentType` `DataModelObject`; the mapping itself is not listed.
{% endcapture %}

{% capture read_plugin %}
Saves the object as one JSON file with its authored fields. You can deploy that file to another org later.

```sh
sf data360 retrieve -m dlo:CustomerSource__dll -o SOURCE_ALIAS
```

**File written:** `data360/dlo/CustomerSource__dll.dlo-meta.json`

```json
{
  "schemaVersion": 1,
  "kind": "dlo",
  "identity": { "apiName": "CustomerSource__dll", "dataSpace": "default" },
  "spec": {
    "label": "Plugin DLO acceptance",
    "category": "Other",
    "fields": [
      { "dataType": "Text", "isPrimaryKey": true, "label": "Id", "name": "Id__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Note", "name": "Note__c" }
    ]
  }
}
```

The result reports `outcome: "retrieved"`, or `"unchanged"` when the local file already matches. If the file exists and differs, the retrieve replaces it. A bare `sf data360 retrieve -m dlo -o SOURCE_ALIAS`, alone or beside other families, and a retrieve with no `-m` at all list every DLO the Data 360 API returns in the data space (`--dataspace`, or `default`), connector- and stream-created ones included, and retrieve each one; the plugin does not filter that list. A DLO whose read or file fails gets its own diagnostic with its name; the others are still written. When at least one file was written, the run ends `partial` (exit 68); when none was, it ends `failed` (exit 1). See [exit codes](/tools/sf-plugin-data/#exit-codes). An exact `dlo:Name__dll` selector always reads at API 68.0, whatever `--api-version` says.

<details markdown="1">
<summary>What the saved file leaves out</summary>

The file holds only the authored fields. Salesforce generated fields are left out: `cdp_sys_SourceVersion__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`, `cdp_sys_PartitionDate__c` on Engagement DLOs, and the key qualifier `KQ_<Name>__c` that Salesforce can add for any field `<Name>__c` of the DLO: `KQ_Id__c` for the primary key, or `KQ_RefId__c` once a relationship starts at `RefId__c`. A key qualifier combines an ID with its source context to avoid collisions. The field named by `eventDateTimeFieldName` always stays, and so does the primary key `Id__c`. Native CREATE generates the left-out fields again, and deploy keeps them from the org. Leaving them out is therefore not field deletion or proof of mapping auto-pair behavior. A retrieved file deploys back `unchanged`. The raw API response remains complete. Custom qualifiers and `keyQualifierName` references stay as read. DLO Metadata marks the qualifier with `definitionCreationType=System` and `usageTag=KEY_QUALIFIER`.

A DLO with a record-modified field keeps it in the file as `spec.recordModifiedFieldName`, for example `SystemModstamp__c` on a CRM stream DLO. `capabilities` is left out: Salesforce owns it, and every DLO read so far returned it empty.

</details>
{% endcapture %}

{% capture read_metadata %}
### Metadata API read of the object

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes. Use the exact object name, including `__dll`.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>CustomObject</met:type>
      <met:fullNames>CustomerSource__dll</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds `fullName`, `label`, `mktDataLakeAttributes` and the `fields` list. Each field carries `mktDataLakeFieldAttributes`. `listMetadata` with the type `CustomObject` did not return any DLO at API 68.0, so you need to know the name first; the Connect API tab lists them.
{% endcapture %}

{% include operation-tabs.html id="dlo-read" label="Read" split_api=true cli_state="available" cli_reason="Downloads the object and its fields as XML files." cli_body=read_cli metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata by exact name. listMetadata does not list DLOs." metadata_body=read_metadata connect_state="available" connect_reason="Tested at API 68 on test objects (see Evidence)." connect_body=read_connect plugin_state="available" plugin_reason="Tested at API 68 in one org (see Evidence)." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the object from the saved file when no object with that name exists in the target org.

```sh
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS
```

The result reports `outcome: "created"` and `mutation: "confirmed-created"`. Running the command again reports `outcome: "unchanged"` when nothing differs.

The saved file format is shown in the Read chapter. Add `--preview` to compare without writing. A hand-written file needs only the authored fields; Salesforce adds the generated ones.

The file's `spec.category` is sent as written and Salesforce decides. Its API lists `Profile`, `Engagement`, `Other`, `Directory_Table`, `Observability_Table`, `Insights`, `Vector_Embedding` and `Content`. An Engagement DLO also needs `spec.eventDateTimeFieldName`, the name of one listed DateTime field. This sketch shows only that key and the field it names:

```json
{
  "spec": {
    "category": "Engagement",
    "eventDateTimeFieldName": "EventAt__c",
    "fields": [
      { "dataType": "DateTime", "isPrimaryKey": false, "label": "EventAt", "name": "EventAt__c" }
    ]
  }
}
```

Salesforce adds the DateTime field `cdp_sys_PartitionDate__c` to an Engagement DLO. It counts as generated, is never sent and may be left out of the file.

`spec.recordModifiedFieldName` is optional. It names one listed DateTime field that tells Salesforce when a record last changed. The plugin sends it without the `__c` suffix, and Salesforce reads it back with the suffix. `capabilities` cannot be set: Salesforce answers HTTP 403 to a non-empty value and accepts only `{}`, so the file has no such key.
{% endcapture %}

{% capture create_connect %}
Creates a standalone DLO with no stream. Use it only for a name that does not exist yet: read the name first (Read chapter) and continue only on a not-found answer.

Save this as `dlo-create.json`:

```json
{
  "name": "CustomerSource",
  "label": "CustomerSource",
  "category": "Other",
  "dataspaceInfo": [{ "name": "default" }],
  "dataLakeFieldInputRepresentations": [
    { "name": "Id", "label": "Id", "dataType": "Text", "isPrimaryKey": true },
    { "name": "Note", "label": "Note", "dataType": "Text", "isPrimaryKey": false }
  ]
}
```

Names go without their suffixes: `CustomerSource` becomes `CustomerSource__dll`, and `Id` becomes `Id__c`. Mark exactly one field as the primary key. Do not list the fields Salesforce generates (Read chapter). Keep the label at 40 characters or fewer. An Engagement DLO also needs `eventDateTimeFieldName`, the name of one listed DateTime field without `__c`, for example `"category": "Engagement"` with `"eventDateTimeFieldName": "EventAt"` and a DateTime field `EventAt`. Salesforce then adds `cdp_sys_PartitionDate__c`. A Profile and an Engagement DLO are both accepted with HTTP 201.

```sh
sf api request rest '/services/data/v68.0/ssot/data-lake-objects' --method POST --body '@dlo-create.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS
```

Success is HTTP 201 with status `PROCESSING`. Read the object by name until it shows `ACTIVE`. It then lists seven fields: `Id__c` as the primary key, `Note__c`, and the generated `KQ_Id__c`, `cdp_sys_SourceVersion__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`.

**Known failures:**

- A label longer than 40 characters returns HTTP 400.
- For a DLO that a stream feeds, create the stream instead. It creates its landing DLO; see [Data Streams](/next/data-cloud-devops/data-stream-definition/#create).
{% endcapture %}

{% capture create_cli %}
Deploys the object with only the fields you author. Salesforce adds the key qualifier `KQ_Id__c`. Leave out every field that Salesforce generates (`KQ_…`, `cdp_sys_…`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`): a deploy that restates them fails.

**The result is a disabled definition only.** It reads back with `isEnabled` `false`, and no Data Lake Object instance exists for it: the Connect API answers HTTP 400 `INVALID_INPUT` for its name, and the plugin cannot see it. Such a definition cannot feed a mapping: the Connect API mapping create answers `ITEM_NOT_FOUND` ("DLO not found"), and `createMetadata` of an `ObjectSourceTargetMap` fails with `UNKNOWN_EXCEPTION`. A Connect API create under the same name is refused ("A Data Lake Object with the given name already exists"). To get a DLO that the Connect API, the plugin and mappings can use, create it on the Connect API or plugin tab under a name that has no definition.

Save the object file as `force-app/main/default/objects/CustomerSource__dll/CustomerSource__dll.object-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>CustomerSource</label>
    <mktDataLakeAttributes>
        <creationType>Custom</creationType>
        <isEnabled>true</isEnabled>
        <objectCategory>Salesforce_SFDCReferenceModel_0_93.Related</objectCategory>
    </mktDataLakeAttributes>
</CustomObject>
```

Save the key as `fields/Id__c.field-meta.xml` beside it. `Note__c` is the same without `primaryIndexOrder`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Id__c</fullName>
    <label>Id</label>
    <length>60</length>
    <mktDataLakeFieldAttributes>
        <definitionCreationType>Custom</definitionCreationType>
        <externalName>Id</externalName>
        <isEventDate>false</isEventDate>
        <isInternalOrganization>false</isInternalOrganization>
        <isRecordModified>false</isRecordModified>
        <primaryIndexOrder>1</primaryIndexOrder>
        <usageTag>NONE</usageTag>
    </mktDataLakeFieldAttributes>
    <required>false</required>
    <type>Text</type>
</CustomField>
```

```sh
sf project deploy start --metadata CustomObject:CustomerSource__dll --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the object and both fields as `Created`. A retrieve afterwards saves `Id__c` with `primaryIndexOrder` `1`, `Note__c` and the generated `KQ_Id__c`.
{% endcapture %}

{% capture create_metadata %}
### Metadata API create of the object

Send `createMetadata` to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. The object and its authored fields go in one record; leave out every field that Salesforce generates.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:createMetadata>
      <met:metadata xsi:type="met:CustomObject">
        <met:fullName>CustomerSource__dll</met:fullName>
        <met:label>CustomerSource</met:label>
        <met:mktDataLakeAttributes>
          <met:creationType>Custom</met:creationType>
          <met:isEnabled>true</met:isEnabled>
          <met:objectCategory>Salesforce_SFDCReferenceModel_0_93.Related</met:objectCategory>
        </met:mktDataLakeAttributes>
        <met:fields>
          <met:fullName>Id__c</met:fullName>
          <met:label>Id</met:label>
          <met:length>60</met:length>
          <met:mktDataLakeFieldAttributes>
            <met:definitionCreationType>Custom</met:definitionCreationType>
            <met:externalName>Id</met:externalName>
            <met:isEventDate>false</met:isEventDate>
            <met:isInternalOrganization>false</met:isInternalOrganization>
            <met:isRecordModified>false</met:isRecordModified>
            <met:primaryIndexOrder>1</met:primaryIndexOrder>
            <met:usageTag>NONE</met:usageTag>
          </met:mktDataLakeFieldAttributes>
          <met:type>Text</met:type>
        </met:fields>
        <met:fields>
          <met:fullName>Note__c</met:fullName>
          <met:label>Note</met:label>
          <met:length>60</met:length>
          <met:mktDataLakeFieldAttributes>
            <met:definitionCreationType>Custom</met:definitionCreationType>
            <met:externalName>Note</met:externalName>
            <met:isEventDate>false</met:isEventDate>
            <met:isInternalOrganization>false</met:isInternalOrganization>
            <met:isRecordModified>false</met:isRecordModified>
            <met:usageTag>NONE</met:usageTag>
          </met:mktDataLakeFieldAttributes>
          <met:type>Text</met:type>
        </met:fields>
      </met:metadata>
    </met:createMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The response holds one `success` `true` result each for the object and both fields. As with the CLI tab, the result is a disabled definition (`isEnabled` `false`) with the generated `KQ_Id__c` and no Data Lake Object instance, so the Connect API does not find it.
{% endcapture %}

{% include operation-tabs.html id="dlo-create" label="Create" split_api=true cli_state="available" cli_reason="Tested at API 68.0 on a new name. It saves a disabled definition without a Data Lake Object instance (see Evidence)." cli_body=create_cli metadata_state="available" metadata_reason="Tested at API 68.0 with createMetadata on a new name. It saves a disabled definition without a Data Lake Object instance (see Evidence)." metadata_body=create_metadata connect_state="available" connect_reason="Tested at API 68 on new names, directly and through the plugin (see Evidence)." connect_body=create_connect plugin_state="available" plugin_reason="Tested at API 68 on a new name in one org (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Change the label or add a field in the saved file, then deploy it. The command refuses changes to existing fields.

```sh
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS
```

After a label change, the result reports `outcome: "updated"` and `mutation: "confirmed-updated"`. Running the command again with no change reports `outcome: "unchanged"`.

`spec.recordModifiedFieldName` can be added to a DLO that has none, also in the same deploy that adds the DateTime field it names. Once it is set, Salesforce refuses to change it: the deploy sends the PATCH and reports `DLO_HTTP_ERROR` with HTTP 400 "Record modified field already present".

**Refused before anything is written:**

- Changing the category (`UNSUPPORTED_DLO_CATEGORY_CHANGE`) or the event field (`UNSUPPORTED_DLO_EVENT_FIELD_CHANGE`).
- Changing or removing an existing field, or changing the primary key (`UNSUPPORTED_DLO_FIELD_CHANGE`).

Add `--preview` to compare without writing.
{% endcapture %}

{% capture update_connect %}
Use one PATCH to change the label and add a text field. Then read the object again to check the result.

To change the label and add a text field, save this as `dlo-patch.json`:

```json
{
  "label": "CLI API CRUD updated",
  "dataLakeFieldInputRepresentations": [
    { "name": "UpdateNote", "label": "Update Note", "dataType": "Text", "isPrimaryKey": false }
  ]
}
```

```sh
sf api request rest /services/data/v68.0/ssot/data-lake-objects/OWNED_DLO_ID --target-org SOURCE_ALIAS --method PATCH --body @dlo-patch.json --header Content-Type:application/json
```

Replace `OWNED_DLO_ID` with the ID of an owned test object, from a GET request. The reply can show `PROCESSING`. Read the object again until it shows `ACTIVE`.

**Known failures:**

- A PATCH that restates an existing field with a new label returns HTTP 400 `INVALID_INPUT`: the fields already exist and only new fields can be added.
- A PATCH that names `category` or `eventDateTimeFieldName` returns HTTP 400 `JSON_PARSER_ERROR` (unrecognized field). Neither can change after creation.
- A PATCH can set `recordModifiedFieldName` on a DLO that has none. Once it is set, any PATCH that names it returns HTTP 400 `INVALID_INPUT` "Record modified field already present", even with the same value.
- A non-empty `capabilities` object returns HTTP 403 `INVALID_INPUT`, an unknown key in it HTTP 400 `JSON_PARSER_ERROR`. Only `{}` is accepted.
- Removing a field is not possible through these routes. The REST field DELETE (`/ssot/data-lake-objects/NAME/fields/FIELD`) works only for external DLOs and answers HTTP 400 otherwise. A Metadata API destructive change for a `CustomField` is refused with "setup object in use".
{% endcapture %}

{% capture update_cli %}
Changes the label and adds a field on an existing DLO, including an active DLO that the Connect API or the plugin created, and a DLO that a stream feeds. Retrieve the object first so the project holds every field, edit the object file's `label`, add a field file, then deploy:

```sh
sf project deploy start --metadata CustomObject:CustomerSource__dll --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the object as `Changed`, the new field as `Created` and every retrieved field, generated ones included, as `Unchanged`. The Connect API GET then shows the new label and the added field, and the DLO stays `ACTIVE`.

Existing fields cannot change or be removed this way: setting the primary-key order on an existing field fails, and a destructive change that names one DLO field is refused with "setup object in use". The refusal was observed on a deployed definition, on an active standalone DLO and on a stream-owned DLO, for unmapped fields too.
{% endcapture %}

{% capture update_metadata %}
### Metadata API update of the object

`updateMetadata` changes the object's label. Send only the object, without `fields`; restate its `mktDataLakeAttributes` as `readMetadata` returned them:

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:updateMetadata>
      <met:metadata xsi:type="met:CustomObject">
        <met:fullName>CustomerSource__dll</met:fullName>
        <met:label>CustomerSource updated</met:label>
        <met:mktDataLakeAttributes>
          <met:creationType>Custom</met:creationType>
          <met:isEnabled>true</met:isEnabled>
          <met:objectCategory>Salesforce_SFDCReferenceModel_0_93.Related</met:objectCategory>
        </met:mktDataLakeAttributes>
      </met:metadata>
    </met:updateMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

To add a field, send `createMetadata` with one `CustomField` record whose `fullName` is `CustomerSource__dll.Extra__c` and whose attributes match `Note__c` on the Create tab. A new field listed inside an `updateMetadata` object record is refused with `INVALID_CROSS_REFERENCE_KEY` (no `CustomField` of that name found). Both calls worked on an active DLO created through the Connect API and on a DLO that a stream feeds: the GET showed the new label and field and stayed `ACTIVE`, and the stream stayed `ACTIVE` with its mappings unchanged.

**Known failures:**

- `deleteMetadata` of a `CustomField` is refused with `DELETE_FAILED` "setup object in use", on a definition, an active standalone DLO and a stream-owned DLO alike.
{% endcapture %}

{% include operation-tabs.html id="dlo-update" label="Update" split_api=true cli_state="available" cli_reason="Tested at API 68.0 for a label change and a text field addition, on a deployed definition, an active DLO and a stream-owned DLO. Field removal is refused (see Evidence)." cli_body=update_cli metadata_state="available" metadata_reason="Tested at API 68.0: updateMetadata changed the label and createMetadata added a text field, on a definition, an active DLO and a stream-owned DLO. Field removal is refused (see Evidence)." metadata_body=update_metadata connect_state="available" connect_reason="Tested at API 68 for a label change and a text field addition (see Evidence)." connect_body=update_connect plugin_state="available" plugin_reason="Tested at API 68 for a label change and a text field addition (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_connect %}
Deletes the object, then checks that it is gone. Use this only on an empty custom DLO that you own. Check its owner and dependencies first.

Save this request as `dlo-delete-request.json`, replacing `OWNED_DLO_ID` with the exact ID of that object:

```json
{
  "url": "/services/data/v68.0/ssot/data-lake-objects/OWNED_DLO_ID",
  "method": "DELETE",
  "body": { "mode": "raw", "raw": "" }
}
```

```sh
sf api request rest --file dlo-delete-request.json --target-org SOURCE_ALIAS --include
```

The DELETE reply alone does not prove deletion. Run a GET afterwards. When the object is gone, the GET reports that it does not exist.

Read the dependencies first (Read chapter). Salesforce refuses to delete an object that something still uses: the DELETE answers HTTP 412 with `DEPENDENCY_EXISTS` ("referenced elsewhere in Salesforce") and changes nothing.

**Known failures:**

- Sending an empty body on the command line fails locally with `No mode found in body entry`. Use the request file above.
- This DELETE was tested only on standalone DLOs. For a DLO that a stream feeds, delete the stream with its DLO; see [Data Streams](/next/data-cloud-devops/data-stream-definition/#delete).
{% endcapture %}

{% capture delete_plugin %}
Deletes the object and its local file. The command has no confirmation prompt. Add `--preview` first to check the target without changing it; it lists the local file instead of removing it.

```sh
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --preview
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS
```

The result reports `outcome: "deleted"` and `mutation: "confirmed-deleted"`. After a confirmed deletion the command removes `data360/dlo/CustomerSource__dll.dlo-meta.json` from the current project. Add `--keep-local-files` to keep it. A file that cannot be removed leaves the org result confirmed and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`; do not repeat the delete.

The command reads the object's dependencies before its first write. A dependent that the same command does not delete stops it with `DLO_DEPENDENCY_EXISTS`, which names each dependent and changes nothing. Select the dependents in the same command and they are deleted first, in this order: relationships, mappings, DMOs, then DLOs.

```sh
sf data360 delete -m dlo:CustomerSource__dll -m dmo:Customer__dlm -o TARGET_ALIAS
```

If Salesforce still lists the dependents the command just deleted, it stops with `DLO_DEPENDENCY_PENDING` and does not send the DLO delete; wait and run the delete again for the DLO alone. A DELETE that Salesforce answers with HTTP 4xx reports mutation `rejected`.
{% endcapture %}

{% capture delete_cli %}
Deletes a DLO definition that a deploy or `createMetadata` created. **An active DLO is refused**: one created through the Connect API, the plugin or a stream has a Data Lake Object instance, and the delete fails with "This data lake object definition is referenced elsewhere in Salesforce", even when its dependency list is empty. Delete such a DLO on the Connect API or plugin tab.

In an empty folder named `destructive`, save a `package.xml` that selects nothing:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>68.0</version>
</Package>
```

Save `destructiveChanges.xml` beside it, naming the object:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>CustomerSource__dll</members>
        <name>CustomObject</name>
    </types>
    <version>68.0</version>
</Package>
```

```sh
sf project deploy start --metadata-dir destructive --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The result lists the object with `deleted` `true`. Afterwards `readMetadata` returns no record for the name.
{% endcapture %}

{% capture delete_metadata %}
### Metadata API delete of the object

Send `deleteMetadata` with the exact name. The same limit as on the CLI tab applies: only a definition that a deploy or `createMetadata` created is deleted.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:deleteMetadata>
      <met:type>CustomObject</met:type>
      <met:fullNames>CustomerSource__dll</met:fullNames>
    </met:deleteMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

For an active DLO the result is `success` `false` with status code `DEPENDENCY_EXISTS` and the message "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again", naming its own Data Lake Object instance.
{% endcapture %}

{% include operation-tabs.html id="dlo-delete" label="Delete" split_api=true cli_state="available" cli_reason="Tested at API 68.0 on a definition that a deploy created. An active DLO is refused (see Evidence)." cli_body=delete_cli metadata_state="available" metadata_reason="Tested at API 68.0 with deleteMetadata on a definition that createMetadata created. An active DLO is refused with DEPENDENCY_EXISTS (see Evidence)." metadata_body=delete_metadata connect_state="available" connect_reason="Tested at API 68 on an empty, owned test object (see Evidence)." connect_body=delete_connect plugin_state="available" plugin_reason="Tested at API 68 on an owned test object in one org (see Evidence)." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-lake-objects` (and its item routes) belongs to the **Data 360 Connect REST API**, as listed in the [Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec). The native API and plugin examples use this family through authenticated `sf api request rest`; they do **not** use the SOAP-based Metadata API. The XML `sf project` workflows in the CLI sections use Metadata API instead. Calling either API through Salesforce CLI does not make it a dedicated out-of-the-box DLO command or broaden the operation/version qualification recorded below.

**Why a native API plugin workflow:** Standard `sf project retrieve start` successfully retrieved this DLO definition at requested API versions 65–68; the saved XML was identical. The reason to choose a native API workflow is **not** missing Metadata retrieval support: replaying a complete retrieved definition encountered the primary-key and key-qualifier failures described below. Separate API 68 experiments completed a standalone DLO lifecycle, with the service creating the primary key, qualifier and system fields. Neither result establishes unrestricted Metadata support or ingestion readiness.

The plugin sends its requests over one in-process connection that uses the Salesforce CLI's stored authentication; it does not start a CLI process per request. Its benefit beyond a redundant command wrapper is a manifest-free workflow with canonical `data360/dlo/<FullApiName>__dll.dlo-meta.json`, portable JSON without the source record ID, separate save/create/update field policies, and target-name lookup selecting PATCH for an existing target or POST only after confirmed absence. This avoids handcrafting each API request or blindly replaying generated response fields. Plugin command acceptance is distinct from the separate API experiments below.

**Plugin API versions:** The raw native DLO routes (POST, GET, PATCH and DELETE) worked from API 61.0 through 68.0 in the tested org. At 60.0 all four answered `NOT_FOUND`, although the reference documents them from 60.0. Plugin deploy and delete take the default (`auto`, 68.0) or an explicit numeric pin from 61.0; an exact `dlo:` retrieve always reads at 68.0. Live plugin runs used 68.0, so other numeric pins are offline-tested only.

**Direct creation for a transform output:** a directly created DLO can serve as the output
of an STL transform, without a DataStream for that output; Salesforce refuses an STL output
DLO that does not exist. Precreation is not needed for a DCSQL transform, which creates the
output DLOs it declares. See [Data Transforms](/next/data-cloud-devops/data-transforms/).

**Plugin command and saved-file contract:** The workflow uses exact `dlo:CustomerSource__dll` selections, API `68.0` in the examples below and the default data space. A full API name includes `__dll`; it is not the source object's record ID. Commands accept an optional `--dataspace NAME` (alias `--data-space`); the flag has no default. A non-default data space is offline-tested only; a mismatch with the object's data space stops with `DLO_DATASPACE_MISMATCH`. Readable retrieval counts successful DLO results, including unchanged files, not API `totalSize`; JSON output is unchanged.

```sh
sf data360 retrieve -m dlo:CustomerSource__dll -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

Retrieve saves `./project/data360/dlo/CustomerSource__dll.dlo-meta.json`. The file contains a versioned `dlo` definition with logical `identity` and `spec`; the spec contains the label, category and the authored field definitions; the fields Salesforce generates are left out. It does not save the source DLO record ID, timestamps, runtime state or duplicate response envelopes. A differing existing file is replaced; identical output is unchanged.

Deploy resolves the exact API name in the target before selecting POST or PATCH. Only confirmed absence permits POST; permission/authentication errors and ambiguous responses stop. UPDATE preserves existing fields and primary-key configuration, with only qualified label changes and ordinary field additions. It is not a schema-replacement operation or proof of cross-org ingestion portability.

**Deletion executes by default, without a separate confirmation prompt.** It resolves and deletes only the selected target ID. There is no cascade, related stream/source/DMO deletion. After a confirmed deletion the local `data360/dlo/<Name>.dlo-meta.json` is removed unless `--keep-local-files` is set. Both deploy and delete provide explicit `--preview` for read-only target comparison/reporting with zero mutations; preview is never the default. Unknown write outcomes stop without automatic retry or rollback; inspect the actual target before trying again. Contract: `sf-data360-delete`.

**Structured output:** With `--json`, the retrieve envelope has contract `sf-data360-retrieve`; `result.items[]` reports `family: "dlo"`, `operation: "retrieve"`, `outcome: "retrieved"` (or `"unchanged"`) and `path`.

**Public-command acceptance and saved example:** The public plugin commands were exercised on a fresh owned standalone fixture at API 68 in the default data space. Separate readbacks confirmed seven raw fields after creation, eight raw fields after the label and field update, preservation after delete preview, and absence after default deletion. These are complete readback counts, not saved-file counts. Delete preview left readback unchanged, and the default delete completed without a prompt. This proves the bounded API 68 definition workflow, not ingestion or cross-org portability.

The public create reported `outcome: created`, `mutation: confirmed-created`, with preflight `target: absent` and `absenceProof: confirmed-404`. The update reported `outcome: updated`, `mutation: confirmed-updated`, with `target: existing`. These are request outcomes, not a claim that the response alone proves settlement.

The two-field example below applies the save policy to that readback, with the synthetic fixture name substituted. It is not a separately live-accepted saved file or an HTTP CREATE request:

```json
{
  "schemaVersion": 1,
  "kind": "dlo",
  "identity": { "apiName": "PluginDlo202611021355__dll", "dataSpace": "default" },
  "spec": {
    "label": "Plugin DLO acceptance",
    "category": "Other",
    "fields": [
      { "dataType": "Text", "isPrimaryKey": true, "label": "Id", "name": "Id__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Note", "name": "Note__c" }
    ]
  }
}
```

**Accepted requests and asynchronous completion:** A successful request is not necessarily a completed operation. The retained native
DLO experiments observed POST HTTP `201` with `PROCESSING`, then independent GET
`ACTIVE`; PATCH HTTP `200` with `PROCESSING`, then GET `ACTIVE`; and DELETE HTTP `204`, followed by a brief GET HTTP `200` with `DELETING`
before exact-name GET returned `404`. These are short
asynchronous transitions, not failed writes to repeat automatically.

After a write, use bounded, independent read-only polling for the exact identity:
confirm `ACTIVE` and the intended complete field/key state after create/update,
and confirmed absence after delete. Stop at the chosen attempt/time limit and
report pending or unknown rather than declaring completion, retrying a write or
cascading cleanup. Plugin `created`, `updated` and `deleted` report accepted or
confirmed request outcomes; they do not replace an independent terminal-state
check. A delete that Salesforce accepted and is still settling already removes the
retrieved local definition; pass `--keep-local-files` to keep it.

This differs from the DMO API contract warning that PATCH may return the
pre-update representation: the DLO observation here is an explicit `PROCESSING`
response followed by independent settlement. Do not substitute one product's
response contract for the other's.

**Standard retrieve across requested API versions:** **Verified requested API 65–68 on test fixture:** four sequential standard Salesforce CLI retrieves of `McpMappingProbe_20261027__dll` in one source org each exited `0`, with `success: true` and `status: Succeeded`. Every run saved nine XML components: one object and eight fields. All nine corresponding files were **byte-for-byte identical**, and parsed XML comparisons also agreed across 65.0, 66.0, 67.0 and 68.0. The explicit requested versions are recorded in the commands; the CLI JSON did **not independently echo an effective API version**.

**Actual differences:** job IDs, response `package.xml` timestamps and absolute local file paths varied. No `package.xml` was emitted to disk. The prepared `sfdx-project.json` differed by configured version; it was an input, not a retrieved component. There were no saved-component differences by version, so the command and sample files are shown only once.

The response identifies the object as `type: CustomObject` and `fullName: McpMappingProbe_20261027__dll` and lists its field files separately. Keep all retrieved attributes, including primary-index and key-qualifier settings. This is definition retrieval, not connector credentials, the whole ingestion setup, row data or runtime processing. It establishes neither cross-org deployability nor CREATE, UPDATE, DELETE or wrapper support.

**Separate wrapper readback:** the public `sf-plugin-data` source CLI entry point retrieved this same fixture with requested API `68.0`, selector `dlo:McpMappingProbe_20261027__dll` and an isolated output directory. It exited `0`, reported `success` / `retrieved`, and had empty diagnostic errors, warnings and stderr. Its nine XML files used the same standard decomposed paths and were byte-for-byte identical to the standard API 68 snapshot: zero missing, extra or different files. This is definition-only retrieval, not portable deployment, ID resolution, row export or operational ingestion. Numeric API 65–68 pass-through is implemented and covered by implementation tests, but **only API 68 was live-verified for this wrapper**. This separate observation does not enable the guide's plugin tab or change any CREATE qualification.

**Standard Metadata CREATE comparison: requested API 65–68:** **The unchanged retrieved test schema failed standard creation at all four requested versions.** Four sequential standard `sf project deploy start` attempts used four distinct synthetic names, each independently confirmed absent in the test target org before deployment. These were genuine CREATE attempts, not updates: only the object directory and `.object-meta.xml` filename were renamed from the retrieved fixture; all nine XML file contents remained byte-for-byte identical to the samples in the Read chapter. The existing `McpMappingProbe_20261027__dll` was not deployed or changed.

One representative **failed deployment command, not a successful creation recipe**:

```sh
sf project deploy start --metadata CustomObject:McpDloCreate68_XJ0GCE__dll --target-org TARGET_ALIAS --api-version 68.0 --test-level NoTestRun --wait 5
```

This is an actual deployment, not a dry run. Each requested version (65.0, 66.0, 67.0 and 68.0) returned CLI exit `1`, terminal `Failed`, `done: true`, `success: false`, `checkOnly: false` and `rollbackOnError: true`. All reported a `CustomField` failure at `<testname>.Id__c`, line `54`, column `13`, in the deployment's combined object file. The generic internal error had the same signature `(-1644920076)` in every run. This location identifies the reported primary-field failure; it does **not establish its underlying cause**.

**Actual differences by run:** the synthetic object names, job IDs, timestamps and individual support error IDs differed. The shared error signature, field location and failed outcome did not differ by requested version. The pins are command evidence, not an independently established effective server version.

Independent exact-name Metadata retrieves after each failure reported that the named object could not be found. No retained new metadata DLO was observed for those four names; this is not a global runtime inventory or universal rollback guarantee. No fields were stripped, no stream was provisioned and no deployment was retried. This bounded result does **not mean all DLO CREATE is unsupported**, and does not qualify an operational ingestion chain. Do not treat removal of primary-key or system qualifier metadata as a verified equivalent creation recipe.

**Controlled Metadata experiments: API 68 only:** These experiments used standard `CustomObject` and `CustomField` deployment, not a plugin or an ingestion API. They are separate from the unchanged-schema comparison above; **none of the following variants was tested at API 65–67**. Use fresh, independently absent synthetic names and isolated projects, not a shared DLO. The commands below are retained experiment shapes with aliases and names replaced, not an operational ingestion recipe.

**Empty definition, then original fields in the target org:** a project containing only the original object XML, renamed to a fresh `ProbeTarget__dll` directory/file, successfully deployed one `CustomObject`. An independent retrieve returned the object and zero fields: no `Id__c` or other field was automatically generated. Submitted `isEnabled=true` read back as `false`; the original category was retained.

```sh
sf project deploy start --metadata CustomObject:ProbeTarget__dll --api-version 68.0 --target-org TARGET_ALIAS --wait 5
```

A separate fields-only project then submitted all eight unchanged field files, selecting each explicitly as `CustomField:ProbeTarget__dll.<field-name>` with repeated `--metadata` flags. The deployment failed at `Id__c` with signature `(-64830600)` and `rollbackOnError: true`. Seven component successes in the response were provisional: independent final retrieval still showed **zero persisted fields**, not seven.

**Isolating custom fields on that retained empty definition:** remove only the line `<primaryIndexOrder>1</primaryIndexOrder>` from the original `Id__c.field-meta.xml`; keep the field itself and every other attribute. This changes the supplied sample from 655 to 606 bytes. Deploy just that field, then the unchanged original `Name__c` and `Note__c` files:

```sh
sf project deploy start --metadata CustomField:ProbeTarget__dll.Id__c --api-version 68.0 --target-org TARGET_ALIAS --wait 5
sf project deploy start --metadata CustomField:ProbeTarget__dll.Name__c --metadata CustomField:ProbeTarget__dll.Note__c --api-version 68.0 --target-org TARGET_ALIAS --wait 5
```

Both deployments succeeded. Independent retrieval confirmed exactly **three persisted fields: `Id__c`, `Name__c`, `Note__c`**. Their XML bytes matched the respective submitted files; `Id__c` had no `primaryIndexOrder`. Restoring only that annotation by deploying the original 655-byte `Id__c` XML failed with signature `(883038728)`. Independent retrieval confirmed all three fields unchanged and no primary-index annotation. This isolates an annotation-sensitive failure in this context; it does not identify the missing prerequisite or prove that an annotation-free schema is equivalent to the source DLO.

**Single deployment in the source org:** a different fresh `ProbeSource__dll` received the original object plus all eight field files in one deployment, with only the same `primaryIndexOrder` line removed from `Id__c`. All seven other fields, including system and `KEY_QUALIFIER` attributes, were unchanged.

```sh
sf project deploy start --metadata CustomObject:ProbeSource__dll --api-version 68.0 --target-org SOURCE_ALIAS --wait 5
```

This failed at `KQ_Id__c` with signature `(2099634494)`, `success: false` and rollback enabled. Eight provisional component successes did not establish persistence: independent exact-name retrieval reported the object missing, and an independent Metadata listing had no matching name. **Removing the primary-index annotation alone was insufficient for this complete eight-field CREATE.** The result does not isolate the qualifier's name, system creation type or usage tag as its cause.

The retained target definition's `isEnabled=false` is an observation, **not an invalidity criterion**. Whether a stream is required to enable a DLO is not established: the standalone native API experiment below returned `isEnabled=true` without provisioning a stream, connector or Data Kit, so it does **not support a universal stream requirement for enabling**. Metadata definition/field persistence and operational ingestion readiness remain different questions. No general CREATE/UPDATE rating or portable recipe is promoted by these experiments.

**Native standalone DLO creation: verified API 68 experiment:** A direct Connect REST `POST /services/data/v68.0/ssot/data-lake-objects` in the source org created a fresh standalone DLO in the independently verified active `default` dataspace. This is a distinct native route from Metadata XML deployment and from stream creation. **Only API 68 was tested for this request**, not API 65–67 or cross-org replay.

Send the following JSON body through your authenticated REST client to that endpoint. Replace `StandaloneKeyProbe` with a fresh name independently confirmed absent; the name here is sanitized, while the other values reproduce the corrected request. This is a real write, not a preview. Keep the object label at **40 characters or fewer**.

```json
{
  "name": "StandaloneKeyProbe",
  "label": "CLI API primary key probe",
  "category": "Other",
  "dataspaceInfo": [{ "name": "default" }],
  "dataLakeFieldInputRepresentations": [
    { "name": "Id", "label": "Id", "dataType": "Text", "isPrimaryKey": true },
    { "name": "Note", "label": "Note", "dataType": "Text", "isPrimaryKey": false }
  ]
}
```

The initial request returned HTTP `400` because its object label exceeded the 40-character limit. The corrected request changed **only the label** to `CLI API primary key probe`, retaining the same name and every other value after reconfirming absence. It returned HTTP `201` with `PROCESSING`; that response alone was not treated as completion. A separate Connect GET returned HTTP `200` and independently confirmed `ACTIVE`.

Standard API 68 Metadata retrieval then succeeded and saved **one object plus seven field files**. The submitted `Id` and `Note` persisted as `Id__c` and `Note__c`; `Id__c` had `primaryIndexOrder=1`. Salesforce generated `KQ_Id__c`, `cdp_sys_SourceVersion__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`. The qualifier's retrieved XML had `definitionCreationType=System` and `usageTag=KEY_QUALIFIER`. These five generated fields belong in the retrieve inventory; **they were not supplied in the create payload**. Do not replay the seven-field readback as though it were this two-field request.

The object read back with `isEnabled=true`; Connect category `Other` corresponded to Metadata `Salesforce_SFDCReferenceModel_0_93.Related`. **No stream, connector or Data Kit was created by this experiment.** The result establishes this bounded standalone creation, key designation, generated fields and settled readback, not row ingestion, processing of source data, duplicate-create safety, a complete operational ingestion chain or general CRUD portability. The Metadata deployment failures above remain valid results for their different inputs and routes. The plugin sends the same request shape, and its create was accepted at API 68 in two orgs (see Public-command acceptance and Cross-org acceptance); the API tab shows that request.

`MktDataLakeObject` is a Data360 concept, not evidence of MCN-only scope; the official AnalyticsWorkspace reference also names it. A file-based deployment warning about named setup metadata types does not by itself settle the separately observed `CustomObject`/`CustomField` behavior. Data Kit packaging is a separate concern, not a condition used to reject these experiments.

**Stream-owned DLO creation:** A Data Stream creates its own landing DLO. The native API 68 stream create, on an existing Ingestion API connection, is in [Data Streams](/next/data-cloud-devops/data-stream-definition/#create). Salesforce names that stream and its DLO after the connection and event and ignores the proposed names. Creating the connection or its event schema is not covered here.

**Standalone native API read: verified API 68:** The [Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) documents GET, PATCH and DELETE at `/ssot/data-lake-objects/{recordIdOrDeveloperName}` as available since API 60.0. **Live GET/PATCH/DELETE evidence here is API 68 only**, not API 65–67. These are API requests through standard `sf api request rest`, which handles authentication for `SOURCE_ALIAS`; they are not dedicated native CLI DLO commands or plugin support.

The GET is shown in the Read chapter. This GET by developer name returned HTTP `200`, `ACTIVE` and **seven fields** for the owned standalone object created in the native API experiment above. Its `Id__c` remained the primary key. Preserve the complete readback, including generated fields, rather than treating it as a create/update body.

**Response shapes differ:** the GET body contains a `dataLakeObjects` array, even for this exact-name read; identify the exact returned object and retain its ID. The successful POST and PATCH bodies contain a **single DLO object**, not that array. HTTP headers shown by `--include` are separate from the JSON body. This is a definition/configuration read, not row export or proof of ingestion.

**Create rules:** The category is sent as the file states it and Salesforce decides; its API lists `Profile`, `Engagement`, `Other`, `Directory_Table`, `Observability_Table`, `Insights`, `Vector_Embedding` and `Content`. An Engagement DLO also needs `spec.eventDateTimeFieldName`: the full name (with `__c`) of one of the listed fields, which dates each record. The plugin sends it without the suffix, and retrieval saves it. Salesforce adds the DateTime field `cdp_sys_PartitionDate__c` to an Engagement DLO; it counts as generated, is never sent and may be left out of the file. Observed at API 68 through the plugin in one org: a Profile and an Engagement DLO created, deployed again unchanged, and retrieved files deployed back unchanged.

**Update rules:** An existing exact name selects PATCH of the resolved target ID. Only label changes
and nonprimary field additions are admitted; Salesforce decides the type of an added
field. Preview reports `outcome: "update"`; execution reports `outcome: "updated"`,
`mutation: "confirmed-updated"`. An equal label and preserved field inventory report
`outcome: "unchanged"`; execution reports `mutation: "not-attempted"` and sends no
POST or PATCH. Field ordering does not trigger a write, and the omission of the
generated fields from a retrieved file does not count as removing them.

Salesforce changes neither the category nor the event field of an existing DLO: a
PATCH naming either is rejected with HTTP 400 (unrecognized field). The plugin
therefore refuses a changed category with `UNSUPPORTED_DLO_CATEGORY_CHANGE` and a
changed event field with `UNSUPPORTED_DLO_EVENT_FIELD_CHANGE`, before any write.
Existing fields cannot change either: Salesforce rejects a changed field (HTTP 400,
fields already exist), the Metadata API refuses to remove one (setup object in use),
and the REST field delete route works only for external DLOs. A changed or removed
field, or a primary-key change, is refused with `UNSUPPORTED_DLO_FIELD_CHANGE`, which
says why.

A file may omit the fields Salesforce generated: `cdp_sys_SourceVersion__c`,
`DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`,
`cdp_sys_PartitionDate__c` on Engagement DLOs and a key qualifier
`KQ_<Name>__c` whenever `<Name>__c` is another field of the DLO (for example `KQ_Id__c`
for the primary key, or `KQ_RefId__c`, which Salesforce adds when a relationship starts
at the non-key field `RefId__c`). They stay as they are and do not count as changes, so
a hand-written file with only the authored fields deploys onto its existing DLO. Any other target field that the file omits is refused
(`UNSUPPORTED_DLO_FIELD_CHANGE`). A listed field is compared on the keys the file
states: keys that only the org's copy carries are ignored, and a stated key that
differs is refused. Observed at API 68 through the plugin in one org: a hand-written
DLO file deployed again reported `unchanged`, and with one field added it reported
`updated`; on an Engagement DLO a field was added and a changed event field was
refused with nothing written.

**Record-modified field and capabilities:** `spec.recordModifiedFieldName` is kept
through retrieve, create and update. Create sends it without `__c`; update sends it
only when it differs from the org, and Salesforce decides. At API 68 a raw POST with it
created the DLO and a PATCH set it on a DLO that had none; once set, every PATCH naming
it (another field, the same name with or without `__c`) was answered HTTP 400
"Record modified field already present". `capabilities` is not authorable by a customer
user: non-empty values were answered HTTP 403, unknown keys HTTP 400
`JSON_PARSER_ERROR`, and only `{}` was accepted; all 98 DLOs of the test org read
`{}`. The plugin leaves it out of the file. Observed at API 68 through the plugin in
one org, on two custom DLOs with a relationship between their DMOs: create from
hand-written files with the setting, a repeat deploy `unchanged`, a retrieve that saved
the setting and left out `KQ_RefId__c`, a repeat deploy `unchanged`, a changed setting
reported as `DLO_HTTP_ERROR` with Salesforce's HTTP 400, and the setting added on update
together with its field (`confirmed-updated`, then `unchanged`).

No schema removal or ingestion is qualified.

**Stream-owned DLO updates:** To add a field to a DLO that a stream feeds, update the stream, not the DLO: the native API 68 stream PATCH in [Data Streams](/next/data-cloud-devops/data-stream-definition/#update) maps an existing source field to a new DLO field. Adding a field to the source event schema is not covered here.

**Standalone native API update: verified API 68:** A PATCH on the **owned standalone test DLO** returned HTTP `200` after changing its label and adding one non-key Text field. An independent Connect GET confirmed `ACTIVE`, label `CLI API CRUD updated` and **eight fields**, including new `UpdateNote__c` and all seven original fields. Independent standard API 68 Metadata retrieval saved eight field files and confirmed the changed label, retained `Id__c` with `primaryIndexOrder=1` and `isEnabled=true`. PATCH returned a single DLO object; its HTTP `200` was not used instead of independent readback.

This verifies only this standalone label change and Text-field addition at **API 68**. **No existing primary-key mutation was tested.** It does not qualify field removal, type changes, populated-data behavior, stream-owned direct updates, cross-org replay or ingestion. The API tab and summary's Update rating apply to this bounded workflow, not unrestricted schema editing.

**Standalone native API delete: verified API 68:** **Destructive: use only an explicitly authorized object.** The test deleted only the fresh standalone test DLO created by the native API experiment, not the original retrieval fixture or any shared connection/stream. Immediately before deletion, org identity and the exact ID/name were rechecked against the original create ownership receipts and a fresh GET. A read-only dependency check returned `dependencies=[]`, `totalSize=0`. Run it as `GET /services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll/dependencies`. Empty dependencies alone are not deletion authorization. Stop if identity, ownership, permission or dependency state is unresolved; no cascade was requested.

The corrected request exited `0` and returned HTTP `204`. Independent API 68 GETs by **both ID and exact developer name returned `404`**. A successful API 68 Metadata list had **zero exact-name matches**, and a fresh-directory exact Metadata retrieve explicitly reported the object **cannot be found**. Its top-level retrieve success alone would not establish absence; the missing-object message and failed file entry were inspected. Together these readbacks confirmed completed deletion of this exact owned test object.

A first attempt failed locally with `No mode found in body entry`, before any HTTP receipt. It was not a server refusal or a successful delete. The working request-file form above has an explicitly empty raw body. Identity and GET were rechecked before the corrected request. Do not substitute that failed body serialization or assume a retry is needed after an ambiguous HTTP outcome.

Only this standalone definition/provisioning lifecycle was verified at **API 68**, not API 65–67, arbitrary dependent or stream-owned deletion, cascade behavior, populated-data handling or ingestion. The summary's Delete rating and API tab refer only to the bounded standalone workflow above.

**CLI and Metadata API writes at API 68.0:** On `Cli…` probes in one org, with no stream and no mapping; every probe was deleted afterwards and confirmed gone:

- **Create.** A deploy and a `createMetadata` call, each with the object plus the authored `Id__c` (`primaryIndexOrder` `1`) and `Note__c`, succeeded. `readMetadata` and a retrieve returned both fields plus the generated `KQ_Id__c`, with `isEnabled` `false` although `true` was sent. No Data Lake Object instance was created: the Connect GET by name answered HTTP 400 `INVALID_INPUT`. The earlier create failures restated the generated fields; leaving them out is what works.
- **Update.** On those definitions a deploy changed the label and added `Extra__c`; `updateMetadata` changed the label, and `createMetadata` of one `CustomField` added the field. A new field listed only inside an `updateMetadata` object record was refused with `INVALID_CROSS_REFERENCE_KEY`. On an active DLO created through the Connect API, `updateMetadata` (label), `createMetadata` (field) and then a deploy of the retrieved project (label plus a second field, every other field `Unchanged`) all persisted: the Connect GET showed the new label, both new fields and `ACTIVE`.
- **Delete.** A destructive deploy and `deleteMetadata` each deleted a definition that a deploy or `createMetadata` created; `readMetadata` then returned no record. On the active DLO, whose dependency list was empty, both were refused with "referenced elsewhere" (`DEPENDENCY_EXISTS` on `deleteMetadata`), naming its own Data Lake Object instance. The Connect DELETE then removed it.
- **Definitions and mappings (second run, 2026-11-16).** A deploy created a definition with `Id__c` and `Note__c`; `createMetadata` saves the same disabled definition (above). A Connect API mapping from it to a Connect-created DMO answered `ITEM_NOT_FOUND` ("DLO not found for the given developer name"), `createMetadata` of an `ObjectSourceTargetMap` from it failed with `UNKNOWN_EXCEPTION`, and a Connect API DLO create under the same name answered HTTP 400 `INVALID_INPUT` ("already exists"). Nothing was created. The definition was then deleted with `deleteMetadata`.
- **Stream-owned DLO (same run).** On the DLO of an Ingestion API stream created through the Connect API, `updateMetadata` changed the label and `createMetadata` of one `CustomField` added a field. A deploy of the retrieved object then changed the label again and added a second field, with every other field `Unchanged`. The Connect GET showed each label and field with the DLO `ACTIVE`, and the stream stayed `ACTIVE` with the same six mappings.
- **Field removal (same run).** A destructive deploy naming one `CustomField` each on a deployed definition, an active standalone DLO and the stream-owned DLO was refused with "setup object in use" for all three (unmapped fields). `deleteMetadata` of a `CustomField` on each of the three kinds was refused with `DELETE_FAILED` "setup object in use".

**Metadata definition delete refused:** A Metadata definition delete was refused. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

**Stream-owned DLO deletion:** A DLO that a stream feeds is removed with its stream: the native API 68 stream DELETE with `shouldDeleteDataLakeObject=true`, in [Data Streams](/next/data-cloud-devops/data-stream-definition/#delete). The direct DLO DELETE here was tested only on standalone DLOs.

**Cross-org acceptance:** **Installed cross-org acceptance:** an isolated locally packed plugin retrieved a fresh empty standalone Other/default DLO in `mcnext-sdo`, then created it in `mcnext-thuy` from the exact portable file. Org-local IDs differed; independent raw readbacks preserved generated fields and the primary key. A label change plus one nonprimary Text addition persisted. Repeated deploy returned `unchanged` / `not-attempted`; native-client capture recorded GET only, with no POST/PATCH/DELETE. Both exact owned fixtures were deleted after identity and empty-dependency checks, then independently returned 404 by name and ID. Source delete preview preserved its readback; the target campaign call omitted `--preview` and performed the authorized deletion, so this run does not qualify target delete preview. This is API68 standalone definition portability, not ingestion, populated data, mixed-family dependency deployment, lower-version or published-package qualification.

**Portability:** Tested at API 68 from the plugin's source tree against two orgs, on empty, unmapped custom DLOs in the default data space: retrieval, an unchanged deploy into the second org, and deletion. Files retrieved from a source org and from a second org after an unchanged deploy were byte-identical in that run.

**Standard CLI:** `sf org list metadata --metadata-type CustomObject` lists no DLOs, so take the name from a mapping file or the API; `sf project retrieve start --metadata CustomObject:<name>__dll` then saved the object and its fields at API 68.0 (CLI 2.151.7). On a test DLO deployed as an object without fields, further deploys added fields, but setting the primary-key order on an existing field failed. A `destructiveChanges.xml` deploy naming one DLO field was refused with "setup object in use". At API 68 a deploy also changed the label of, and added a field to, an active DLO that the Connect API created and a stream-owned DLO; see the CLI and Metadata API writes above.

**Plugin error codes:** `DLO_DEPENDENCY_EXISTS`, `DLO_DEPENDENCY_PENDING` and `DLO_DEPENDENCIES_UNCONFIRMED` concern the dependency check before a delete (the first two were observed live at API 68, the last is offline-tested). `DLO_DELETE_NOT_CONFIRMED` and `DLO_DELETE_UNCONFIRMED` report a DELETE whose result could not be confirmed; inspect the object before another attempt. `DLO_REQUEST_UNCONFIRMED` and `DLO_HTTP_ERROR` report a write whose outcome is unknown or a Salesforce rejection. `DLO_TARGET_IDENTITY_MISMATCH` and `DLO_DATASPACE_MISMATCH` stop a command whose target does not match the file. The `UNSUPPORTED_DLO_*` codes (category, event field, field change, field addition, selection, data space) are refusals before any write. `LOCAL_FILE_REMOVAL_FAILED` reports a local file that could not be removed after a confirmed delete. Everything except the live observations named above is offline-tested.

**Not verified:** ingestion and populated data; nondefault data spaces; plugin numeric API pins other than 68 (offline-tested only); cascade behavior beyond the dependent selections shown in the Delete chapter; raw DLO routes below API 61; installed released packages.

</details>