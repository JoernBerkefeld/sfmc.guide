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
  read: { status: "yes", methods: [cli, api] }
  create: { status: "yes", methods: [cli, api] }
  update: { status: "yes", methods: [cli, api] }
  delete: { status: "yes", methods: [cli, api] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="source-object-configuration-datasourceobject"></a>

**Source object configuration** (`DataSourceObject`) describes one source record that feeds Data Cloud, such as a Salesforce Contact.

**Example:** `CustomerSource`, a configuration for the `Contact` record from `SalesforceSource`.

{% include crud-summary.html %}

**Plugin qualification:** The `sf data360` commands have no source-object family, so this page lists no plugin workflow.

**Records only:** Creating, changing or deleting a source object changes only this metadata record. Salesforce does not check that the named source record exists, and no data stream or data lake object is created or removed. A data stream creates its own source object; change that one only through its data stream.

## Read

{% capture read_cli %}
Downloads the source object definition as XML into your project folder.

```sh
sf project retrieve start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
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

The file names the source record that the configuration refers to. To download every source object without naming each one, leave out the name: `--metadata DataSourceObject`.
{% endcapture %}
{% capture read_metadata %}
`listMetadata` with type `DataSourceObject` returns every name. `readMetadata` with type `DataSourceObject` and those names returns the same fields as the XML file under CLI.
{% endcapture %}
{% include operation-tabs.html id="source-object-read" label="Read" cli_state="available" cli_reason="Downloads one source object, or all of them without naming each, as XML." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Lists every source object and reads each one's fields." metadata_body=read_metadata connect_state="blocked" connect_reason="No Connect resource returns the source object record. A data stream read shows only the connector name and the source record name." plugin_state="blocked" plugin_reason="The sf data360 commands have no source-object family." %}

## Create

{% capture create_cli %}
Creates a source object from a file in your project folder.

Save this as `force-app/main/default/dataSourceObjects/CustomerSource.dataSourceObject-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DataSourceObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <dataSource>SalesforceSource</dataSource>
    <externalRecordIdentifier>Contact</externalRecordIdentifier>
    <masterLabel>Customer Source</masterLabel>
    <storageType>LOCAL</storageType>
    <templateVersion>1</templateVersion>
</DataSourceObject>
```

```sh
sf project deploy start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Created`. Only the record is stored; see **Records only** above.
{% endcapture %}
{% capture create_metadata %}
`createMetadata` with type `DataSourceObject` and the same fields as the XML file under CLI (`fullName`, `dataSource`, `externalRecordIdentifier`, `masterLabel`, `storageType`, `templateVersion`) returns `success: true`. `readMetadata` then returns the stored fields.
{% endcapture %}
{% include operation-tabs.html id="source-object-create" label="Create" cli_state="available" cli_reason="Deploys a new source object record. No data stream is created." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="createMetadata stores a new source object record." metadata_body=create_metadata connect_state="blocked" connect_reason="No Connect resource creates a source object on its own. Creating a data stream creates one as a side effect." plugin_state="blocked" plugin_reason="The sf data360 commands have no source-object family." %}

## Update

{% capture update_cli %}
Change the label or the source record name in the file from Create, then deploy it again:

```sh
sf project deploy start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Changed`. Retrieve the file again to confirm the new values.
{% endcapture %}
{% capture update_metadata %}
`updateMetadata` with type `DataSourceObject` and the complete record (all fields from Create, with the changed `masterLabel` or `externalRecordIdentifier`) returns `success: true`. `readMetadata` returns the new values.
{% endcapture %}
{% include operation-tabs.html id="source-object-update" label="Update" cli_state="available" cli_reason="Changes the label and the source record name of an existing record." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="updateMetadata changes the label and the source record name." metadata_body=update_metadata connect_state="blocked" connect_reason="No Connect resource changes a source object record." plugin_state="blocked" plugin_reason="The sf data360 commands have no source-object family." %}

## Delete

{% capture delete_cli %}
Deletes a source object you created on its own. Do not delete one that a data stream uses.

Save this as `manifest/empty.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <version>68.0</version>
</Package>
```

Save this as `manifest/destructiveChangesPost.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>CustomerSource</members>
        <name>DataSourceObject</name>
    </types>
    <version>68.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Deleted`.
{% endcapture %}
{% capture delete_metadata %}
`deleteMetadata` with type `DataSourceObject` and the name returns `success: true`. A later `readMetadata` returns an empty record.
{% endcapture %}
{% include operation-tabs.html id="source-object-delete" label="Delete" cli_state="available" cli_reason="Deletes a source object record that no data stream uses." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="deleteMetadata removes a source object record." metadata_body=delete_metadata connect_state="blocked" connect_reason="No Connect resource deletes a source object on its own." plugin_state="blocked" plugin_reason="The sf data360 commands have no source-object family." %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Tested scope:** Every operation was run live on API 68.0 on new `Cli…` source objects, which were deleted afterwards. The verification database records it as `data360:b1.datakit-pages.sweep-api68`. This badge does not verify untested writes or general CRUD support.

**Read:** A retrieve without a name (`--metadata DataSourceObject`) downloaded all 39 source objects. `listMetadata` listed them, and `readMetadata` returned the same fields. The files do not include field definitions or a connector or credential export. The Metadata API reference names the folder `mktDataSourceObjects`; the CLI writes `dataSourceObjects`.

**Create, update and delete:** The CLI deploy reported `Created`, `Changed` and `Deleted`; `createMetadata`, `updateMetadata` and `deleteMetadata` returned `success: true`. A source record name that does not exist in the org was accepted, so Salesforce does not validate it. After each delete, `readMetadata` returned an empty record and `listMetadata` no longer listed the name.

**Connect API:** The Data 360 Connect resource catalog has no source-object family; it has data stream, connection, data lake object and data model object families. The data stream list (`GET ssot/data-streams`) shows only `connectorInfo.connectorDetails` with the connector name and source record name, not the source object record. Source objects created by data streams appear in the Metadata API list.

**Not verified:** Deleting a source object that a data stream uses. Field definitions (`dataSourceFields`). Connector or credential export.

</details>
