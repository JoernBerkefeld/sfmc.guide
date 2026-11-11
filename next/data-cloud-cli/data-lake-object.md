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
  retrieve: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "yes", methods: [api, plugin] }
  update: { status: "yes", methods: [api, plugin] }
  delete: { status: "yes", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-lake-object-dlo-customobject-dll"></a>

**Data Lake Object (DLO)** — `CustomObject` with the `__dll` suffix.

A DLO holds data brought in from a source, before it is mapped into the data model. It uses `__dll`, not `__dlm`. Its XML describes the lake object, not the whole connection that brings data into it. Bringing data in is **ingestion**; a **connector** supplies the connection, a **stream** controls the incoming data flow, and a **transform** reshapes data.

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-lake-objects`
(and its item routes) belongs to the **Data 360 Connect REST API**, as listed in the
[Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec).
The native API and plugin examples use this family through authenticated
`sf api request rest`; they do **not** use the SOAP-based Metadata API. The XML
`sf project` workflows in the CLI sections use Metadata API instead. Calling either
API through Salesforce CLI does not make it a dedicated out-of-the-box DLO command
or broaden the operation/version qualification recorded below.

{% include crud-summary.html %}

{% capture retrieve_plugin %}
```sh
sf data360 retrieve -m dlo:CustomerSource__dll -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project
```

Saves `./project/data360/dlo/CustomerSource__dll.dlo-meta.json`, excluding source
IDs/runtime wrappers and only the confirmed system-generated `KQ_Id__c` field
definition. A key qualifier combines an ID with its source context to avoid
collisions. Native CREATE generates this definition and additive PATCH preserves
it, so omission from saved JSON is not field deletion or proof of mapping auto-pair
behavior. `Id__c`, other fields, custom qualifiers and `keyQualifierName` references
remain unchanged; the raw API response remains complete. API68 evidence showed
seven raw fields → six saved after CREATE and eight raw → seven saved after PATCH;
DLO Metadata identifies the qualifier with `definitionCreationType=System` and
`usageTag=KEY_QUALIFIER`. This separate empirical evidence is not new live plugin
acceptance. **Optional structured output (`--json`):** the JSON envelope has contract `sf-data360-retrieve`;
`result.items[]` reports `family: "dlo"`, `operation: "retrieve"`,
`outcome: "retrieved"` (or `"unchanged"`) and `path`.
{% endcapture %}
{% capture create_plugin %}
```sh
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

Confirmed target-name absence selects POST with authored fields only. Preview
reports `outcome: "create"`, `target: "absent"`, `absenceProof: "confirmed-404"`.
Execution reports `outcome: "created"`, `mutation: "confirmed-created"`. Other
lookup failures stop without creation. This is standalone Other/default creation.
{% endcapture %}
{% capture update_plugin %}
```sh
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

An existing exact name selects PATCH of the resolved target ID. Only label changes
and nonprimary Text-field additions are admitted. Preview reports `outcome: "update"`;
execution reports `outcome: "updated"`, `mutation: "confirmed-updated"`. Existing
field/primary-key edits stop. An equal label and preserved field inventory report
`outcome: "unchanged"`; execution reports `mutation: "not-attempted"` and sends no
POST or PATCH. Field ordering does not trigger a write, and the saved omission of
ordinary generated `KQ_Id__c` does not count as removing that target field.
No schema removal or ingestion is qualified.
{% endcapture %}
{% capture delete_plugin %}
```sh
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

**The second command deletes immediately without confirmation.** Preview reports
`outcome: "delete"`, `mutation: "not-attempted"`; execution reports `"deleted"` /
`"confirmed-deleted"`. Confirmed absence reports `"unchanged"` /
`"not-attempted"`. Only the resolved DLO target is deleted; no cascade or local-file
removal. Unknown writes stop without retry. Contract: `sf-data360-delete`.
{% endcapture %}

### Why use a native API plugin workflow?

Standard `sf project retrieve start` successfully retrieved this DLO definition at
requested API versions 65–68; the saved XML was identical. The reason to choose a
native API workflow is **not** missing Metadata retrieval support: replaying a
complete retrieved definition encountered the primary-key and key-qualifier
failures described below. Separate API 68 experiments completed a standalone DLO
lifecycle, with the service creating the primary key, qualifier and system fields.
Neither result establishes unrestricted Metadata support or ingestion readiness.

The plugin still delegates authenticated requests to `sf api request rest`, so
standard Salesforce CLI authentication remains in use. Its benefit beyond a
redundant command wrapper is a manifest-free workflow with canonical
`data360/dlo/<FullApiName>__dll.dlo-meta.json`, portable JSON without the source
record ID, separate save/create/update field policies, and target-name lookup
selecting PATCH for an existing target or POST only after confirmed absence. This
avoids handcrafting each API request or blindly replaying generated response fields.
Plugin command acceptance is distinct from the historical API experiments below.

### Direct creation for a transform output

Direct DLO creation has a demonstrated use as a **precreated transform output**,
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

### Native API minimum and plugin qualification

The separately completed native CRUD matrix establishes **API 61 as the minimum
live-tested successful version**: API 60 returned `404` for all four CRUD operations;
API 61–68 completed their bounded standalone lifecycles. The reference's documented
API 60 availability and the observed API 61 minimum are different claims. Versions
below API 60 were not tested. The plugin currently admits **API 68/default only**;
manual matrix success does not broaden its implementation guard.

The November 2 public plugin acceptance created a fresh standalone DLO through
automatic POST after confirmed absence, retrieved seven raw readback fields, previewed
and executed a label change plus ordinary Text-field addition, then independently
retrieved all eight raw fields with the original primary key intact. These are
historical complete readback counts, not current saved-file counts. Delete preview
left readback unchanged; default delete completed without a prompt, subsequent
preview reported absence, and the local JSON file remained. This proves the bounded
API68 definition workflow, not ingestion or cross-org portability.

**November 4 installed cross-org acceptance:** an isolated locally packed plugin
retrieved a fresh empty standalone Other/default DLO in `mcnext-sdo`, then created
it in `mcnext-thuy` from the exact portable file. Org-local IDs differed; independent
raw readbacks preserved generated fields and the primary key. A label change plus
one nonprimary Text addition persisted. Repeated deploy returned `unchanged` /
`not-attempted`; native-client capture recorded GET only, with no POST/PATCH/DELETE.
Both exact owned fixtures were deleted after identity and empty-dependency checks,
then independently returned 404 by name and ID. Source delete preview preserved
its readback; the target campaign call omitted `--preview` and performed the
authorized deletion, so this run does not qualify target delete preview. This is
API68 standalone definition portability, not ingestion, populated data, mixed-family
dependency deployment, lower-version or published-package qualification.

### Plugin command and saved-file contract

**Documentation update: November 3, 2026; no new live check.** Native commands now
accept optional `--dataspace NAME` (alias `--data-space`). The flag has no CLI
default; use only one spelling. DLO CREATE still requires `dataspaceInfo`, derived
from the validated saved identity even when the flag is omitted. An explicit scope
must be an actual DLO membership and agree with the saved definition and fresh
target checks. No new DLO URL filter or update-body scope is implied. See the
[shared scope and readable-output rules](/next/data-cloud-cli/#native-plugin-scope-and-readable-results).
Nondefault-space lifecycle behavior is not live-qualified by the default-space
acceptance below. Readable retrieval counts successful DLO results, including
unchanged files, not API `totalSize`; JSON output is unchanged.

The replacement workflow uses exact `dlo:CustomerSource__dll` selections with
API `68.0` and the default data space. A full API name includes `__dll`; it is not
the source object's record ID. The commands below were exercised through the public plugin on a fresh owned
standalone fixture at API68/default on November 2. Separate readbacks confirmed
seven raw fields after creation, eight raw fields after the label/field update,
preservation after delete preview, and absence after default deletion; the local
JSON remained. Those historical readback counts are not current saved-file counts.

```sh
sf data360 retrieve -m dlo:CustomerSource__dll -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 delete -m dlo:CustomerSource__dll -o TARGET_ALIAS --api-version 68.0
```

Retrieve saves `./project/data360/dlo/CustomerSource__dll.dlo-meta.json`. The file
contains a versioned `dlo` definition with logical `identity` and `spec`; the spec
contains the label, category and field definitions except the confirmed generated
`KQ_Id__c` definition. It does not save the source DLO record ID, timestamps, runtime
state or duplicate response envelopes. The six-field example below applies the
current save policy to the historical public-command readback, with the synthetic
fixture name substituted; it is not a newly live-accepted saved file or an HTTP
CREATE request:

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
      { "dataType": "Text", "isPrimaryKey": false, "label": "Note", "name": "Note__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "cdp_sys_SourceVersion", "name": "cdp_sys_SourceVersion__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Data Source", "name": "DataSource__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Data Source Object", "name": "DataSourceObject__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Internal Organization", "name": "InternalOrganization__c" }
    ]
  }
}
```

Other generated system fields remain in this saved inventory; only the confirmed
generated qualifier definition is omitted. Generated fields are not CREATE payloads.
Changed existing output needs `--overwrite`; identical output is unchanged.

Deploy resolves the exact API name in the target before selecting POST or PATCH.
Only confirmed absence permits POST; permission/authentication errors and ambiguous
responses stop. UPDATE preserves existing fields and primary-key configuration,
with only qualified label changes and ordinary field additions. It is not a
schema-replacement operation or proof of cross-org ingestion portability.

**Deletion executes by default, without a separate confirmation prompt.** It
resolves and deletes only the selected target ID. There is no cascade, related
stream/source/DMO deletion or local-file deletion. Both deploy and delete provide
explicit `--preview` for read-only target comparison/reporting with zero mutations;
preview is never the default. Unknown write outcomes stop without automatic retry
or rollback; inspect the actual target before trying again.

### Public-command acceptance and saved example

On November 2, the implemented public plugin commands created a fresh owned
standalone API68/default fixture, retrieved its canonical JSON, and selected an
existing-target update after a read-only preview. The create result reported
`outcome: created`, `mutation: confirmed-created`, with preflight
`target: absent`, `absenceProof: confirmed-404`; the subsequent update reported
`outcome: updated`, `mutation: confirmed-updated`, with `target: existing`.
These are request outcomes, not a claim that the response alone proves settlement.

The historical complete create readback had seven raw fields. This six-field
portable example applies the current save policy, omitting only generated
`KQ_Id__c` and the source record ID (synthetic name retained); it is not a new live
plugin acceptance result:

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
      { "dataType": "Text", "isPrimaryKey": false, "label": "Note", "name": "Note__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "cdp_sys_SourceVersion", "name": "cdp_sys_SourceVersion__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Data Source", "name": "DataSource__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Data Source Object", "name": "DataSourceObject__c" },
      { "dataType": "Text", "isPrimaryKey": false, "label": "Internal Organization", "name": "InternalOrganization__c" }
    ]
  }
}
```

