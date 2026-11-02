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
  retrieve: { status: "yes", methods: [cli] }
  create: { status: "unknown", methods: [] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

*Last updated: November 2, 2026, 10:54 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-lake-object-dlo-customobject-dll"></a>

**Data Lake Object (DLO)** — `CustomObject` with the `__dll` suffix.

A DLO holds data brought in from a source, before it is mapped into the data model. It uses `__dll`, not `__dlm`. Its XML describes the lake object, not the whole connection that brings data into it. Bringing data in is **ingestion**; a **connector** supplies the connection, a **stream** controls the incoming data flow, and a **transform** reshapes data.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata CustomObject:McpMappingProbe_20261027__dll --target-org SOURCE_ALIAS --api-version 68.0 --wait 5 --json
```

Replace `SOURCE_ALIAS` with your authenticated source alias and the fixture name with your existing DLO's exact metadata name. Run from the prepared Salesforce project described in the overview; retrieval can overwrite local files.

**Verified requested API 65–68 on test fixture:** on November 2, 2026, four sequential standard Salesforce CLI retrieves of `McpMappingProbe_20261027__dll` in one source org each exited `0`, with `success: true` and `status: Succeeded`. Every run saved nine XML components: one object and eight fields. All nine corresponding files were **byte-for-byte identical**, and parsed XML comparisons also agreed across 65.0, 66.0, 67.0 and 68.0. The explicit requested versions are recorded in the commands; the CLI JSON did **not independently echo an effective API version**.

**Actual differences:** job IDs, response `package.xml` timestamps and absolute local file paths varied. No `package.xml` was emitted to disk. The prepared `sfdx-project.json` differed by configured version; it was an input, not a retrieved component. There were no saved-component differences by version, so the command and sample files are shown only once.

The response identifies the object as `type: CustomObject` and `fullName: McpMappingProbe_20261027__dll` and lists its field files separately. Keep all retrieved attributes, including primary-index and key-qualifier settings. This is definition retrieval, not connector credentials, the whole ingestion setup, row data or runtime processing. It establishes neither cross-org deployability nor CREATE, UPDATE, DELETE or wrapper support.

### Complete saved test-fixture files

These are the complete XML contents saved by the API 68 requested-version run, not abbreviated illustrative XML. The same contents were saved by all four runs. They are a reader sample of this synthetic fixture, not a universal DLO template or a verified creation recipe.

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
{% include operation-tabs.html id="dlo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the lake object and fields, not credentials or the whole ingestion setup." cli_body=retrieve_cli api_state="unknown" api_reason="No API retrieval workflow is supplied here." %}

**Separate wrapper readback (November 2, 2026):** the public `sf-plugin-data` source CLI entry point retrieved this same fixture with requested API `68.0`, selector `dlo:McpMappingProbe_20261027__dll` and an isolated output directory. It exited `0`, reported `success` / `retrieved`, and had empty diagnostic errors, warnings and stderr. Its nine XML files used the same standard decomposed paths and were byte-for-byte identical to the standard API 68 snapshot: zero missing, extra or different files. This is definition-only retrieval, not portable deployment, ID resolution, row export or operational ingestion. Numeric API 65–68 pass-through is implemented and covered by implementation tests, but **only API 68 was live-verified for this wrapper**. The earlier API 65 wrapper refusal predates that implementation change; it is historical, not the current result. This separate observation does not enable the guide's plugin tab or change any CREATE qualification.

## Create

### Standard Metadata CREATE comparison: requested API 65–68

**The unchanged retrieved test schema failed standard creation at all four requested versions.** On November 2, 2026, four sequential standard `sf project deploy start` attempts used four distinct synthetic names independently confirmed absent in the test target org before deployment. These were genuine CREATE attempts, not updates: only the object directory and `.object-meta.xml` filename were renamed from the retrieved fixture; all nine XML file contents remained byte-for-byte identical to the complete samples above. The existing `McpMappingProbe_20261027__dll` was not deployed or changed.

One representative **historical failed deployment command—not a successful creation recipe**:

```sh
sf project deploy start --metadata CustomObject:McpDloCreate68_XJ0GCE__dll --target-org TARGET_ALIAS --api-version 68.0 --test-level NoTestRun --wait 5 --json
```

This is an actual deployment, not a dry run. Each requested version (65.0, 66.0, 67.0 and 68.0) returned CLI exit `1`, terminal `Failed`, `done: true`, `success: false`, `checkOnly: false` and `rollbackOnError: true`. All reported a `CustomField` failure at `<testname>.Id__c`, line `54`, column `13`, in the deployment's combined object file. The generic internal error had the same signature `(-1644920076)` in every run. This location identifies the reported primary-field failure; it does **not establish its underlying cause**.

**Actual differences by run:** the synthetic object names, job IDs, timestamps and individual support error IDs differed. The shared error signature, field location and failed outcome did not differ by requested version. The pins are command evidence, not an independently established effective server version.

Independent exact-name Metadata retrieves after each failure reported that the named object could not be found. No retained new metadata DLO was observed for those four names; this is not a global runtime inventory or universal rollback guarantee. No fields were stripped, no stream was provisioned and no deployment was retried. This bounded result does **not mean all DLO CREATE is unsupported**, and does not qualify an operational ingestion chain. Do not remove primary-key or system qualifier fields to make a deployment pass.

### Distinct API ingestion-chain observation

We did create a new, owned Ingestion API connection without external credentials, add a one-event schema with two Text fields, and create its stream and DLO. This used the **API 67 `/ssot/mcp/execute` facade through vanilla `sf api request rest`**, with operations `d360_connection_create_ingestion_api`, `d360_connection_schema_put_ingestion_api` and `d360_datastream_create_ingestion_api`—not native CLI DLO commands or native CRUD parity.

Separate connection, schema, stream and DLO reads confirmed `CONNECTED`, then stream/DLO `ACTIVE`. The tested configuration was one event, category `Other`, default dataspace, a Text primary key and `UPSERT`. Salesforce generated the returned stream/DLO names rather than using the proposed names literally. Use those returned identities. Persisted DLO fields had `__c` suffixes while embedded stream mappings used unsuffixed fields; the embedded definition ID was not the persisted DLO ID.

The DLO had six fields: the two source fields and four generated key-qualifier/system fields. The custom key-qualifier designation list was empty, so this does not establish preservation of nonempty custom qualifiers. Initial processing happened automatically, with zero records and no explicit ingestion or refresh request. This is a narrow source-only result, not a portable recipe for every connector or category.

### Documented ingestion creation contract

The October 29 contract discovery documents a specialized connection → complete event schema → ingestion stream route. Its stream operation requires `connectionName`, `event` and `streamName`; for a new DLO, the description additionally requires `category`, `dloName`, `dloLabel` and the primary key's field name, label and data type. Select the primary key explicitly from the existing event schema; do not infer it from field order or an Id-like name. New-DLO inputs and `existingDloName` are alternatives, not inputs to combine. Read the complete connection schema before a schema PUT and preserve every existing object and field.

This is a **documented contract, not a qualified safe public CREATE workflow**. Discovery did not establish duplicate-create safety, complete absence checks, cross-org identity correlation or processing completion guarantees. The discovery provider and underlying API versions were not supplied; the API 67 facade used in the earlier observation does not version these contracts. Direct `d360_dlo_create` discovery does not establish an equivalent source-backed connection/schema/stream setup, and generic stream payloads are not interchangeable with the specialized ingestion inputs. No native HTTP CREATE payload is inferred here. Separately, the [native stream reference discussion](/next/data-cloud-cli/data-stream-definition/#documented-native-stream-api-availability) now identifies documented POST availability since 60.0 in the API 67 reference, its required top-level inputs and `INGEST_API` type. Native new-DLO and existing-DLO inputs are alternatives; for ingestion, `dataLakeFieldInputRepresentations` contains **only the primary key field**. That rule is not an instruction to truncate the complete connection schema. The extracted reference's S3-only `200`/`PROCESSING` example and unresolved nested ingestion input shapes do not qualify native ingestion creation, event binding or settled success. Duplicate/nonoverwrite safety, authoritative absence and restart-safe settlement remain unknown.

Salesforce's [Ingestion API stream setup guide](https://developer.salesforce.com/docs/data/data-cloud-int/guide/c360-a-create-ingestion-data-stream.md) separately describes selecting an existing connector and uploaded schema, choosing a primary key/category and configuring refresh mode. That UI guidance does not qualify a CLI/API creation recipe. The unknown CREATE rating therefore remains unchanged.

{% include operation-tabs.html id="dlo-create" label="Create" cli_state="blocked" cli_reason="The unchanged retrieved test schema failed standard CREATE at requested API 65–68; this is fixture-specific, not universal unsupported CREATE." api_state="unknown" api_reason="The owned ingestion-chain result is observational, not a supplied portable creation recipe." %}

## Update

We tried adding a Text field directly with `d360_dlo_update`. It failed because this DLO belonged to a stream: Salesforce required field addition through the Data Stream API. The facade returned HTTP `201` and CLI exit `0` with a nested error; an independent read confirmed the original six fields were unchanged.

The successful route was to read the complete owned connection schema, retain both original source fields and add one Text field with `d360_connection_schema_put_ingestion_api`, then invoke `d360_datastream_patch_ingestion_api` with the exact returned stream identity and `syncSchema: true`. These are the same API 67 facade operations called through vanilla `sf api request rest`, not Metadata API updates. The stream entered `PROCESSING`, and separate stream/DLO reads reached `ACTIVE` with seven persisted fields.

The comparison preserved all six original field definitions, including primary-key, generated qualifier and system settings, plus source bindings, original mappings/formulas and refresh configuration. Only the new Text field and its source mapping were added. Custom qualifier lists remained empty. This does not establish arbitrary field removal, type changes, direct DLO updates, nonempty custom qualifier preservation or cross-org replay. Shared connections were not changed.

A separate existing-target check confirmed the same bounded update: exactly one complete connection-schema PUT and one owning-stream schema sync added one Text field. Independent reads reached stream/DLO `ACTIVE` and preserved the full original configuration. Later read-only comparisons confirmed the three source Text fields and all seven persisted fields, including their original key/system settings, mappings and refresh configuration, with no further mutation or processing job. The successful update was **not repeated** to obtain those comparisons.

Persisted DLO reads can also include a last-refresh timestamp and a numeric record count. These are runtime observations, not schema changes or proof of a new ingestion run; in this check the count was zero. Compare the complete configuration separately from those observations and verify `ACTIVE` independently. This remains one existing-target Text-field addition in the source org—not proof of portable creation, completed deletion, populated-data behavior or cross-org deployment.

{% include operation-tabs.html id="dlo-update" label="Update" cli_state="unknown" cli_reason="No Metadata API update workflow is supplied." api_state="unknown" api_reason="Direct DLO field addition failed; owning-connection and stream updates are observations, not a supplied recipe." %}

## Delete

For the new owned ingestion chain, one owning-stream delete with `shouldDeleteDataLakeObject: true` was accepted, but separate stream and DLO reads still showed `DELETING` at the last check. The connection remained `CONNECTED` and its schema in use. This is not completed cleanup or a verified full lifecycle; do not repeat the delete or remove generated objects yourself while it is pending.

**October 30 readback limit:** the retained owned source connection and schema were still readable, but the earlier stream had been `DELETING` and all stream-control inventories in this check were empty. This does not independently correlate a settled stream/DLO lifecycle or establish absence. The result remains **unknown**, not unsupported, and adds no new creation, update or completed-deletion proof. Do not use an empty inventory to justify recreating the chain or deleting its connection.

There is no verified completed standard delete recipe here. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

{% include operation-tabs.html id="dlo-delete" label="Delete" cli_state="blocked" cli_reason="The definition delete was refused because its still-existing DLO instance referenced it." api_state="unknown" api_reason="The accepted owning-stream delete remained DELETING; no completed API cleanup recipe is verified." %}
