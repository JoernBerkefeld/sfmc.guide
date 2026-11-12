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
  read: { status: "partial", methods: [cli, plugin] }
  create: { status: "partial", methods: [plugin] }
  update: { status: "partial", methods: [plugin] }
  delete: { status: "partial", methods: [plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Read its setup and placeholder notes before you run these examples.

<a id="data-stream-configuration-datastreamdefinition"></a>

**Data Stream** brings data from a source into a [Data Lake Object (DLO)](/next/data-cloud-cli/data-lake-object/). Its saved XML definition is a `DataStreamDefinition`. A stream maps source fields into DLO fields. A separate [DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/) connects the DLO to a Data Model Object.

**Example used in every chapter:** `CustomerStream`, the stream that feeds the DLO `CustomerSource__dll`. Each method below works on this same stream.

{% include crud-summary.html %}

**Plugin qualification:** The plugin works for one Ingestion API stream at API 68.0 in the default data space, with a compatible existing connection.

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

Inspect `data360/data-stream/CustomerStream.data-stream-meta.json`. It is a strict JSON file, not XML or a raw API response. Keep the read-only `observed` section unchanged. The command does not export credentials or create connections. A sample of the file is not in this guide yet.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-read" label="Read" split_api=true cli_state="available" cli_reason="Retrieves the stream XML. It does not start a refresh (see Evidence)." cli_body=read_cli metadata_state="unknown" metadata_reason="Direct Metadata API reads of streams have not been tested." connect_state="unknown" connect_reason="No tested Connect API read is supplied for this page." plugin_state="available" plugin_reason="Exact stream name, installed API 68.0 and default data space only (see Evidence)." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the stream and its landing DLO from a local file. Provision the stream and DLO first, prepare the DMO fields next, and create the DLO-to-DMO mapping last.

Start from the file retrieved from the source org. Change only `spec.connectionName`, to the name of an existing compatible connection in the target. The file must have empty `spec.additiveFieldMappings`, a Text primary key, `UPSERT`, category `Other` and the default data space.

Preview the change, then allow processing:

```sh
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --preview
sf data360 deploy -o TARGET_ALIAS -d data360/data-stream/CustomerStream.data-stream-meta.json --allow-processing
```

Creation also creates the landing DLO. Use the generated names that Salesforce returns, not the proposed names. A sample of the output is not in this guide yet.

**Known failures:**

- At API 66, a stream had an automatic processing failure. Its cause is not known. The plugin admits only `auto` or `68.0`.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-create" label="Create" split_api=true cli_state="unknown" cli_reason="Creating a stream from XML has not been verified." metadata_state="unknown" metadata_reason="No Metadata API create workflow for streams has been tested." connect_state="unknown" connect_reason="Native creation was qualified for one fresh stream (see Evidence). No request is supplied here." plugin_state="available" plugin_reason="Installed API 68.0 and default data space, with an existing compatible connection (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Adds one nonprimary Text field to the stream's mappings. It also creates the matching DLO field.

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

An unchanged repeat writes nothing. Removing an entry does not remove the mapping or field. Prepare the DMO field first, and deploy the DLO-to-DMO mapping last. A sample of the output is not in this guide yet.
{% endcapture %}

{% include operation-tabs.html id="stream-definition-update" label="Update" split_api=true cli_state="unknown" cli_reason="Definition updates through XML have not been verified." metadata_state="unknown" metadata_reason="Metadata API updates for streams have not been tested." connect_state="unknown" connect_reason="The native additive mapping was qualified (see Evidence). No request is supplied here." plugin_state="available" plugin_reason="Installed API 68.0 and default data space; additive nonprimary Text mappings only (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one owned stream and keeps its DLO. Preview first. Check that you own the stream and that nothing depends on it.

```sh
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --preview
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream
```

A sample of the output is not in this guide yet.

<details>
<summary>Delete the linked DLO too</summary>

Add `--delete-dlo` to both commands to remove the linked DLO with the stream. The DLO is removed as a cascade. Use this only for owned fixtures that no other resource uses.

```sh
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --delete-dlo --preview
sf data360 delete -o TARGET_ALIAS -m data-stream:CustomerStream --delete-dlo
```

The command checks that the stream and the DLO are both gone. A DELETE response alone is not proof.

</details>
{% endcapture %}

{% include operation-tabs.html id="stream-definition-delete" label="Delete" split_api=true cli_state="unknown" cli_reason="Stream deletion through XML has not been verified." metadata_state="unknown" metadata_reason="A raw Metadata API delete of a stream has not been tested." connect_state="unknown" connect_reason="Native deletion was qualified on owned fixtures (see Evidence). No request is supplied here." plugin_state="available" plugin_reason="Deletes one owned stream; the DLO stays unless you add --delete-dlo (see Evidence)." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limits still apply. This badge does not verify untested writes or general CRUD support.

**Mapping order:** Changing a stream mapping does not deploy the DLO-to-DMO mapping, create a DMO or prove that downstream data is ready. Mapping creation does not create missing DMO fields. The DLO discussion is in [Data Lake Object](/next/data-cloud-cli/data-lake-object/#create).

**Stream XML:** The `sf project retrieve start` command uses the Metadata API. The tested retrieve used `--api-version 65.0` and `--wait 5`. Retrieving the file does not start a refresh.

**Native API family:** The `/ssot/data-streams` routes belong to the Data 360 Connect REST API, listed in the [Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec). The CLI only sends the authenticated request.

<a id="documented-native-stream-api-availability"></a>

**Documented native stream API availability:** The [Data 360 Connect REST API reference, version 67.0](https://developer.salesforce.com/docs/data/connectapi/references/spec?meta=type%3AData+Stream+Source+Field+Output) documents native `POST /ssot/data-streams` as available since **60.0**. Its marked required top-level inputs are `connectorInfo`, `label`, `mappings`, `name`, `refreshConfig` and `sourceFields`. `datastreamType` includes `INGEST_API`. `dataLakeObjectInfo` and `existingDataLakeObjectInfo` are alternatives. For Ingestion API streams, `dataLakeFieldInputRepresentations` must contain **only the primary key field**, not the full event schema.

These are reference inputs, not a general ingestion create recipe. The reference describes `dataLakeObjectInfo` as an array while its S3 request example uses an object. No shape is chosen here. The reference does not supply nested ingestion connector or event inputs, so no native ingestion payload is inferred. The POST reference lists `200` as success. The S3 example response lists stream `id`, `name`, `recordId` and `status`, and DLO `id`, `name` and `status`. The visible S3 response shows both statuses as `PROCESSING`. That example does not establish ingestion identity correlation or settled success.

Native `GET /ssot/data-streams` and `GET /ssot/data-streams/{recordIdOrDeveloperName}` are also documented since 60.0. The list documents `connectionName`, `filter`, `includeMappings`, `limit` (1–200, default 10), `offset` and `orderBy`. No `sourceObjectName` query parameter is documented in that list. Do not transfer the facade discovery filter to native REST.

The reference alone does not establish conflict-safe duplicate creation, permission-aware authoritative absence, restart/lost-response recovery or terminal processing settlement. A unique name, an empty list or list-then-create is not an overwrite or ownership guarantee. The narrow implementation checks described above do not establish general recovery or API67 native/facade parity.

Salesforce documents native API 67 stream GET and PATCH in its [CRM field-disablement guide](https://developer.salesforce.com/docs/data/connectapi/guide/data-stream-use-case.md). That connector-specific update use case is not an ingestion CREATE contract or proof that arbitrary connector payloads can be replayed.

**Create (native, API 68.0):** One fresh Ingestion API stream and its new `Other` DLO were created in the default data space. The existing connection and source schema were checked first. The create request supplied only the primary key in the DLO field array. Independent stream and DLO reads confirmed their identities and ACTIVE state. Salesforce generated names that differed from the proposed names. The create response alone did not confirm the result. Do not replay a complete GET response as a create body, and do not create missing connections implicitly.

**Update (native, API 68.0):** One additive mapping from an existing source Text field into a new nonprimary DLO Text field was added. Independent reads confirmed the new mapping and DLO field, unchanged prior mappings and fields, the original primary key, the source schema, settings, identities, and ACTIVE state for both stream and DLO. The returned mapping used a `formula` containing the source field label. This is not evidence for arbitrary formula expressions. A label PATCH returned success without changing the label, so label editing is not qualified.

**Delete (native, API 65.0 and 68.0):** Both modes were qualified on owned Ingestion API fixtures in the default data space, with dependency checks and independent final-state reads. Preserve mode required the stream to be absent and the DLO to be unchanged. Delete-DLO mode required the stream and the linked DLO to be absent, by name and by persisted ID. Unselected resources stayed in place. An HTTP 204 alone, or an intermediate `DELETING` state, was not completion evidence. No separate direct DLO DELETE and no automatic retry was used. The DLO removal in delete-DLO mode was a cascade of stream deletion.

**API 66:** Preserve-DLO deletion succeeded, and the full DLO schema survived. That stream had an automatic processing failure whose cause is not known. Its zero row counters do not prove that the DLO is empty. Delete-DLO mode and other lower API pins are not qualified. This is definition-deletion evidence only. It does not show that automatic processing was harmless.

**Other readbacks:** One readback could not resolve a different stream in `DELETING` state. It does not change the results above and does not establish general deletion support. One unexplained run is not used as qualification evidence. A fresh successful run does not establish its cause.

**Plugin behaviour:**

- The plugin keeps no local allowlists. It checks the saved file's shape. Category, data types, labels and descriptions are sent as written, and Salesforce decides.
- The plugin admits only `--api-version auto` or `68.0`, the default data space, and the supported Ingestion API subset. Other versions and scopes are blocked.
- Deploy resolves the source binding before it chooses create, update or unchanged. Changes require `--allow-processing`. `--preview` writes nothing. Mixed resource families, dependency expansion and Git selection are blocked.
- Read selects one stream by exact name. It checks the linked DLO independently and rejects unsupported shapes. Type-only inventory, wildcard selection and dependency expansion are not supported.
- A repeat of an unchanged file writes nothing.
- A proposal label that differs from the generated target label is blocked before any write.
- Removing an entry from `spec.additiveFieldMappings` does not remove any mapping or field.
- Fresh installed API 68 qualification passed these steps in both orgs: source create and retrieve; a `spec.connectionName`-only remap to a compatible target connection; target create and retrieve; one additive nonprimary Text mapping update; a zero-write repeat; and explicit cascade cleanup. Independent reads confirmed that cleanup left protected resources unchanged.

**Not verified:** Other connectors, populated data, nondefault data spaces, other API versions, full migration, a published plugin release, XML create, update, activation, refresh or delete, label edits, and cross-org replay of arbitrary stream documents. Downstream DLO-to-DMO mapping provisioning is not verified here.

</details>