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
  retrieve: { status: "partial", methods: [cli, plugin] }
  create: { status: "partial", methods: [plugin] }
  update: { status: "partial", methods: [plugin] }
  delete: { status: "partial", methods: [plugin] }
---

*Prior documentation record: November 3, 2026, 22:59 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-stream-configuration-datastreamdefinition"></a>

**Data Streams** bring data from a source into a [Data Lake Object (DLO)](/next/data-cloud-cli/data-lake-object/). Start here when following the ingestion flow. `DataStreamDefinition` is the saved XML definition; the running stream also has its own native API identity and processing state.

### Two different kinds of mapping

- **Source to DLO:** the stream contains the mappings from source fields into DLO fields. These mappings belong to the stream, not to a separate mapping resource. Creating or updating a stream can also create or extend its DLO schema.
- **DLO to DMO:** a separate [DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/) connects ingested DLO fields to a Data Model Object. Changing a stream mapping does not deploy that separate mapping, create a DMO or prove that downstream data is ready.

For the bounded ingestion setup described here, **provision the Data Stream and its landing DLO first, independently prepare the DMO and its required fields, then create the DLO-to-DMO mapping last**. The DMO can be prepared independently; both objects and the required fields must be ready before mapping them. This is a provisioning prerequisite, not just the order in which data flows. Mapping creation is not qualified to create missing DMO fields.

The supported stream PATCH maps an **existing source-event Text field** to a new nonprimary Text DLO field, creating that landing field. It does not extend the source event schema, create DMO fields or create the downstream mapping. For stream-owned schema, use the owning stream's qualified update path: direct DLO changes were previously refused. The separate standalone DLO create/update workflows are limited definition operations, not a complete ingestion setup or permission to edit a stream-owned DLO directly.

### Support and qualification

The summary below retains the supplied standard XML workflow. The later native evidence describes a narrower running-stream lifecycle, not general `DataStreamDefinition` XML CRUD.

- **Standard Salesforce CLI:** the verified dedicated workflow retrieves XML with `sf project retrieve start`. Calling a native endpoint through `sf api request rest` is API use, not a dedicated standard stream CRUD command.
- **Native API:** bounded Ingestion API streams in the default dataspace, with a newly created `Other` DLO, have live evidence for creation, reads and one additive nonprimary Text mapping update. API65 and API68 also have qualified evidence for both stream deletion modes. This does not qualify arbitrary connectors, populated data, nondefault dataspaces or cross-org replay.
- **`sf-plugin-data`:** exact-name retrieve, guarded create/additive update/unchanged deploy and exact deletion are implemented. Admission is only `--api-version auto` or `68.0`, default dataspace and the supported Ingestion API subset. Fresh installed API68 qualification passed source create/retrieve, changing only `spec.connectionName` for a compatible existing target connection, target create/retrieve, one additive nonprimary Text mapping update, a zero-write repeat and explicit cascade cleanup in both orgs. Independent reads confirmed cleanup and protected resources unchanged. This does not qualify other connectors, populated data, other API versions, full migration or a published release. The earlier unexplained run is disregarded as qualification evidence; fresh success does not establish its cause.

The lower-version native evidence does **not** widen the plugin's API68 guard. Neither ACTIVE status nor zero processing counters proves that a DLO has no stored rows. The API66 automatic processing failure remains unresolved even though definition-only preserve-DLO deletion succeeded.

{% include crud-summary.html %}

## Retrieve

The plugin's implemented exact-name selector is `data-stream:API_NAME`. Its portable file is `data360/data-stream/API_NAME.data-stream-meta.json`, separate from the standard XML layout below. It projects supported stream settings and embedded source-to-DLO mappings, checks the linked DLO independently and rejects unsupported shapes rather than claiming a complete connector export. Type-only inventory, wildcard selection and dependency expansion are not supported for this stream subset. The fresh installed API68 run qualified retrieval in both source and target orgs within this subset.

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata DataStreamDefinition:CustomerStream --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

Look for `force-app/main/default/dataStreamDefinitions/CustomerStream.dataStreamDefinition-meta.xml`:

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

