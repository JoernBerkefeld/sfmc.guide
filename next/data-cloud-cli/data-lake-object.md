---
layout: page
title: "Data Lake Object (DLO)"
description: "Salesforce CLI workflows and verified operation limits for Data Lake Object (DLO): CustomObject, __dll."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-lake-object/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "yes", methods: [api, plugin] }
  update: { status: "yes", methods: [api, plugin] }
  delete: { status: "yes", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

This badge does not verify untested writes or general CRUD support.

<a id="data-lake-object-dlo-customobject-dll"></a>

**Data Lake Object (DLO)** is a custom object with the `__dll` suffix. It holds data from a source before that data is mapped into the data model. It uses `__dll`, not `__dlm`.

**Example used in every chapter:** `CustomerSource__dll`, an empty custom DLO with a text key `Id` and a text field `Note`.

{% include crud-summary.html %}

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every DLO.

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

A sample response is not in this guide yet.
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

The result reports `outcome: "retrieved"`, or `"unchanged"` when the local file already matches. If the file exists and differs, the command stops unless you add `--overwrite`.

<details>
<summary>What the saved file leaves out</summary>

The file holds only the authored fields. Salesforce generated fields are left out: `cdp_sys_SourceVersion__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c`, `cdp_sys_PartitionDate__c` on Engagement DLOs, and the key qualifier of the primary key, for example `KQ_Id__c`. A key qualifier combines an ID with its source context to avoid collisions. The field named by `eventDateTimeFieldName` always stays, and so does the primary key `Id__c`. Native CREATE generates the left-out fields again, and deploy keeps them from the org. Leaving them out is therefore not field deletion or proof of mapping auto-pair behavior. A retrieved file deploys back `unchanged`. The raw API response remains complete. Custom qualifiers and `keyQualifierName` references stay as read. DLO Metadata marks the qualifier with `definitionCreationType=System` and `usageTag=KEY_QUALIFIER`.

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

The saved file format is shown in the Read chapter.
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

Names go without their suffixes: `CustomerSource` becomes `CustomerSource__dll`, and `Id` becomes `Id__c`. Mark exactly one field as the primary key. Do not list the fields Salesforce generates (Read chapter). Keep the label at 40 characters or fewer. An Engagement DLO also needs `eventDateTimeFieldName`, the name of one listed DateTime field without `__c`.

```sh
sf api request rest '/services/data/v68.0/ssot/data-lake-objects' --method POST --body '@dlo-create.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS
```

Success is HTTP 201 with status `PROCESSING`. Read the object by name until it shows `ACTIVE`. It then lists seven fields: `Id__c` as the primary key, `Note__c`, and the generated `KQ_Id__c`, `cdp_sys_SourceVersion__c`, `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`.

**Known failures:**

- A label longer than 40 characters returns HTTP 400.
- For a DLO that a stream feeds, create the stream instead. It creates its landing DLO; see [Data Streams](/next/data-cloud-cli/data-stream-definition/#create).
{% endcapture %}

{% include operation-tabs.html id="dlo-create" label="Create" split_api=true cli_state="blocked" cli_reason="A standard Metadata deploy of the retrieved test schema failed at API 65 to 68 (see Evidence)." metadata_state="blocked" metadata_reason="This is the same Metadata API deploy as the CLI tab, which failed (see Evidence)." connect_state="available" connect_reason="Tested at API 68 on new names, directly and through the plugin (see Evidence)." connect_body=create_connect plugin_state="available" plugin_reason="Tested at API 68 on a new name in one org (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Change the label or add a field in the saved file, then deploy it. The command refuses changes to existing fields.

```sh
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS
```

After a label change, the result reports `outcome: "updated"` and `mutation: "confirmed-updated"`. Running the command again with no change reports `outcome: "unchanged"`.

**Refused before anything is written:**

- Changing the category or the event field.
- Changing or removing an existing field, or changing the primary key.
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

- Salesforce refuses a change to an existing field.
- Salesforce refuses a change to the category or the event field.
{% endcapture %}

{% include operation-tabs.html id="dlo-update" label="Update" split_api=true cli_state="unknown" cli_reason="Updating a working DLO by deploy is not tested. Adding fields worked only on a test DLO created without fields; removing a field was refused." metadata_state="unknown" metadata_reason="A Metadata API update has not been tested." connect_state="available" connect_reason="Tested at API 68 for a label change and a text field addition (see Evidence)." connect_body=update_connect plugin_state="available" plugin_reason="Tested at API 68 for a label change and a text field addition (see Evidence)." plugin_body=update_plugin %}

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

**Known failures:**

- Sending an empty body on the command line fails locally with `No mode found in body entry`. Use the request file above.
- This DELETE was tested only on standalone DLOs. For a DLO that a stream feeds, delete the stream with its DLO; see [Data Streams](/next/data-cloud-cli/data-stream-definition/#delete).
{% endcapture %}

{% capture delete_plugin %}
Deletes the object and its local file. The command has no confirmation prompt. Add `--preview` first to check the target without changing it.

```sh
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS
```

The result reports `outcome: "deleted"` and `mutation: "confirmed-deleted"`. Add `--keep-local-files` to keep the local file.
{% endcapture %}

{% include operation-tabs.html id="dlo-delete" label="Delete" split_api=true cli_state="blocked" cli_reason="A Metadata definition delete was refused while the DLO still existed and was referenced (see Evidence)." metadata_state="blocked" metadata_reason="This is the same Metadata API delete as the CLI tab, which was refused." connect_state="available" connect_reason="Tested at API 68 on an empty, owned test object (see Evidence)." connect_body=delete_connect plugin_state="available" plugin_reason="Tested at API 68 on an owned test object in one org (see Evidence)." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-lake-objects` (and its item routes) belongs to the **Data 360 Connect REST API**, as listed in the [Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec). The native API and plugin examples use this family through authenticated `sf api request rest`; they do **not** use the SOAP-based Metadata API. The XML `sf project` workflows in the CLI sections use Metadata API instead. Calling either API through Salesforce CLI does not make it a dedicated out-of-the-box DLO command or broaden the operation/version qualification recorded below.

**Why a native API plugin workflow:** Standard `sf project retrieve start` successfully retrieved this DLO definition at requested API versions 65–68; the saved XML was identical. The reason to choose a native API workflow is **not** missing Metadata retrieval support: replaying a complete retrieved definition encountered the primary-key and key-qualifier failures described below. Separate API 68 experiments completed a standalone DLO lifecycle, with the service creating the primary key, qualifier and system fields. Neither result establishes unrestricted Metadata support or ingestion readiness.

The plugin still delegates authenticated requests to `sf api request rest`, so standard Salesforce CLI authentication remains in use. Its benefit beyond a redundant command wrapper is a manifest-free workflow with canonical `data360/dlo/<FullApiName>__dll.dlo-meta.json`, portable JSON without the source record ID, separate save/create/update field policies, and target-name lookup selecting PATCH for an existing target or POST only after confirmed absence. This avoids handcrafting each API request or blindly replaying generated response fields. Plugin command acceptance is distinct from the separate API experiments below.

**Plugin version:** The plugin admits **API 68/default only**.

**Direct creation for a transform output:** Direct DLO creation has a demonstrated use as a **precreated transform output**,
without a DataStream for that output. A native API68 `CUSTOM` / `BATCH` transform
with an `STL` definition bound that directly created output DLO and completed a
run with `SUCCESS` in 47 seconds, processing and writing zero rows. The source
DLO was also directly created as an empty test fixture; ordinary transform sources
may instead contain ingested data. The output binding is the practical reason for
direct creation, not a requirement to create every source this way.

This qualifies only the tested precreated-output path: precreation was **not proven
mandatory**, and automatic output provisioning was **not tested**. A zero-row run
does not qualify populated transformations, other API versions or cross-org replay.
The transform, source DLO and output DLO were removed after the experiment.
**Data Transform plugin commands are not implemented**; see the
[Data Transforms qualification](/next/data-cloud-cli/data-transforms/) for this
native API evidence, not an available plugin transform workflow.

**Plugin command and saved-file contract:** The replacement workflow uses exact `dlo:CustomerSource__dll` selections with API `68.0` and the default data space. A full API name includes `__dll`; it is not the source object's record ID. Commands accept an optional `--dataspace NAME` (alias `--data-space`); the flag has no default. Readable retrieval counts successful DLO results, including unchanged files, not API `totalSize`; JSON output is unchanged.

```sh
sf data360 retrieve -m dlo:CustomerSource__dll -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

Retrieve saves `./project/data360/dlo/CustomerSource__dll.dlo-meta.json`. The file contains a versioned `dlo` definition with logical `identity` and `spec`; the spec contains the label, category and the authored field definitions; the fields Salesforce generates are left out. It does not save the source DLO record ID, timestamps, runtime state or duplicate response envelopes. Changed existing output needs `--overwrite`; identical output is unchanged.

Deploy resolves the exact API name in the target before selecting POST or PATCH. Only confirmed absence permits POST; permission/authentication errors and ambiguous responses stop. UPDATE preserves existing fields and primary-key configuration, with only qualified label changes and ordinary field additions. It is not a schema-replacement operation or proof of cross-org ingestion portability.

**Deletion executes by default, without a separate confirmation prompt.** It resolves and deletes only the selected target ID. There is no cascade, related stream/source/DMO deletion. After a confirmed deletion the local `data360/dlo/<Name>.dlo-meta.json` is removed unless `--keep-local-files` is set. Both deploy and delete provide explicit `--preview` for read-only target comparison/reporting with zero mutations; preview is never the default. Unknown write outcomes stop without automatic retry or rollback; inspect the actual target before trying again. Contract: `sf-data360-delete`.

**Structured output:** With `--json`, the retrieve envelope has contract `sf-data360-retrieve`; `result.items[]` reports `family: "dlo"`, `operation: "retrieve"`, `outcome: "retrieved"` (or `"unchanged"`) and `path`.

**Public-command acceptance and saved example:** The public plugin commands were exercised on a fresh owned standalone fixture at API 68 in the default data space. Separate readbacks confirmed seven raw fields after creation, eight raw fields after the label and field update, preservation after delete preview, and absence after default deletion; the local JSON file remained. These are historical complete readback counts, not current saved-file counts. Delete preview left readback unchanged, and the default delete completed without a prompt. This proves the bounded API 68 definition workflow, not ingestion or cross-org portability.

The public create reported `outcome: created`, `mutation: confirmed-created`, with preflight `target: absent` and `absenceProof: confirmed-404`. The update reported `outcome: updated`, `mutation: confirmed-updated`, with `target: existing`. These are request outcomes, not a claim that the response alone proves settlement.

The two-field example below applies the current save policy to the historical public-command readback, with the synthetic fixture name substituted. It is not a newly live-accepted saved file or an HTTP CREATE request:

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

**Later controlled Metadata experiments: API 68 only:** These experiments used standard `CustomObject` and `CustomField` deployment, not a plugin or an ingestion API. They are separate from the unchanged-schema comparison above; **none of the following variants was tested at API 65–67**. Use fresh, independently absent synthetic names and isolated projects, not a shared DLO. The commands below are retained experiment shapes with aliases and names replaced, not an operational ingestion recipe.

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

The retained target definition's `isEnabled=false` is an observation, **not an invalidity criterion**. The earlier idea that a stream is required to enable a DLO was a hypothesis, not a result. The standalone native API experiment below returned `isEnabled=true` without provisioning a stream, connector or Data Kit, so it does **not support a universal stream requirement for enabling**. Metadata definition/field persistence and operational ingestion readiness remain different questions. No general CREATE/UPDATE rating or portable recipe is promoted by these experiments.

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

**Stream-owned DLO creation:** A Data Stream creates its own landing DLO. The native API 68 stream create, on an existing Ingestion API connection, is in [Data Streams](/next/data-cloud-cli/data-stream-definition/#create). Salesforce names that stream and its DLO after the connection and event and ignores the proposed names. Creating the connection or its event schema is not covered here.

**Standalone native API read: verified API 68:** The [Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) documents GET, PATCH and DELETE at `/ssot/data-lake-objects/{recordIdOrDeveloperName}` as available since API 60.0. **Live GET/PATCH/DELETE evidence here is API 68 only**, not API 65–67. These are API requests through standard `sf api request rest`, which handles authentication for `SOURCE_ALIAS`; they are not dedicated native CLI DLO commands or plugin support.

The GET is shown in the Read chapter. On November 2, this GET by developer name returned HTTP `200`, `ACTIVE` and **seven fields** for the owned standalone object created in the native API experiment above. Its `Id__c` remained the primary key. Preserve the complete readback, including generated fields, rather than treating it as a create/update body.

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
`cdp_sys_PartitionDate__c` on Engagement DLOs and the key
qualifier of the primary key (`KQ_<Key>__c`, for example `KQ_Id__c`). They stay as
they are, so a hand-written file with only the authored fields deploys onto its
existing DLO. Any other target field that the file omits is refused
(`UNSUPPORTED_DLO_FIELD_CHANGE`). A listed field is compared on the keys the file
states: keys that only the org's copy carries are ignored, and a stated key that
differs is refused. Observed at API 68 through the plugin in one org: a hand-written
DLO file deployed again reported `unchanged`, and with one field added it reported
`updated`; on an Engagement DLO a field was added and a changed event field was
refused with nothing written.

No schema removal or ingestion is qualified.

**Stream-owned DLO updates:** To add a field to a DLO that a stream feeds, update the stream, not the DLO: the native API 68 stream PATCH in [Data Streams](/next/data-cloud-cli/data-stream-definition/#update) maps an existing source field to a new DLO field. Adding a field to the source event schema is not covered here.

**Standalone native API update: verified API 68:** A PATCH on the **owned standalone test DLO** returned HTTP `200` after changing its label and adding one non-key Text field. An independent Connect GET confirmed `ACTIVE`, label `CLI API CRUD updated` and **eight fields**, including new `UpdateNote__c` and all seven original fields. Independent standard API 68 Metadata retrieval saved eight field files and confirmed the changed label, retained `Id__c` with `primaryIndexOrder=1` and `isEnabled=true`. PATCH returned a single DLO object; its HTTP `200` was not used instead of independent readback.

This verifies only this standalone label change and Text-field addition at **API 68**. **No existing primary-key mutation was tested.** It does not qualify field removal, type changes, populated-data behavior, stream-owned direct updates, cross-org replay or ingestion. The API tab and summary's Update rating apply to this bounded workflow, not unrestricted schema editing.

**Standalone native API delete: verified API 68:** **Destructive: use only an explicitly authorized object.** The test deleted only the fresh standalone test DLO created by the native API experiment, not the original retrieval fixture or any shared connection/stream. Immediately before deletion, org identity and the exact ID/name were rechecked against the original create ownership receipts and a fresh GET. A read-only dependency check returned `dependencies=[]`, `totalSize=0`. Run it as `GET /services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll/dependencies`. Empty dependencies alone are not deletion authorization. Stop if identity, ownership, permission or dependency state is unresolved; no cascade was requested.

The corrected request exited `0` and returned HTTP `204`. Independent API 68 GETs by **both ID and exact developer name returned `404`**. A successful API 68 Metadata list had **zero exact-name matches**, and a fresh-directory exact Metadata retrieve explicitly reported the object **cannot be found**. Its top-level retrieve success alone would not establish absence; the missing-object message and failed file entry were inspected. Together these readbacks confirmed completed deletion of this exact owned test object.

A first attempt failed locally with `No mode found in body entry`, before any HTTP receipt. It was not a server refusal or a successful delete. The working request-file form above has an explicitly empty raw body. Identity and GET were rechecked before the corrected request. Do not substitute that failed body serialization or assume a retry is needed after an ambiguous HTTP outcome.

Only this standalone definition/provisioning lifecycle was verified at **API 68**, not API 65–67, arbitrary dependent or stream-owned deletion, cascade behavior, populated-data handling or ingestion. The summary's Delete rating and API tab refer only to the bounded standalone workflow above.

**Metadata definition delete refused:** A Metadata definition delete was refused. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

**Stream-owned DLO deletion:** A DLO that a stream feeds is removed with its stream: the native API 68 stream DELETE with `shouldDeleteDataLakeObject=true`, in [Data Streams](/next/data-cloud-cli/data-stream-definition/#delete). The direct DLO DELETE here was tested only on standalone DLOs.

**Cross-org acceptance:** **November 4 installed cross-org acceptance:** an isolated locally packed plugin retrieved a fresh empty standalone Other/default DLO in `mcnext-sdo`, then created it in `mcnext-thuy` from the exact portable file. Org-local IDs differed; independent raw readbacks preserved generated fields and the primary key. A label change plus one nonprimary Text addition persisted. Repeated deploy returned `unchanged` / `not-attempted`; native-client capture recorded GET only, with no POST/PATCH/DELETE. Both exact owned fixtures were deleted after identity and empty-dependency checks, then independently returned 404 by name and ID. Source delete preview preserved its readback; the target campaign call omitted `--preview` and performed the authorized deletion, so this run does not qualify target delete preview. This is API68 standalone definition portability, not ingestion, populated data, mixed-family dependency deployment, lower-version or published-package qualification.

**Portability:** Tested at API 68 from the plugin's source tree against two orgs, on empty, unmapped custom DLOs in the default data space: retrieval, an unchanged deploy into the second org, and deletion. Files retrieved from a source org and from a second org after an unchanged deploy were byte-identical in that run.

**Standard CLI:** `sf org list metadata --metadata-type CustomObject` lists no DLOs, so take the name from a mapping file or the API; `sf project retrieve start --metadata CustomObject:<name>__dll` then saved the object and its fields at API 68.0 (CLI 2.151.7). On a test DLO deployed as an object without fields, later deploys added fields, but setting the primary-key order on an existing field failed. A `destructiveChanges.xml` deploy naming one DLO field was refused with "setup object in use". Updating a DLO that was created through the API or a stream was not tried with the CLI.

**Not verified:** ingestion and populated data; schema removal; nondefault data spaces; plugin workflows below API 68; cascade behavior; native API versions other than 68; target delete preview across orgs; installed released packages.

</details>