### Accepted requests and asynchronous completion

A successful request is not necessarily a completed operation. The retained native
DLO experiments observed POST HTTP `201` with `PROCESSING`, then independent GET
`ACTIVE`; PATCH HTTP `200` with `PROCESSING`, then GET `ACTIVE` (API 67 needed two
reads); and DELETE HTTP `204`, followed by a brief GET HTTP `200` with `DELETING`
before exact-name GET returned `404` (notably APIs 64 and 67). These are short
asynchronous transitions, not failed writes to repeat automatically.

After a write, use bounded, independent read-only polling for the exact identity:
confirm `ACTIVE` and the intended complete field/key state after create/update,
and confirmed absence after delete. Stop at the chosen attempt/time limit and
report pending or unknown rather than declaring completion, retrying a write or
cascading cleanup. Plugin `created`, `updated` and `deleted` report accepted or
confirmed request outcomes; they do not replace an independent terminal-state
check. Keep the retrieved local definition when deletion is still settling.

This differs from the DMO API contract warning that PATCH may return the
pre-update representation: the DLO observation here is an explicit `PROCESSING`
response followed by independent settlement. Do not substitute one product's
response contract for the other's.

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** `sf project` retrieves the `CustomObject` and `CustomField`
definitions; this is separate from the native Connect REST JSON route.

