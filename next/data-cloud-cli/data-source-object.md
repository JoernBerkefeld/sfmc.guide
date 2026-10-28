---
layout: page
title: "Source object configuration | Data Cloud with Salesforce CLI"
description: "Salesforce CLI workflows and verified operation limits for Source object configuration: DataSourceObject."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-source-object/
verification: verified
platforms:
  - next
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="source-object-configuration-datasourceobject"></a>

**Source object configuration** — `DataSourceObject`.

## Retrieve

```sh
sf project retrieve start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to `force-app/main/default/dataSourceObjects/CustomerSource.dataSourceObject-meta.xml`:

```xml
<DataSourceObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataSource>SalesforceSource</dataSource>
  <externalRecordIdentifier>Contact</externalRecordIdentifier>
  <masterLabel>Customer Source</masterLabel>
  <storageType>LOCAL</storageType>
  <templateVersion>1</templateVersion>
</DataSourceObject>
```

This tells you which source record the configuration refers to. It does not include field definitions or a complete connector/credential export.

## Create

Creation has **not been verified**.

## Update

Updates have **not been verified**.

## Delete

Deletion has **not been verified**.