Retrieving this file does **not** start a refresh. The connector, source, DLO and transform still need to exist for a working stream. This and the source-object example show file shapes, not a complete ingestion setup.

{% endcapture %}
{% capture retrieve_plugin %}
Run from your local project root, replacing `StreamName` with the actual stream API name:

```sh
sf data360 retrieve -o SOURCE_ALIAS -m data-stream:StreamName --api-version 68.0 --data-space default -d .
```

Inspect `data360/data-stream/StreamName.data-stream-meta.json`. It is a strict portable JSON document, not XML or a raw GET response. Preserve its read-only `observed` content and actual retrieved settings. Exact selection only; this does not export credentials or provision connections.
{% endcapture %}
{% include operation-tabs.html id="stream-definition-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve stream XML without starting a refresh; not a complete ingestion setup." cli_body=retrieve_cli api_state="unknown" api_reason="No API DataStreamDefinition retrieval workflow is supplied." plugin_state="available" plugin_reason="Exact installed API68/default Ingestion API subset only." plugin_body=retrieve_plugin %}

## Create

{% capture create_evidence %}
Creation through `DataStreamDefinition` XML has **not been verified**. Native API68 creation was separately qualified for a fresh Ingestion API stream and its new `Other` DLO in the default dataspace. The existing connection and source schema were checked first; the create request supplied only the primary key in the DLO field array. Independent stream and DLO reads, not the create response alone, established their identities and ACTIVE state. Salesforce generated the actual names, which differed from the proposed names.