```sh
sf project retrieve start --metadata CustomObject:McpMappingProbe_20261027__dll --target-org SOURCE_ALIAS --api-version 68.0 --wait 5
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
{% capture retrieve_api %}
### Standalone native API read: verified API 68

The [Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) documents GET, PATCH and DELETE at `/ssot/data-lake-objects/{recordIdOrDeveloperName}` as available since API 60.0. **Live GET/PATCH/DELETE evidence here is API 68 only**, not API 65–67. These are API requests through standard `sf api request rest`, which handles authentication for `SOURCE_ALIAS`; they are not dedicated native CLI DLO commands or plugin support.

```sh
sf api request rest /services/data/v68.0/ssot/data-lake-objects/StandaloneKeyProbe__dll --target-org SOURCE_ALIAS --method GET --include
```

Replace the sanitized developer name with the exact returned name of your DLO. On November 2, this GET by developer name returned HTTP `200`, `ACTIVE` and **seven fields** for the owned standalone object created in the native API experiment below. Its `Id__c` remained the primary key. Preserve the complete readback, including generated fields, rather than treating it as a create/update body.

**Response shapes differ:** the GET body contains a `dataLakeObjects` array, even for this exact-name read; identify the exact returned object and retain its ID. The successful POST and PATCH bodies contain a **single DLO object**, not that array. HTTP headers shown by `--include` are separate from the JSON body. This is a definition/configuration read, not row export or proof of ingestion.
{% endcapture %}
{% include operation-tabs.html id="dlo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the lake object and fields, not credentials or the whole ingestion setup." cli_body=retrieve_cli api_state="available" api_reason="Exact-name standalone GET verified at API 68; not row ingestion." api_body=retrieve_api plugin_state="available" plugin_reason="Native API68/default portable JSON retrieval passed public-command acceptance." plugin_body=retrieve_plugin %}

**Separate wrapper readback (November 2, 2026):** the public `sf-plugin-data` source CLI entry point retrieved this same fixture with requested API `68.0`, selector `dlo:McpMappingProbe_20261027__dll` and an isolated output directory. It exited `0`, reported `success` / `retrieved`, and had empty diagnostic errors, warnings and stderr. Its nine XML files used the same standard decomposed paths and were byte-for-byte identical to the standard API 68 snapshot: zero missing, extra or different files. This is definition-only retrieval, not portable deployment, ID resolution, row export or operational ingestion. Numeric API 65–68 pass-through is implemented and covered by implementation tests, but **only API 68 was live-verified for this wrapper**. The earlier API 65 wrapper refusal predates that implementation change; it is historical, not the current result. This separate observation does not enable the guide's plugin tab or change any CREATE qualification.

## Create

{% capture create_evidence %}
### Standard Metadata CREATE comparison: requested API 65–68

**The unchanged retrieved test schema failed standard creation at all four requested versions.** On November 2, 2026, four sequential standard `sf project deploy start` attempts used four distinct synthetic names independently confirmed absent in the test target org before deployment. These were genuine CREATE attempts, not updates: only the object directory and `.object-meta.xml` filename were renamed from the retrieved fixture; all nine XML file contents remained byte-for-byte identical to the complete samples above. The existing `McpMappingProbe_20261027__dll` was not deployed or changed.

One representative **historical failed deployment command—not a successful creation recipe**:

```sh
sf project deploy start --metadata CustomObject:McpDloCreate68_XJ0GCE__dll --target-org TARGET_ALIAS --api-version 68.0 --test-level NoTestRun --wait 5
```

This is an actual deployment, not a dry run. Each requested version (65.0, 66.0, 67.0 and 68.0) returned CLI exit `1`, terminal `Failed`, `done: true`, `success: false`, `checkOnly: false` and `rollbackOnError: true`. All reported a `CustomField` failure at `<testname>.Id__c`, line `54`, column `13`, in the deployment's combined object file. The generic internal error had the same signature `(-1644920076)` in every run. This location identifies the reported primary-field failure; it does **not establish its underlying cause**.

**Actual differences by run:** the synthetic object names, job IDs, timestamps and individual support error IDs differed. The shared error signature, field location and failed outcome did not differ by requested version. The pins are command evidence, not an independently established effective server version.

Independent exact-name Metadata retrieves after each failure reported that the named object could not be found. No retained new metadata DLO was observed for those four names; this is not a global runtime inventory or universal rollback guarantee. No fields were stripped, no stream was provisioned and no deployment was retried. This bounded result does **not mean all DLO CREATE is unsupported**, and does not qualify an operational ingestion chain. Do not treat removal of primary-key or system qualifier metadata as a verified equivalent creation recipe.

### Later controlled Metadata experiments: API 68 only

These November 2 experiments used standard `CustomObject` and `CustomField` deployment, not a plugin or an ingestion API. They are separate from the unchanged-schema API 65–68 comparison above; none of the following variants was tested at API 65–67. Use fresh, independently absent synthetic names and isolated projects, not a shared DLO. The commands below are retained experiment shapes with aliases and names replaced, not an operational ingestion recipe.

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

### Native standalone DLO creation: verified API 68 experiment

On November 2, a direct Connect REST `POST /services/data/v68.0/ssot/data-lake-objects` in the source org created a fresh standalone DLO in the independently verified active `default` dataspace. This is a distinct native route from Metadata XML deployment and from connection → schema → stream creation below. **Only API 68 was tested for this request**, not API 65–67 or cross-org replay.

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

The object read back with `isEnabled=true`; Connect category `Other` corresponded to Metadata `Salesforce_SFDCReferenceModel_0_93.Related`. **No stream, connector or Data Kit was created by this experiment.** The result establishes this bounded standalone creation, key designation, generated fields and settled readback—not row ingestion, processing of source data, duplicate-create safety, a complete operational ingestion chain or general CRUD portability. The historical Metadata deployment failures above remain valid results for their different inputs/routes. The general CREATE rating and disabled API tab remain unchanged pending a qualified reusable workflow.

`MktDataLakeObject` is a Data360 concept, not evidence of MCN-only scope; the official AnalyticsWorkspace reference also names it. A file-based deployment warning about named setup metadata types does not by itself settle the separately observed `CustomObject`/`CustomField` behavior. Data Kit packaging is a separate concern, not a condition used to reject these experiments.

### Distinct API ingestion-chain observation

We did create a new, owned Ingestion API connection without external credentials, add a one-event schema with two Text fields, and create its stream and DLO. This used the **API 67 `/ssot/mcp/execute` facade through vanilla `sf api request rest`**, with operations `d360_connection_create_ingestion_api`, `d360_connection_schema_put_ingestion_api` and `d360_datastream_create_ingestion_api`—not native CLI DLO commands or native CRUD parity.

Separate connection, schema, stream and DLO reads confirmed `CONNECTED`, then stream/DLO `ACTIVE`. The tested configuration was one event, category `Other`, default dataspace, a Text primary key and `UPSERT`. Salesforce generated the returned stream/DLO names rather than using the proposed names literally. Use those returned identities. Persisted DLO fields had `__c` suffixes while embedded stream mappings used unsuffixed fields; the embedded definition ID was not the persisted DLO ID.

The DLO had six fields: the two source fields and four generated key-qualifier/system fields. The custom key-qualifier designation list was empty, so this does not establish preservation of nonempty custom qualifiers. Initial processing happened automatically, with zero records and no explicit ingestion or refresh request. This is a narrow source-only result, not a portable recipe for every connector or category.

### Documented ingestion creation contract

The October 29 contract discovery documents a specialized connection → complete event schema → ingestion stream route. Its stream operation requires `connectionName`, `event` and `streamName`; for a new DLO, the description additionally requires `category`, `dloName`, `dloLabel` and the primary key's field name, label and data type. Select the primary key explicitly from the existing event schema; do not infer it from field order or an Id-like name. New-DLO inputs and `existingDloName` are alternatives, not inputs to combine. Read the complete connection schema before a schema PUT and preserve every existing object and field.

This is a **documented contract, not a qualified safe public CREATE workflow**. Discovery did not establish duplicate-create safety, complete absence checks, cross-org identity correlation or processing completion guarantees. The discovery provider and underlying API versions were not supplied; the API 67 facade used in the earlier observation does not version these contracts. Direct `d360_dlo_create` discovery does not establish an equivalent source-backed connection/schema/stream setup, and generic stream payloads are not interchangeable with the specialized ingestion inputs. No native HTTP CREATE payload is inferred here. Separately, the [native stream reference discussion](/next/data-cloud-cli/data-stream-definition/#documented-native-stream-api-availability) now identifies documented POST availability since 60.0 in the API 67 reference, its required top-level inputs and `INGEST_API` type. Native new-DLO and existing-DLO inputs are alternatives; for ingestion, `dataLakeFieldInputRepresentations` contains **only the primary key field**. That rule is not an instruction to truncate the complete connection schema. The extracted reference's S3-only `200`/`PROCESSING` example and unresolved nested ingestion input shapes do not qualify native ingestion creation, event binding or settled success. Duplicate/nonoverwrite safety, authoritative absence and restart-safe settlement remain unknown.

Salesforce's [Ingestion API stream setup guide](https://developer.salesforce.com/docs/data/data-cloud-int/guide/c360-a-create-ingestion-data-stream.md) separately describes selecting an existing connector and uploaded schema, choosing a primary key/category and configuring refresh mode. That UI guidance does not qualify a CLI/API creation recipe. The unknown CREATE rating therefore remains unchanged.

{% endcapture %}
{% include operation-tabs.html id="dlo-create" label="Create" cli_state="blocked" cli_reason="The unchanged retrieved test schema failed standard CREATE at requested API 65–68; this is fixture-specific, not universal unsupported CREATE." api_state="unknown" api_reason="The manual standalone native creation payload is documented below; the earlier ingestion-chain result remains inconclusive." plugin_state="available" plugin_reason="Confirmed-404 native API68 standalone create passed public-command acceptance." plugin_body=create_plugin %}

{{ create_evidence | markdownify }}

## Update

{% capture update_api %}
We tried adding a Text field directly with `d360_dlo_update`. It failed because this DLO belonged to a stream: Salesforce required field addition through the Data Stream API. The facade returned HTTP `201` and CLI exit `0` with a nested error; an independent read confirmed the original six fields were unchanged.

The successful route was to read the complete owned connection schema, retain both original source fields and add one Text field with `d360_connection_schema_put_ingestion_api`, then invoke `d360_datastream_patch_ingestion_api` with the exact returned stream identity and `syncSchema: true`. These are the same API 67 facade operations called through vanilla `sf api request rest`, not Metadata API updates. The stream entered `PROCESSING`, and separate stream/DLO reads reached `ACTIVE` with seven persisted fields.

The comparison preserved all six original field definitions, including primary-key, generated qualifier and system settings, plus source bindings, original mappings/formulas and refresh configuration. Only the new Text field and its source mapping were added. Custom qualifier lists remained empty. This does not establish arbitrary field removal, type changes, direct DLO updates, nonempty custom qualifier preservation or cross-org replay. Shared connections were not changed.

A separate existing-target check confirmed the same bounded update: exactly one complete connection-schema PUT and one owning-stream schema sync added one Text field. Independent reads reached stream/DLO `ACTIVE` and preserved the full original configuration. Later read-only comparisons confirmed the three source Text fields and all seven persisted fields, including their original key/system settings, mappings and refresh configuration, with no further mutation or processing job. The successful update was **not repeated** to obtain those comparisons.

Persisted DLO reads can also include a last-refresh timestamp and a numeric record count. These are runtime observations, not schema changes or proof of a new ingestion run; in this check the count was zero. Compare the complete configuration separately from those observations and verify `ACTIVE` independently. This remains one existing-target Text-field addition in the source org—not proof of portable creation, completed deletion, populated-data behavior or cross-org deployment.

### Standalone native API update: verified API 68

The stream-owned restriction above does not describe every DLO. A separate PATCH on the **owned standalone test DLO** returned HTTP `200` after changing its label and adding one non-key Text field. Save this exact body as `dlo-patch.json`:

```json
{
  "label": "CLI API CRUD updated",
  "dataLakeFieldInputRepresentations": [
    { "name": "UpdateNote", "label": "Update Note", "dataType": "Text", "isPrimaryKey": false }
  ]
}
```

```sh
sf api request rest /services/data/v68.0/ssot/data-lake-objects/OWNED_DLO_ID --target-org SOURCE_ALIAS --method PATCH --include --body @dlo-patch.json --header Content-Type:application/json
```

Replace `OWNED_DLO_ID` with the exact ID returned by the preceding read, after verifying org identity and permission to change this object. This is a real write. Submit the intended addition, not the generated-field retrieve inventory; the experiment did not replace the existing field set.

An independent Connect GET confirmed `ACTIVE`, label `CLI API CRUD updated` and **eight fields**, including new `UpdateNote__c` and all seven original fields. Independent standard API 68 Metadata retrieval saved eight field files and confirmed the changed label, retained `Id__c` with `primaryIndexOrder=1` and `isEnabled=true`. PATCH returned a single DLO object; its HTTP `200` was not used instead of independent readback.

This verifies only this standalone label change and Text-field addition at **API 68**. **No existing primary-key mutation was tested.** It does not qualify field removal, type changes, populated-data behavior, stream-owned direct updates, cross-org replay or ingestion. The API tab and summary's Update rating apply to this bounded workflow, not unrestricted schema editing.
{% endcapture %}
{% include operation-tabs.html id="dlo-update" label="Update" cli_state="unknown" cli_reason="No Metadata API update workflow is supplied." api_state="available" api_reason="Standalone label change and non-key Text-field addition verified at API 68; stream-owned restrictions remain." api_body=update_api plugin_state="available" plugin_reason="Native API68 label and ordinary-field addition passed public-command readback; existing field edits remain blocked." plugin_body=update_plugin %}

## Delete

{% capture delete_api %}
For the new owned ingestion chain, one owning-stream delete with `shouldDeleteDataLakeObject: true` was accepted, but separate stream and DLO reads still showed `DELETING` at the last check. The connection remained `CONNECTED` and its schema in use. This is not completed cleanup or a verified full lifecycle; do not repeat the delete or remove generated objects yourself while it is pending.

**October 30 readback limit:** the retained owned source connection and schema were still readable, but the earlier stream had been `DELETING` and all stream-control inventories in this check were empty. This does not independently correlate a settled stream/DLO lifecycle or establish absence. The result remains **unknown**, not unsupported, and adds no new creation, update or completed-deletion proof. Do not use an empty inventory to justify recreating the chain or deleting its connection.

The historical Metadata definition-delete route below was refused; it is separate from the completed standalone native API deletion documented in the API tab. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

### Standalone native API delete: verified API 68

**Destructive: use only an explicitly authorized object.** The November 2 experiment deleted only the fresh standalone test DLO created by that experiment, not the original retrieval fixture or any shared connection/stream. Immediately before deletion, org identity and the exact ID/name were rechecked against the original create ownership receipts and a fresh GET. A read-only dependency check returned `dependencies=[]`, `totalSize=0`; this check used the API 67 `d360_dlo_dependencies_list` facade and is not direct API 68 CRUD evidence. Empty dependencies alone are not deletion authorization. Stop if identity, ownership, permission or dependency state is unresolved; no cascade was requested.

Save the following request as `dlo-delete-request.json`, replacing `OWNED_DLO_ID` with that exact verified ID:

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

This is the **working request-file form**, with an explicitly empty raw body. An earlier invocation failed locally with `No mode found in body entry`, before any HTTP receipt; it was not a server refusal or a successful delete. Identity and GET were rechecked before the corrected request. Do not substitute that failed body serialization or assume a retry is needed after an ambiguous HTTP outcome.

The corrected command exited `0` and returned HTTP `204`. Independent API 68 GETs by **both ID and exact developer name returned `404`**. A successful API 68 Metadata list had **zero exact-name matches**, and a fresh-directory exact Metadata retrieve explicitly reported the object **cannot be found**. Its top-level retrieve success alone would not establish absence; the missing-object message and failed file entry were inspected. Together these readbacks confirmed completed deletion of this exact owned test object.

Only this standalone definition/provisioning lifecycle was verified at **API 68**, not API 65–67, arbitrary dependent or stream-owned deletion, cascade behavior, populated-data handling or ingestion. The earlier owning-stream `DELETING` observation remains unresolved and is not promoted by this separate result. The summary's Delete rating and API tab refer only to the bounded standalone workflow above.
{% endcapture %}
{% include operation-tabs.html id="dlo-delete" label="Delete" cli_state="blocked" cli_reason="The Metadata definition delete was refused because its still-existing DLO instance referenced it." api_state="available" api_reason="Exact owned standalone ID deletion completed and absence independently verified at API 68; not stream cleanup." api_body=delete_api plugin_state="available" plugin_reason="Default exact-target deletion and read-only preview passed API68 public-command acceptance; not cascade or stream cleanup." plugin_body=delete_plugin %}
