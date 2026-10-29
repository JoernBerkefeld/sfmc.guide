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
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-stream-configuration-datastreamdefinition"></a>

**Data stream configuration** — `DataStreamDefinition`.

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

Creation has **not been verified**.

{% include operation-tabs.html id="stream-definition-create" label="Create" cli_state="unknown" cli_reason="DataStreamDefinition creation has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition creation workflow is supplied." %}

## Update

Updates through this Metadata API definition, explicit activation and explicit refresh have **not been verified** here. The [DLO section](/next/data-cloud-cli/data-lake-object/#data-lake-object-dlo-customobject-dll) describes the separately tested API 67 Ingestion API stream creation and additive schema-sync route; it is not a `DataStreamDefinition` XML deployment.

{% include operation-tabs.html id="stream-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates, activation and refresh have not been verified here." api_state="unknown" api_reason="The linked ingestion schema-sync route is separate; no DataStreamDefinition API update workflow is supplied." %}

## Delete

Deletion has **not been verified**.

{% include operation-tabs.html id="stream-definition-delete" label="Delete" cli_state="unknown" cli_reason="DataStreamDefinition deletion has not been verified; no workflow is supplied." api_state="unknown" api_reason="No API DataStreamDefinition deletion workflow is supplied." %}