This narrow result does not turn XML retrieval into a deployable ingestion setup. The [DLO creation discussion](/next/data-cloud-cli/data-lake-object/#create) retains the separate connection/schema requirements. Do not replay a complete GET response as a create body, create missing connections implicitly or infer cross-org portability.

The plugin deploy implementation resolves the logical source binding before choosing create, update or unchanged. It requires `--allow-processing` for changes and supports read-only `--preview`. It blocks mixed resource families, dependency expansion, Git selection and unsupported versions or scopes for streams. The fresh installed API68 run exercised source creation and target creation after a connection-name-only remap, with existing compatible connections and source schemas. This is a bounded portability result, not permission to replay arbitrary stream documents.

### Documented native stream API availability

The [Data 360 Connect REST API reference, version 67.0](https://developer.salesforce.com/docs/data/connectapi/references/spec?meta=type%3AData+Stream+Source+Field+Output), documents native `POST /ssot/data-streams` as available since **60.0**. Its marked required top-level inputs are `connectorInfo`, `label`, `mappings`, `name`, `refreshConfig` and `sourceFields`; `datastreamType` includes `INGEST_API`. New `dataLakeObjectInfo` and `existingDataLakeObjectInfo` are alternatives. For Ingestion API streams, `dataLakeFieldInputRepresentations` must contain **only the primary key field**, not the complete event schema. This is distinct from preserving the complete connection schema before a schema PUT.

These are **reference inputs, not a general ingestion CREATE recipe**. The narrow API68 qualification above is separate from this API67 reference and its S3 example. The readable reference describes `dataLakeObjectInfo` as an array while its S3 request example uses an object; no shape is chosen here. The extracted endpoint section did not supply nested ingestion connector/event inputs or an Ingestion API request/response example, so no native ingestion payload is inferred. POST lists `200` success; the visible S3 response has stream `id`, `name`, `recordId` and `status`, plus DLO `id`, `name` and `status`, with both statuses `PROCESSING`. That example does not establish ingestion identity correlation or settled success.

Native `GET /ssot/data-streams` and `GET /ssot/data-streams/{recordIdOrDeveloperName}` are also documented since 60.0. The native list documents `connectionName`, `filter`, `includeMappings`, `limit` (1–200, default 10), `offset` and `orderBy`. **No `sourceObjectName` query parameter is documented in that list**; do not transfer the facade discovery's filter to native REST. Its Salesforce CRM examples are not an ingestion event-binding contract.

The reference alone does not establish conflict-safe duplicate creation, permission-aware authoritative absence, restart/lost-response recovery or terminal processing settlement. A unique-name description, an empty list or list-then-create is not a nonoverwrite or ownership guarantee. The narrow implementation checks described above do not establish general recovery or API67 native/facade parity.

Salesforce also documents native API 67 stream GET/PATCH in its [CRM field-disablement guide](https://developer.salesforce.com/docs/data/connectapi/guide/data-stream-use-case.md). That connector-specific update use case is not an ingestion CREATE contract or proof that arbitrary connector payloads can be replayed.

{% endcapture %}
{% capture create_plugin %}
Use the supported source-retrieved JSON from Retrieve, with empty `spec.additiveFieldMappings`, a Text primary key, `UPSERT`, category `Other` and default dataspace. The target must already have a compatible Ingestion API connection and matching source event/schema. Change only `spec.connectionName` to that target connection's actual name; do not invent connection IDs or replay a raw response. Stop if these prerequisites cannot be verified.

Select that exact local file, preview, then explicitly allow processing:

```sh
sf data360 deploy -o TARGET_ALIAS --api-version 68.0 --data-space default -d data360/data-stream/StreamName.data-stream-meta.json --preview
sf data360 deploy -o TARGET_ALIAS --api-version 68.0 --data-space default -d data360/data-stream/StreamName.data-stream-meta.json --allow-processing
```

Creation also provisions the landing DLO. Use the actual generated names returned and independently retrieved, not the proposed name, for later selection. Retrieve the target document before editing it. This does not provision a DMO or downstream mapping, extend the source schema, or qualify arbitrary connectors. Run stream commands separately from other resource families.
{% endcapture %}
{% include operation-tabs.html id="stream-definition-create" label="Create" cli_state="unknown" cli_reason="DataStreamDefinition creation has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition creation workflow is supplied." plugin_state="available" plugin_reason="Installed API68/default compatible-connection remap only; processing acknowledgement required." plugin_body=create_plugin %}

{{ create_evidence | markdownify }}

## Update

{% capture update_evidence %}
Updates through `DataStreamDefinition` XML, explicit activation and explicit refresh have **not been verified** here.

The separately qualified native API68 update adds one mapping from an existing source Text field into a new nonprimary DLO Text field. Independent reads confirmed the new stream mapping and DLO field, unchanged prior mappings and fields, the original primary key, source schema, settings and identities, and both stream and DLO ACTIVE. The returned mapping used a `formula` containing the source field label; this is not evidence for arbitrary formula expressions. A label PATCH returned success without changing the label, so label editing is not qualified.

The plugin implementation follows this additive subset: add eligible missing Text mappings, preserve omitted existing mappings, and perform no write when the target already matches. It does not remove mappings or fields, retarget existing pairs, change keys or labels, rewrite the connection schema, or deploy a DLO-to-DMO mapping. Retrieved actual target settings must agree; a proposal label that differs from the generated target label is blocked rather than silently treated as unchanged. The fresh installed API68 target run independently confirmed one such additive mapping and its new DLO field, preserved prior fields, then repeated the same document without another write.

The older [DLO discussion](/next/data-cloud-cli/data-lake-object/#data-lake-object-dlo-customobject-dll) also describes a separate API67 ingestion schema-sync observation. Do not confuse that route with native API68 stream PATCH or XML deployment.

{% endcapture %}
{% capture update_plugin %}
Retrieve the actual target stream first using Retrieve with `TARGET_ALIAS`. Keep its settings, labels, identities and read-only `observed` section. Append one entry to `spec.additiveFieldMappings`, retaining existing entries. This is an entry example, not a complete document:

```json
{
  "sourceFieldLabel": "ContactEmail",
  "targetFieldName": "ExtraContactEmail",
  "targetFieldReturntype": "Text"
}
```

Replace `ContactEmail` with an existing uniquely resolved, nonprimary source-event Text field label. Use a new ordinary target field name without `__c`; the resulting DLO field is `ExtraContactEmail__c`. Do not use a primary, generated/system or existing source-field name as the target.

Run the same exact-file preview and deploy commands from Create, now using the target-retrieved document. Changes require `--allow-processing`; an unchanged repeat does not. The plugin verifies the additive mapping and linked-DLO field independently. Removing entries does not remove existing mappings or fields. Retargeting, label/key/type changes and destructive schema reconciliation are not supported. Prepare the DMO field separately and deploy the DLO-to-DMO mapping last.
{% endcapture %}
{% include operation-tabs.html id="stream-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates, activation and refresh have not been verified here." api_state="unknown" api_reason="The linked ingestion schema-sync route is separate; no DataStreamDefinition API update workflow is supplied." plugin_state="available" plugin_reason="Installed API68/default additive nonprimary Text mapping and zero-write repeat only." plugin_body=update_plugin %}

{{ update_evidence | markdownify }}

## Delete

{% capture delete_evidence %}
Deletion through `DataStreamDefinition` XML remains **unverified**. Native stream deletion is a separate operation with two importantly different outcomes:

- **Preserve the DLO — the default plugin behavior:** remove only the stream, using the native `shouldDeleteDataLakeObject=false` mode. The DLO and its fields remain. Removing the stream does not erase the retained data or schema.
- **Explicitly delete the DLO too:** the native `shouldDeleteDataLakeObject=true` mode requests stream and linked-DLO removal together. The plugin uses `--delete-dlo` for this explicit choice. Fresh installed API68 cross-org cleanup qualified this mode on both owned fixture pairs, with fresh binding/dependency checks and independent stream and DLO absence checks. The DLO removal was a cascade effect of stream deletion, not a separate direct DLO DELETE.

Native API65 and API68 evidence qualified both modes on owned Ingestion API fixtures in the default dataspace, with dependency checks and independent final-state reads. Preserve mode required stream absence plus an unchanged surviving DLO. Delete-DLO mode required stream absence plus linked-DLO absence by both name and persisted ID, with unselected survivors preserved. HTTP204 alone, or an intermediate `DELETING` state, was not completion evidence. No separate direct DLO DELETE or automatic retry was used.

At API66, preserve-DLO deletion succeeded and the full DLO schema survived. That stream had an automatic processing failure whose cause remains unresolved; reported zero row counters are **not** proof of an empty DLO. API66 delete-DLO mode and other lower pins remain unqualified. This is definition-deletion evidence, not proof that automatic processing was harmless or successful.

The older October 30 readback could not resolve a different `DELETING` stream. It remains inconclusive historical evidence; it neither cancels the later bounded successes nor establishes general deletion support. See also the [DLO deletion limitations](/next/data-cloud-cli/data-lake-object/#delete).

{% endcapture %}
{% capture delete_plugin %}
Select only an owned stream by its actual API name. The default preserves its DLO; preview first and check ownership, bindings and dependencies:

```sh
sf data360 delete -o TARGET_ALIAS -m data-stream:StreamName --api-version 68.0 --data-space default --preview
sf data360 delete -o TARGET_ALIAS -m data-stream:StreamName --api-version 68.0 --data-space default
```

**To remove the linked DLO too**, add `--delete-dlo` to both commands. This is destructive cascade removal, not a routine refresh or permission to delete shared/populated resources. The fresh cross-org installed run qualified this explicit mode on its owned fixture pairs; preserve mode has separate bounded evidence, not fresh cross-org qualification. The plugin requires fresh identity/binding/dependency checks and independently verifies final absence (plus unchanged DLO in preserve mode). HTTP204 or `DELETING` alone is not completion. Unknown outcomes stop without automatic retry or rollback.
{% endcapture %}
{% include operation-tabs.html id="stream-definition-delete" label="Delete" cli_state="unknown" cli_reason="DataStreamDefinition deletion has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition deletion workflow is supplied." plugin_state="available" plugin_reason="Guarded exact API68/default deletion; explicit cascade separately selected with --delete-dlo." plugin_body=delete_plugin %}

{{ delete_evidence | markdownify }}
