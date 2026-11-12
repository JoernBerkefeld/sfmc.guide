---
layout: page
title: "Source object configuration"
description: "Salesforce CLI workflows and verified operation limits for Source object configuration: DataSourceObject."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-source-object/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli] }
  create: { status: "unknown", methods: [] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="source-object-configuration-datasourceobject"></a>

**Source object configuration** (`DataSourceObject`) describes one source record that feeds Data Cloud, such as a Salesforce Contact.

**Example:** `CustomerSource`, a configuration for the `Contact` record from `SalesforceSource`.

{% include crud-summary.html %}

**Plugin qualification:** This page does not list an sf-plugin-data workflow for source objects.

## Read

{% capture read_cli %}
Downloads the source object definition as XML into your project folder.

```sh
sf project retrieve start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --wait 5
```

The command writes this file, `force-app/main/default/dataSourceObjects/CustomerSource.dataSourceObject-meta.xml`:

```xml
<DataSourceObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataSource>SalesforceSource</dataSource>
  <externalRecordIdentifier>Contact</externalRecordIdentifier>
  <masterLabel>Customer Source</masterLabel>
  <storageType>LOCAL</storageType>
  <templateVersion>1</templateVersion>
</DataSourceObject>
```

The file names the source record that the configuration refers to.
{% endcapture %}
{% include operation-tabs.html id="source-object-read" label="Read" cli_state="available" cli_reason="Downloads the source object definition as XML." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API workflow for reading a source object has been tested." %}

## Create

{% include operation-tabs.html id="source-object-create" label="Create" cli_state="unknown" cli_reason="Creating a source object has not been tested." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API workflow for creating a source object has been tested." %}

## Update

{% include operation-tabs.html id="source-object-update" label="Update" cli_state="unknown" cli_reason="Updating a source object has not been tested." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API workflow for updating a source object has been tested." %}

## Delete

{% include operation-tabs.html id="source-object-delete" label="Delete" cli_state="unknown" cli_reason="Deleting a source object has not been tested." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API workflow for deleting a source object has been tested." %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Tested scope:** Live-org reads and the bounded operations described here were tested. This badge does not verify untested writes or general CRUD support.

**Read:** The CLI retrieve was run with `--api-version 65.0`. The saved XML names the source record. It does not include field definitions or a complete connector or credential export.

**Not verified:** Create, update and delete of source objects. Any API retrieval of source objects. Field definitions, and connector or credential export.

</details>