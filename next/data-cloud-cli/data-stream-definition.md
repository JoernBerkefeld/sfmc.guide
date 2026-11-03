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
  retrieve: { status: "yes", methods: [cli] }
  create: { status: "unknown", methods: [] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

*Documentation update: November 3, 2026. Native evidence and plugin implementation status are distinguished below; this is not a new installed-plugin acceptance run.*

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
- **`sf-plugin-data`:** exact-name retrieve and guarded create/update/unchanged deploy are implemented and verified with synthetic tests. Admission is only `--api-version auto` or `68.0`, default dataspace, and the supported Ingestion API subset. Installed-plugin and live-org acceptance are still pending. Plugin deletion is being implemented; no available plugin delete workflow is claimed here.

The lower-version native evidence does **not** widen the plugin's API68 guard. Neither ACTIVE status nor zero processing counters proves that a DLO has no stored rows. The API66 automatic processing failure remains unresolved even though definition-only preserve-DLO deletion succeeded.

{% include crud-summary.html %}

## Retrieve

The plugin's implemented exact-name selector is `data-stream:API_NAME`. Its portable file is `data360/data-stream/API_NAME.data-stream-meta.json`, separate from the standard XML layout below. It projects supported stream settings and embedded source-to-DLO mappings, checks the linked DLO independently and rejects unsupported shapes rather than claiming a complete connector export. Type-only inventory, wildcard selection and dependency expansion are not supported for this stream subset. This retrieve path has synthetic verification; installed/live acceptance is pending.

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata DataStreamDefinition:CustomerStream --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
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
{% include operation-tabs.html id="stream-definition-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve stream XML without starting a refresh; not a complete ingestion setup." cli_body=retrieve_cli api_state="unknown" api_reason="No API DataStreamDefinition retrieval workflow is supplied." %}

## Create

{% capture create_evidence %}
Creation through `DataStreamDefinition` XML has **not been verified**. Native API68 creation was separately qualified for a fresh Ingestion API stream and its new `Other` DLO in the default dataspace. The existing connection and source schema were checked first; the create request supplied only the primary key in the DLO field array. Independent stream and DLO reads, not the create response alone, established their identities and ACTIVE state. Salesforce generated the actual names, which differed from the proposed names.

This narrow result does not turn XML retrieval into a deployable ingestion setup. The [DLO creation discussion](/next/data-cloud-cli/data-lake-object/#create) retains the separate connection/schema requirements. Do not replay a complete GET response as a create body, create missing connections implicitly or infer cross-org portability.

The plugin deploy implementation resolves the logical source binding before choosing create, update or unchanged. It requires `--allow-processing` for changes and supports read-only `--preview`. It blocks mixed resource families, dependency expansion, Git selection and unsupported versions or scopes for streams. These are implemented safeguards with synthetic verification, not installed/live acceptance.

### Documented native stream API availability

The [Data 360 Connect REST API reference, version 67.0](https://developer.salesforce.com/docs/data/connectapi/references/spec?meta=type%3AData+Stream+Source+Field+Output), documents native `POST /ssot/data-streams` as available since **60.0**. Its marked required top-level inputs are `connectorInfo`, `label`, `mappings`, `name`, `refreshConfig` and `sourceFields`; `datastreamType` includes `INGEST_API`. New `dataLakeObjectInfo` and `existingDataLakeObjectInfo` are alternatives. For Ingestion API streams, `dataLakeFieldInputRepresentations` must contain **only the primary key field**, not the complete event schema. This is distinct from preserving the complete connection schema before a schema PUT.

These are **reference inputs, not a general ingestion CREATE recipe**. The narrow API68 qualification above is separate from this API67 reference and its S3 example. The readable reference describes `dataLakeObjectInfo` as an array while its S3 request example uses an object; no shape is chosen here. The extracted endpoint section did not supply nested ingestion connector/event inputs or an Ingestion API request/response example, so no native ingestion payload is inferred. POST lists `200` success; the visible S3 response has stream `id`, `name`, `recordId` and `status`, plus DLO `id`, `name` and `status`, with both statuses `PROCESSING`. That example does not establish ingestion identity correlation or settled success.

Native `GET /ssot/data-streams` and `GET /ssot/data-streams/{recordIdOrDeveloperName}` are also documented since 60.0. The native list documents `connectionName`, `filter`, `includeMappings`, `limit` (1–200, default 10), `offset` and `orderBy`. **No `sourceObjectName` query parameter is documented in that list**; do not transfer the facade discovery's filter to native REST. Its Salesforce CRM examples are not an ingestion event-binding contract.

The reference alone does not establish conflict-safe duplicate creation, permission-aware authoritative absence, restart/lost-response recovery or terminal processing settlement. A unique-name description, an empty list or list-then-create is not a nonoverwrite or ownership guarantee. The narrow implementation checks described above do not establish general recovery or API67 native/facade parity.

Salesforce also documents native API 67 stream GET/PATCH in its [CRM field-disablement guide](https://developer.salesforce.com/docs/data/connectapi/guide/data-stream-use-case.md). That connector-specific update use case is not an ingestion CREATE contract or proof that arbitrary connector payloads can be replayed.

{% endcapture %}
{% include operation-tabs.html id="stream-definition-create" label="Create" cli_state="unknown" cli_reason="DataStreamDefinition creation has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition creation workflow is supplied." %}

{{ create_evidence | markdownify }}

## Update

{% capture update_evidence %}
Updates through `DataStreamDefinition` XML, explicit activation and explicit refresh have **not been verified** here.

The separately qualified native API68 update adds one mapping from an existing source Text field into a new nonprimary DLO Text field. Independent reads confirmed the new stream mapping and DLO field, unchanged prior mappings and fields, the original primary key, source schema, settings and identities, and both stream and DLO ACTIVE. The returned mapping used a `formula` containing the source field label; this is not evidence for arbitrary formula expressions. A label PATCH returned success without changing the label, so label editing is not qualified.

The plugin implementation follows this additive subset: add eligible missing Text mappings, preserve omitted existing mappings, and perform no write when the target already matches. It does not remove mappings or fields, retarget existing pairs, change keys or labels, rewrite the connection schema, or deploy a DLO-to-DMO mapping. Retrieved actual target settings must agree; a proposal label that differs from the generated target label is blocked rather than silently treated as unchanged. Its synthetic tests do not establish installed/live support.

The older [DLO discussion](/next/data-cloud-cli/data-lake-object/#data-lake-object-dlo-customobject-dll) also describes a separate API67 ingestion schema-sync observation. Do not confuse that route with native API68 stream PATCH or XML deployment.

{% endcapture %}
{% include operation-tabs.html id="stream-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates, activation and refresh have not been verified here." api_state="unknown" api_reason="The linked ingestion schema-sync route is separate; no DataStreamDefinition API update workflow is supplied." %}

{{ update_evidence | markdownify }}

## Delete

{% capture delete_evidence %}
Deletion through `DataStreamDefinition` XML remains **unverified**. Native stream deletion is a separate operation with two importantly different outcomes:

- **Preserve the DLO — the default intended plugin behavior:** remove only the stream, using the native `shouldDeleteDataLakeObject=false` mode. The DLO and its fields remain. Removing the stream does not erase the retained data or schema.
- **Explicitly delete the DLO too:** the native `shouldDeleteDataLakeObject=true` mode requests stream and linked-DLO removal together. The plugin design reserves `--delete-dlo` for this explicit choice, but plugin delete implementation and installed/live acceptance are not complete. Do not treat this flag description as an available workflow.

Native API65 and API68 evidence qualified both modes on owned Ingestion API fixtures in the default dataspace, with dependency checks and independent final-state reads. Preserve mode required stream absence plus an unchanged surviving DLO. Delete-DLO mode required stream absence plus linked-DLO absence by both name and persisted ID, with unselected survivors preserved. HTTP204 alone, or an intermediate `DELETING` state, was not completion evidence. No separate direct DLO DELETE or automatic retry was used.

At API66, preserve-DLO deletion succeeded and the full DLO schema survived. That stream had an automatic processing failure whose cause remains unresolved; reported zero row counters are **not** proof of an empty DLO. API66 delete-DLO mode and other lower pins remain unqualified. This is definition-deletion evidence, not proof that automatic processing was harmless or successful.

The older October 30 readback could not resolve a different `DELETING` stream. It remains inconclusive historical evidence; it neither cancels the later bounded successes nor establishes general deletion support. See also the [DLO deletion limitations](/next/data-cloud-cli/data-lake-object/#delete).

{% endcapture %}
{% include operation-tabs.html id="stream-definition-delete" label="Delete" cli_state="unknown" cli_reason="DataStreamDefinition deletion has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition deletion workflow is supplied." %}

{{ delete_evidence | markdownify }}
