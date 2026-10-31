---
layout: page
title: "Data stream configuration"
description: "Salesforce CLI workflows and verified operation limits for Data stream configuration: DataStreamDefinition."
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

*Last updated: October 30, 2026, 15:50 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-stream-configuration-datastreamdefinition"></a>

**Data stream configuration** — `DataStreamDefinition`.

{% include crud-summary.html %}

## Retrieve

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

Creation through `DataStreamDefinition` XML has **not been verified**. The [DLO creation discussion](/next/data-cloud-cli/data-lake-object/#create) separates the documented specialized Ingestion API connection/schema/stream contract, including an explicit primary key, from the earlier bounded runtime observation. Neither establishes a safe general-purpose stream creation workflow.

### Documented native stream API availability

The [Data 360 Connect REST API reference, version 67.0](https://developer.salesforce.com/docs/data/connectapi/references/spec?meta=type%3AData+Stream+Source+Field+Output), documents native `POST /ssot/data-streams` as available since **60.0**. Its marked required top-level inputs are `connectorInfo`, `label`, `mappings`, `name`, `refreshConfig` and `sourceFields`; `datastreamType` includes `INGEST_API`. New `dataLakeObjectInfo` and `existingDataLakeObjectInfo` are alternatives. For Ingestion API streams, `dataLakeFieldInputRepresentations` must contain **only the primary key field**, not the complete event schema. This is distinct from preserving the complete connection schema before a schema PUT.

These are **documented inputs, not live-qualified native ingestion CREATE support**. The readable reference describes `dataLakeObjectInfo` as an array while its S3 request example uses an object; no shape is chosen here. The extracted endpoint section did not supply nested ingestion connector/event inputs or an Ingestion API request/response example, so no native ingestion payload is inferred. POST lists `200` success; the visible S3 response has stream `id`, `name`, `recordId` and `status`, plus DLO `id`, `name` and `status`, with both statuses `PROCESSING`. That example does not establish ingestion identity correlation or settled success.

Native `GET /ssot/data-streams` and `GET /ssot/data-streams/{recordIdOrDeveloperName}` are also documented since 60.0. The native list documents `connectionName`, `filter`, `includeMappings`, `limit` (1–200, default 10), `offset` and `orderBy`. **No `sourceObjectName` query parameter is documented in that list**; do not transfer the facade discovery's filter to native REST. Its Salesforce CRM examples are not an ingestion event-binding contract.

Conflict-safe duplicate creation, permission-aware authoritative absence, restart/lost-response recovery and terminal processing settlement remain **unknown**. A unique-name description, an empty list or list-then-create is not a nonoverwrite or ownership guarantee. Documentation does not establish API 67 native/facade parity or a supplied safe CREATE workflow.

Salesforce also documents native API 67 stream GET/PATCH in its [CRM field-disablement guide](https://developer.salesforce.com/docs/data/connectapi/guide/data-stream-use-case.md). That connector-specific update use case is not an ingestion CREATE contract or proof that arbitrary connector payloads can be replayed.

{% include operation-tabs.html id="stream-definition-create" label="Create" cli_state="unknown" cli_reason="DataStreamDefinition creation has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition creation workflow is supplied." %}

## Update

Updates through this Metadata API definition, explicit activation and explicit refresh have **not been verified** here. The [DLO section](/next/data-cloud-cli/data-lake-object/#data-lake-object-dlo-customobject-dll) describes the separately tested API 67 Ingestion API stream creation and additive schema-sync route; it is not a `DataStreamDefinition` XML deployment.

{% include operation-tabs.html id="stream-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates, activation and refresh have not been verified here." api_state="unknown" api_reason="The linked ingestion schema-sync route is separate; no DataStreamDefinition API update workflow is supplied." %}

## Delete

Deletion has **not been verified**. In the October 30 Ingestion API readback, the retained source connection/schema did not resolve a previously `DELETING` stream's outcome, and stream-list controls were empty. This remains **unknown**, not proof that stream operations are unsupported or that deletion completed. See the [DLO deletion limitations](/next/data-cloud-cli/data-lake-object/#delete).

{% include operation-tabs.html id="stream-definition-delete" label="Delete" cli_state="unknown" cli_reason="DataStreamDefinition deletion has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition deletion workflow is supplied." %}
