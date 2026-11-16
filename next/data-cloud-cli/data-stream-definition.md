---
layout: page
title: "Data Streams"
description: "Data Stream ingestion, source-to-DLO mappings, saved definitions and qualified native API and plugin limits."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-stream-definition/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "partial", methods: [cli, api, plugin] }
  create: { status: "partial", methods: [api, plugin] }
  update: { status: "partial", methods: [api, plugin] }
  delete: { status: "partial", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Read its setup and placeholder notes before you run these examples.

<a id="data-stream-configuration-datastreamdefinition"></a>

**Data Stream** brings data from a source into a [Data Lake Object (DLO)](/next/data-cloud-cli/data-lake-object/). Its saved XML definition is a `DataStreamDefinition`. A stream maps source fields into DLO fields. A separate [DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/) connects the DLO to a Data Model Object.

**Example used in every chapter:** `CustomerStream`, the stream that feeds the DLO `CustomerSource__dll`. Each method below works on this same stream.

{% include crud-summary.html %}

**Plugin qualification:** The plugin works for Ingestion API streams (any DLO category, any source field type, formula fields, one stream per event and several per connection) at API 68.0 (`--api-version auto` or `68.0`) in the default data space, with a compatible existing connection, and for Salesforce CRM streams (connector `SalesforceDotCom`, for example `Account_Home`) at the same version and data space. It selects a stream with `-m data-stream:ApiName` or with the saved file; a non-default `--dataspace` or other API version is blocked (`UNSUPPORTED_STREAM_DATASPACE`). Most of the plugin workflow is offline-tested; the Evidence section says which steps were also observed live.

## Read

<p>The plugin’s implemented exact-name selector is <code>data-stream:API_NAME</code>.</p>


{% capture read_cli %}
Retrieves the stream's XML definition. The command does not start a refresh, and it does not set up ingestion.

```sh
sf project retrieve start --metadata DataStreamDefinition:CustomerStream --target-org SOURCE_ALIAS
```

The file is `force-app/main/default/dataStreamDefinitions/CustomerStream.dataStreamDefinition-meta.xml`. This excerpt shows its shape. Other attributes are left out.

```xml
<DataStreamDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataConnector>SalesforceConnector</dataConnector>
  <dataConnectorType>SalesforceDotCom</dataConnectorType>
  <dataExtractMethods>FULL_REFRESH</dataExtractMethods>
  <dataSource>SalesforceSource</dataSource>
  <mktDataLakeObject>CustomerSource__dll</mktDataLakeObject>
  <mktDataTranObject>CustomerTransform</mktDataTranObject>
  <!-- Other retrieved attributes omitted. -->
</DataStreamDefinition>
```

The connector, source, DLO and transform must already exist for a working stream.
{% endcapture %}

{% capture read_plugin %}
Saves the stream's settings and its source-to-DLO mappings as one JSON file. It selects one stream by its exact API name.

Run this from your local project root:

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-stream:CustomerStream -d .
```

Inspect `data360/data-stream/CustomerStream.data-stream-meta.json`. It is a strict JSON file, not XML or a raw API response. Keep the read-only `observed` section unchanged. The command does not export credentials or create connections. The file has this shape (offline-tested; names and labels are examples):

```json
{
  "schemaVersion": 1,
  "kind": "data-stream",
  "identity": { "apiName": "CustomerConnection_CustomerEvent_2A5A8AB6", "dataSpace": "default" },
  "spec": {
    "connectorType": "IngestApi",
    "connectionName": "CustomerConnection",
    "event": "CustomerEvent",
    "datastreamType": "INGEST_API",
    "refreshMode": "UPSERT",
    "label": "CustomerStream",
    "newDlo": {
      "name": "CustomerConnection_CustomerEvent_2A5A8AB6__dll",
      "label": "CustomerStream",
      "category": "Other",
      "primaryKey": { "name": "CustomerId", "label": "CustomerId", "dataType": "Text" }
    },
    "additiveFieldMappings": []
  },
  "observed": {
    "mappings": [],
    "sourceFields": [{ "name": "CustomerId", "datatype": "Text" }],
    "dloFields": [{ "name": "CustomerId__c", "label": "CustomerId", "dataType": "Text", "isPrimaryKey": true }],
    "actualDloName": "CustomerConnection_CustomerEvent_2A5A8AB6__dll"
  }
}
```

`observed` is optional in a hand-written file and is never sent as input.

Salesforce returns a stream's field mappings in a varying order. Retrieve sorts `observed.mappings` by target field, source field and formula, so a repeated retrieve of an unchanged stream reports `unchanged`. Deploy compares the mappings regardless of order.

<details markdown="1">
<summary>Salesforce CRM streams</summary>

A stream that reads a CRM object through the Salesforce CRM connector is saved at the same path, with the stream as Salesforce reads it under `spec`. The plugin leaves out what Salesforce owns or adds by itself: record ID, status and run status, the DLO ID, repeated echoes of the connector type and the DLO fields, the date format of source fields, and the system fields and mappings (`KQ_Id`, `DataSource`, `DataSourceObject`, `SfdcOrganizationId`, `cdp_sys_*`). Formulas are saved readable, without the HTML escaping the read returns. Fields, source fields and mappings are sorted, so a repeated retrieve reports `unchanged`. Excerpt:

```json
{
  "schemaVersion": 1,
  "kind": "data-stream",
  "identity": { "apiName": "Pricebook_Home", "dataSpace": "default" },
  "spec": {
    "name": "Pricebook_Home",
    "label": "Pricebook_Home",
    "dataStreamType": "SFDC",
    "connectorInfo": {
      "connectorType": "SalesforceDotCom",
      "connectorDetails": { "name": "SalesforceDotCom_Home", "sourceObject": "Pricebook2" }
    },
    "dataLakeObjectInfo": { "name": "Pricebook_Home__dll", "category": "Other", "fields": [] },
    "mappings": [{ "formula": "UPPER(sourceField['Name'])", "targetFieldName": "NameUpper" }],
    "sourceFields": [{ "datatype": "Text", "name": "Name" }],
    "refreshConfig": { "refreshMode": "UPSERT", "fullRefreshIntervalDays": "DAYS_10" }
  }
}
```

<details markdown="1">
<summary>Ingestion API streams: category, field types and formulas</summary>

An Ingestion API stream of any DLO category, for example `Engagement`, and with source fields of any type (Number, Boolean, DateTime, Email) uses the same file. `spec.newDlo.category` holds the category, `spec.newDlo.eventDateTimeFieldName` the event time field of an Engagement DLO, and `spec.formulaMappings` each formula field with its formula (saved readable) and the type of its DLO field. The partition-date formula Salesforce adds to an Engagement DLO is left out. Excerpt:

```json
"newDlo": {
  "name": "CustomerConnection_WebEvent_1A2B3C4D__dll",
  "label": "Web events",
  "category": "Engagement",
  "eventDateTimeFieldName": "EventTime",
  "primaryKey": { "name": "EventId", "label": "EventId", "dataType": "Text" }
},
"additiveFieldMappings": [],
"formulaMappings": [
  { "targetFieldName": "ScoreDoubled", "formula": "sourceField['Score'] * 2", "targetFieldReturntype": "Number" }
]
```

One connection can feed several streams, one per event. The stream read does not name its event, so the plugin takes it from the stream name Salesforce generated (`<connection>_<event>_<8 hex characters>`) or its label (`<connection>-<event>`), and from the source fields when several events fit. A stream it cannot tie to one event is saved as-is (`AMBIGUOUS_STREAM_EVENT`). A stream whose source fields differ from its event, or whose DLO fields differ from the stream's, is saved as-is too (`STREAM_SOURCE_DRIFT`, `STREAM_DLO_DRIFT`): the file holds neither, so a deploy could not rebuild them.

</details>

Streams of other connectors, such as Amazon S3, Marketing Cloud Engagement or streaming apps, are saved as-is (`UNSUPPORTED_STREAM_CONNECTOR`), and deploy does not send them.

</details>
{% endcapture %}

{% capture read_connect %}
Reads one stream with its mappings, by API name or record ID. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams/CustomerStream?includeMappings=true' --target-org TARGET_ALIAS
```

Excerpt:

```json
{ "name": "CustomerStream", "label": "CustomerStream", "status": "ACTIVE", "connectorInfo": { "connectorType": "IngestApi" }, "dataLakeObjectInfo": { "category": "Other", "dataLakeFieldInfoRepresentation": [{ "name": "CustomerId", "dataType": "Text", "isPrimaryKey": true }] } }
```

The response also holds `recordId`, `mappings`, `sourceFields`, `refreshConfig` and the run counters. Keep `recordId`: update and delete address the stream by it.

List the streams of one connection, and read what depends on a stream or its DLO:

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams?connectionName=CustomerConnection&includeMappings=true&limit=200&offset=0' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/data-streams/CustomerStream/dependencies' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll/dependencies' --target-org TARGET_ALIAS
```

A stream with nothing depending on it answers `{ "dependencies": [], "totalSize": 0 }`. The Ingestion API connections are under `/ssot/connections?connectorType=IngestApi`, and a connection's source events under `/ssot/connections/{id}/schema`.
{% endcapture %}

{% capture read_metadata %}
### Metadata API read of the stream definition

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>DataStreamDefinition</met:type>
      <met:fullNames>CustomerStream</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds the same attributes as the retrieved XML file, for example `dataConnector`, `dataConnectorType`, `dataExtractMethods`, `dataSource`, `mktDataLakeObject`, `mktDataTranObject`, `masterLabel` and `creationType`. `listMetadata` with the type `DataStreamDefinition` returns the full names in the org.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-read" label="Read" split_api=true cli_state="available" cli_reason="Retrieves the stream XML. It does not start a refresh (see Evidence)." cli_body=read_cli metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata and listMetadata. Returns the definition, not the run state." metadata_body=read_metadata connect_state="available" connect_reason="Native API 68.0 reads of the stream, its connection list and its dependencies." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves every stream (bare -m data-stream) or one by name. API 68.0 and default data space only (see Evidence)." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the stream and its landing DLO from a local file. Provision the stream and DLO first, prepare the DMO fields next, and create the DLO-to-DMO mapping last.

Start from the file retrieved from the source org. Change only `spec.connectionName`, to the name of an existing compatible connection in the target. The file must have empty `spec.additiveFieldMappings`, `UPSERT` and the default data space. The category, the event time field and `spec.formulaMappings` are sent as written: the DLO gets only the primary key as field from the file, Salesforce adds every other event field with its type, and with formulas the plugin also sends the event fields and their types. Each event of a connection can have its own stream.

Preview the change, then allow processing:

```sh
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --preview
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --allow-processing
```

Creation also creates the landing DLO. Salesforce ignores the name in the file for a new Ingestion API stream. It names the stream `<connection>_<event>_<8 hex characters>`, for example `CustomerConnection_CustomerEvent_2A5A8AB6`, and names the DLO after it. The plugin reports the real name as `targetApiName` and the DLO's name as `targetDloName`, with `outcome: "created"` and `mutation: "confirmed-created"`. A stream already bound to the same connection and event is not created again: the command reports `STREAM_EXISTING_BINDING_REQUIRES_UPDATE`, so retrieve that stream and update it instead.

After a create or update, Salesforce keeps the stream and its DLO in `PROCESSING` for a while; the plugin reads both back until they are `ACTIVE` before it reports the result.

Retrieve the stream by that reported name and keep working with the retrieved file. Deploying the original file again is blocked, because its name no longer matches.

**Salesforce CRM stream:** Write or copy a CRM stream file (Read chapter) with a new stream name, DLO name and source object, and deploy it the same way with `--allow-processing`. The plugin renames the keys that the create request spells differently (`datastreamType`, `dataspaceInfo`, `dataLakeFieldInputRepresentations`, `sourceFields[].dataType`), leaves out the plain field mappings and sends each formula with the type of its DLO field. Salesforce keeps the name you chose and creates the DLO. It checks each source field type against the CRM object; a standard checkbox such as `IsActive` must be `Text`. Do not add the system fields; Salesforce refuses them in a create.
{% endcapture %}

{% capture create_connect %}
Creates one Ingestion API stream and its landing DLO on an existing connection and source event. Read the connection and its schema first (Read chapter); this request does not create either.

Save this as `stream-create.json`:

```json
{
  "name": "CustomerStream",
  "label": "CustomerStream",
  "datastreamType": "INGEST_API",
  "connectorInfo": {
    "connectorType": "IngestApi",
    "connectorDetails": { "name": "CustomerConnection", "events": ["CustomerEvent"] }
  },
  "dataLakeObjectInfo": {
    "name": "CustomerSource__dll",
    "label": "CustomerSource",
    "category": "Other",
    "dataspaceInfo": [{ "name": "default" }],
    "dataLakeFieldInputRepresentations": [
      { "name": "CustomerId", "label": "CustomerId", "dataType": "Text", "isPrimaryKey": true }
    ]
  },
  "mappings": [],
  "sourceFields": [],
  "refreshConfig": { "refreshMode": "UPSERT" }
}
```

`dataLakeObjectInfo` is one object, not an array. `dataLakeFieldInputRepresentations` holds only the primary key, a Text field of the source event. `mappings` and `sourceFields` stay empty.

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams' --method POST --body '@stream-create.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS
```

Success is HTTP 201. Salesforce ignores the names in the body: it names the stream `<connection>_<event>_<8 hex characters>`, for example `CustomerConnection_CustomerEvent_2A5A8AB6`, and names the DLO after it. Take `name` and `recordId` from the response. Then read the stream by that name, as in the Read chapter, until the stream and its DLO both show `ACTIVE`. The response alone does not confirm the result.

**Known failures:**

- Do not send a complete GET response as a create body. Send only the fields shown above.
- Because Salesforce generates the name, a read by the name in your body does not find the new stream. Use the `name` from the response.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-create" label="Create" split_api=true cli_state="unknown" cli_reason="Creating a stream from XML has not been verified." metadata_state="unknown" metadata_reason="No Metadata API create workflow for streams has been tested." connect_state="available" connect_reason="Native API 68.0 POST on an existing Ingestion API connection; Salesforce names the stream (see Evidence)." connect_body=create_connect plugin_state="available" plugin_reason="Installed API 68.0 and default data space, with an existing compatible connection (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Adds one nonprimary Text field to the stream's mappings. It also creates the matching DLO field. To add a formula field instead, add an entry to `spec.formulaMappings` (`targetFieldName`, `formula`, `targetFieldReturntype`); Salesforce creates its DLO field. A formula removed from the file is sent as an empty formula, which Salesforce refuses (reported as rejected). A changed stream label is sent; Salesforce keeps its own label, reported as `STREAM_CHANGE_NOT_APPLIED`. A change of the DLO label, category, event time field or primary key, or of an existing formula's return type, is refused by the plugin before any request (`UNSUPPORTED_STREAM_SETTINGS_CHANGE`).

Retrieve the target stream first, using the Read command with `TARGET_ALIAS`. Keep its settings, labels and `observed` section. Then append one entry to `spec.additiveFieldMappings`, and keep the existing entries:

```json
{
  "sourceFieldLabel": "ContactEmail",
  "targetFieldName": "ExtraContactEmail",
  "targetFieldReturntype": "Text"
}
```

Replace `ContactEmail` with an existing, uniquely named, nonprimary Text field of the source event. Use a new name without `__c`. The new DLO field is `ExtraContactEmail__c`. Do not reuse a primary, generated or existing source field name.

Preview the change, then allow processing:

```sh
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --preview
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --allow-processing
```

An accepted update reports `outcome: "updated"`. An unchanged repeat reports `outcome: "unchanged"` and writes nothing. Removing an entry does not remove the mapping or field. Prepare the DMO field first, and deploy the DLO-to-DMO mapping last. A stream or DLO that is not `ACTIVE` stops the command with `STREAM_NOT_READY`; wait until both are active and run it again.

**Salesforce CRM stream:** Edit the retrieved file and deploy it. The plugin sends one PATCH with `datastreamType` and only the parts that differ from the org. To add a formula field, add a mapping with `targetFieldName` and `formula`, plus the matching field in `dataLakeObjectInfo.fields`. Changing an existing formula expression is applied. Removing a formula mapping clears that formula; the DLO field stays. Full refresh is set with `refreshConfig.fullRefreshIntervalDays`, and a changed interval is applied. Salesforce refuses a change of `refreshMode` (reported as rejected, nothing changed) and keeps the old label after a label change: the plugin reports that as `STREAM_CHANGE_NOT_APPLIED`. A plain (non-formula) field mapping added, removed or changed, or a new return type for an existing formula, has no proven update path in the API, so the plugin refuses it before any write (`UNSUPPORTED_STREAM_SETTINGS_CHANGE`).

**Ingestion API stream:** To add a formula field, add an entry to `spec.formulaMappings` and deploy; the plugin sends one PATCH. Salesforce refuses changing or removing an existing formula (HTTP 400, reported as rejected; nothing changes), so create a new formula field instead. A new return type for an existing formula is refused by the plugin before any write (`UNSUPPORTED_STREAM_SETTINGS_CHANGE`).
{% endcapture %}

{% capture update_connect %}
Maps one existing nonprimary Text field of the source event to a new DLO field. Salesforce creates the DLO field `ExtraContactEmail__c`. Use the stream's `recordId` from the Read chapter; the stream and its DLO must be `ACTIVE`.

Save this as `stream-patch.json`. List only the new mappings, not the existing ones:

```json
{
  "datastreamType": "INGEST_API",
  "mappings": [
    {
      "sourceFieldLabel": "ContactEmail",
      "targetFieldName": "ExtraContactEmail",
      "targetFieldReturntype": "Text"
    }
  ]
}
```

`sourceFieldLabel` is the label of an existing, uniquely labelled source field. `targetFieldName` is a new name without `__c`. Do not use a primary, generated or existing source field name.

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams/STREAM_RECORD_ID' --method PATCH --body '@stream-patch.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS
```

Success is HTTP 200. Read the stream again until the stream and DLO show `ACTIVE`. The new mapping reads back with `targetFieldName` `ExtraContactEmail` and a `formula` that holds the source field label; the DLO lists `ExtraContactEmail__c`. Earlier mappings and fields stay unchanged.

**Known failures:**

- A PATCH that changes only the label returns success but leaves the label unchanged.
- The PATCH maps a field that the source event already has. It does not add a field to the source event schema.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-update" label="Update" split_api=true cli_state="unknown" cli_reason="Definition updates through XML have not been verified." metadata_state="unknown" metadata_reason="Metadata API updates for streams have not been tested." connect_state="available" connect_reason="Native API 68.0 PATCH by record ID; additive nonprimary Text mappings only (see Evidence)." connect_body=update_connect plugin_state="available" plugin_reason="Installed API 68.0 and default data space; additive Text mappings and formula fields (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one owned stream and keeps its DLO. Preview first; the preview writes nothing and lists the local files the delete would remove. The command reads the dependencies of the stream and of its DLO and stops with `STREAM_DELETE_DEPENDENCIES_BLOCKED` when something else depends on them (for example a mapping or a segment). A stream or DLO that is not `ACTIVE` stops it with `STREAM_NOT_READY`.

```sh
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --preview
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream
```

After a confirmed deletion the command removes the local file `data360/data-stream/CustomerStream.data-stream-meta.json` from the current project. Add `--keep-local-files` to keep it. A file that cannot be removed leaves the org result confirmed and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`; do not repeat the delete.

<details markdown="1">
<summary>Delete the linked DLO too</summary>

Add `--delete-dlo` to both commands to remove the linked DLO with the stream. The DLO is removed as a cascade, and its local file `data360/dlo/<Name>.dlo-meta.json` is removed too unless `--keep-local-files` is set. Use this only for owned fixtures that no other resource uses.

```sh
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --delete-dlo --preview
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --delete-dlo
```

The command checks that the stream and the DLO are both gone. A DELETE response alone is not proof. Salesforce answers the DELETE in a few seconds, but removal takes about 90 seconds, so the command runs for about two minutes.

</details>

**Known failures:**

- A `--delete-dlo` run can report `failed` / `unknown` with an HTTP 400 after 120 seconds, although the stream and its DLO were deleted. The route that answers 400 is not identified. Before you run again, read the stream and the DLO by name. If both return not found, the deletion is complete.
{% endcapture %}

{% capture delete_connect %}
Deletes one owned stream by its `recordId` from the Read chapter. Check the dependencies of the stream and its DLO first. `shouldDeleteDataLakeObject=false` keeps the DLO; `true` removes it with the stream.

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams/STREAM_RECORD_ID?shouldDeleteDataLakeObject=false' --method DELETE --target-org TARGET_ALIAS
```

A successful DELETE returns HTTP 204 with no body, within a few seconds. Removal takes longer: in live tests the stream read and the DLO read went from HTTP 200 to 404 after about 90 seconds. Poll those reads until both answer 404, and do not send the DELETE again.

```sh
sf api request rest '/services/data/v68.0/ssot/data-streams/CustomerStream' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/data-lake-objects/CustomerSource__dll' --target-org TARGET_ALIAS
```

**Known failures:**

- A plugin `--delete-dlo` run can end with an HTTP 400 from a request that is not identified, although the stream and DLO were deleted. If you see a 400 during removal, keep polling: a 404 on both reads is the result that counts.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-delete" label="Delete" split_api=true cli_state="unknown" cli_reason="Stream deletion through XML has not been verified." metadata_state="unknown" metadata_reason="A raw Metadata API delete of a stream has not been tested." connect_state="available" connect_reason="Native API 68.0 DELETE by record ID, with or without the DLO, checked by reads." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one owned stream; the DLO stays unless you add --delete-dlo (see Evidence)." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limits still apply. This badge does not verify untested writes or general CRUD support.

**Mapping order:** Changing a stream mapping does not deploy the DLO-to-DMO mapping, create a DMO or prove that downstream data is ready. Mapping creation does not create missing DMO fields. The DLO discussion is in [Data Lake Object](/next/data-cloud-cli/data-lake-object/#create).

**Stream XML:** The `sf project retrieve start` command uses the Metadata API. The tested retrieve used `--api-version 65.0` and `--wait 5`. Retrieving the file does not start a refresh.

**Native API family:** The `/ssot/data-streams` routes belong to the Data 360 Connect REST API, listed in the [Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec). The CLI only sends the authenticated request.

<a id="documented-native-stream-api-availability"></a>

**Documented native stream API availability:** The [Data 360 Connect REST API reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) documents `POST /ssot/data-streams` and the stream GET routes as available since **60.0**. The create and update bodies in the Create and Update chapters are the shapes tested at API 68.0. The list route takes `connectionName`, `filter`, `includeMappings`, `limit` (1–200, default 10), `offset` and `orderBy`.

**Create (native, API 68.0):** The create request supplies only the primary key in the DLO field array, on an existing Ingestion API connection and source event. Check the connection and source schema first. The plugin create was observed live at API 68: Salesforce generated names that differed from the proposed names (verification database, row on stream naming). The create response alone does not confirm the result; read the stream and its DLO until both are `ACTIVE`. Do not replay a complete GET response as a create body, and do not create missing connections implicitly.

**Update (native, API 68.0):** One additive mapping from an existing source Text field into a new nonprimary DLO Text field. The returned mapping uses a `formula` containing the source field label; this is not a statement about arbitrary formula expressions. A label PATCH returns success without changing the label, so label editing is not supported. The PATCH body and its readback are offline-tested; no verification-database row records a live PATCH.

**Delete (native, API 68.0):** Preserve mode requires the stream to be absent and the DLO to be unchanged. Delete-DLO mode requires the stream and the linked DLO to be absent, by name and by persisted ID, and is a cascade of the stream deletion. An HTTP 204 alone, or an intermediate `DELETING` state, is not completion. The plugin sends the DELETE once and never retries. Live observations (verification database): the plugin `--delete-dlo` run exited 0 with `confirmed-deleted` twice (about 131 and 120 seconds; the DELETE answered in about 4 seconds and settlement took about 90) and ended `failed` / `unknown` with an HTTP 400 once. Preserve mode and API 65 delete are offline-tested only.

**Plugin behaviour:**

- The plugin checks the saved file against a fixed subset before any request: connector type `IngestApi`, stream type `INGEST_API`, refresh mode `UPSERT`, and additive mappings whose `targetFieldReturntype` is `Text`, whose target names do not end in `__c` and do not repeat the primary key or another target. Anything else is refused (`UNSUPPORTED_STREAM_SPEC`, `INVALID_STREAM_MAPPING`). A label longer than 40 characters is refused (`INVALID_STREAM_LABEL`).
- The plugin admits only `--api-version auto` or `68.0`, the default data space, and the supported Ingestion API subset. Other versions and scopes are blocked.
- Deploy resolves the source binding before it chooses create, update or unchanged. Changes require `--allow-processing`. `--preview` writes nothing. A stream can be deployed beside other families, and `--changed-since` selects changed stream files; streams run first. Dependencies are never pulled in.
- Read selects one stream by exact name. It checks the linked DLO independently. A Salesforce CRM stream is saved as its read without server-owned keys and system fields (Read chapter). Any other stream outside the supported subset (another connector, or an Ingestion API stream with another refresh mode, no single event, or a mapping the file cannot represent) is saved as-is with a warning; deploy does not send that file. Type-only inventory, wildcard selection and dependency expansion are not supported.
- A repeat of an unchanged file writes nothing. Retrieve sorts the stream's field mappings, so a repeated retrieve of an unchanged stream reports `unchanged`.
- A proposal label that differs from the generated target label is blocked before any write.
- Removing an entry from `spec.additiveFieldMappings` does not remove any mapping or field.
- All reads the plugin makes use native API 68.0 routes: the stream, its connection and the connection's schema, and the dependencies of the stream and its DLO.
- A new stream's name comes from Salesforce, not the file: `<connection>_<event>_<8 hex characters>`. The plugin reports the name as `targetApiName`, and a repeat with the original file is blocked.
- Delete refusals before any write: `STREAM_NOT_READY` (stream or DLO not `ACTIVE`), `STREAM_DELETE_DEPENDENCIES_BLOCKED` (something depends on the stream or its DLO), `STREAM_DELETE_DLO_REQUIRES_STREAM_SELECTION` (`--delete-dlo` with a selector that is not a stream). Unconfirmed outcomes are reported as `STREAM_DELETE_UNCONFIRMED` or `STREAM_DELETE_SETTLEMENT_UNCONFIRMED`; read the stream and DLO by name before any further attempt.
- Other codes: `STREAM_CREATE_UNCONFIRMED`, `STREAM_CREATE_SETTLEMENT_UNCONFIRMED`, `STREAM_UPDATE_SETTLEMENT_UNCONFIRMED` (a write whose result was not confirmed), `STREAM_SNAPSHOT_PENDING` (status changed between two reads), `STREAM_BINDING_DRIFT` and `STREAM_DLO_DRIFT` (the stream, its connection or its DLO changed between two reads), `UNSUPPORTED_STREAM_SETTINGS_CHANGE` (a change of DLO label, category, event time field or primary key), `STREAM_TARGET_MISMATCH` (the named stream is not the one found on the connection), `STREAM_FILENAME_COLLISION` and `LOCAL_FILE_REMOVAL_FAILED`. All of these are offline-tested.
- Local files: after a confirmed deletion (or a deletion Salesforce accepted and is still finishing) the stream's file under `data360/data-stream/` is removed, with `--delete-dlo` also the linked DLO's file under `data360/dlo/`. `--preview` removes nothing and lists the files. `--keep-local-files` keeps them.
- The plugin's README reports a cross-org run at API 68 (source create and retrieve, a `spec.connectionName`-only remap, target create, one additive mapping update, a zero-write repeat and cascade cleanup). No verification-database row records it.

**Standard CLI:** `sf org list metadata --metadata-type DataStreamDefinition` lists the stream definitions, and `sf project retrieve start` saved one by name at API 68.0 (CLI 2.151.7). Creating, changing or deleting a stream through a deploy was not tried.

**Salesforce CRM streams (plugin, API 68.0):** Observed live on one org with a new stream on the `Pricebook2` object (15 records, no earlier stream): create from a file, retrieve with identical bytes, an unchanged repeat without `--allow-processing`, a formula field added through the file (one PATCH), and a delete with `--delete-dlo`; afterwards the stream and DLO reads answered 404. Label and refresh mode behaviour come from direct API probes, not from a plugin run.

**Ingestion API streams of other categories (plugin, API 68.0):** Observed live on one org with a new Ingestion API connection with two events (Text, DateTime, Number, Boolean and Email fields): two `Engagement` streams with a formula field created from files on that one connection, retrieved as normal files, an unchanged repeat, a formula added through the file (one PATCH) and both deleted with `--delete-dlo`; afterwards the streams, DLOs and the removed connection answered 404. In a second plugin run, changing an existing formula expression was refused by Salesforce (HTTP 400, nothing changed), and a label change was accepted without effect. Removing a formula comes from direct API probes (refused).

**Not verified:** Connectors other than Ingestion API and Salesforce CRM, populated data, nondefault data spaces, other API versions, full migration, a published plugin release, XML create, update, activation, refresh or delete, label edits, and cross-org replay of arbitrary stream documents. Downstream DLO-to-DMO mapping provisioning is not verified here.

</details>