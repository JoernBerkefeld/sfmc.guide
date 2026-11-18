---
layout: page
title: "Data Kit template"
description: "Salesforce CLI workflows and verified operation limits for Kit template: DataKitObjectTemplate."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-kit-object-template/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api] }
  create: { status: "partial", methods: [cli, api] }
  update: { status: "partial", methods: [cli, api] }
  delete: { status: "yes", methods: [cli, api] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="kit-template-datakitobjecttemplate"></a>

A **data kit** groups configuration so it can be reused. A **data kit template** (`DataKitObjectTemplate`) stores the settings of one component in that kit. The template is a saved copy, not the live component.

**Example used in every chapter:** `CustomerGraph`, a Data Graph template.

{% include crud-summary.html %}

**Plugin qualification:** No `sf-plugin-data` workflow is tested for this template. Only the Salesforce CLI and Metadata API workflows below apply.

## Read

{% capture read_cli %}
Downloads the stored template into your project folder.

```sh
sf project retrieve start --metadata DataKitObjectTemplate:CustomerGraph --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The file is written to `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`. Its `entityPayload` element holds the template content as escaped JSON:

```xml
<DataKitObjectTemplate xmlns="http://soap.sforce.com/2006/04/metadata">
  <entityPayload><!-- XML-escaped JSON payload omitted. --></entityPayload>
  <sourceObjectType>DataGraph</sourceObjectType>
  <templateVersion>1</templateVersion>
  <!-- Other retrieved template attributes omitted. -->
</DataKitObjectTemplate>
```

To download every template without naming each one, leave out the name: `--metadata DataKitObjectTemplate`.

A Data Graph template can hold projected fields, joins and refresh settings. An Identity Resolution template can hold matching and reconciliation rules. Segment templates omit the live publish schedule and status.

Keep the full payload and every reference. Source IDs and external data lake object references can stop the template from working in another org. The saved template does not update when the live component changes.

{% endcapture %}
{% capture read_metadata %}
`listMetadata` with type `DataKitObjectTemplate` returns every template name. `readMetadata` with those names returns `entityPayload` (the JSON as a string), `masterLabel`, `sourceObject`, `sourceObjectType` and `templateVersion`.
{% endcapture %}
{% include operation-tabs.html id="kit-template-read" label="Read" cli_state="available" cli_reason="Retrieves one stored template, or all of them without naming each. It does not retrieve the live component." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Lists every template and reads its full payload." metadata_body=read_metadata connect_state="blocked" connect_reason="The Connect kit manifest lists template names and IDs only. No Connect resource returns a template payload." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Create

{% capture create_cli %}
Stores the existing template file in the org.

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The command reads `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml` and reports the component as `Created`. The template is stored only. No live graph is created and no kit is installed.

The XML excerpt under Read is not a complete creation file. Start from a complete retrieved template, then retrieve it again to compare its decoded payload.

{% endcapture %}
{% capture create_metadata %}
`createMetadata` with type `DataKitObjectTemplate` and a complete record (`fullName`, `masterLabel`, `entityPayload`, `sourceObject`, `sourceObjectType`, `templateVersion`) stores the template on its own, without a kit definition or membership. `readMetadata` returns the same decoded payload.
{% endcapture %}
{% include operation-tabs.html id="kit-template-create" label="Create" cli_state="available" cli_reason="Stores a copy of a complete existing Data Graph template. No live graph is created and no kit is installed." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="createMetadata stores a copy of a complete Data Graph template on its own." metadata_body=create_metadata connect_state="blocked" connect_reason="The Connect kit resource deploys or undeploys runtime components; it does not store a template." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Update

{% capture update_cli %}
Changes the description inside the `entityPayload` of a Data Graph template, then deploys it.

Decode the JSON, change only the description, then encode it as XML text again. Leave the root, fields, keys, types and other settings as they are. The `masterLabel` can change in the same deploy.

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Changed`. The update changes the stored template only. It does not change a live graph. Retrieve the template and compare the decoded payload to confirm the change.

{% endcapture %}
{% capture update_metadata %}
`updateMetadata` with type `DataKitObjectTemplate` and the complete record, with a changed `masterLabel` and a changed `description` inside `entityPayload`, returns `success: true`. `readMetadata` returns both new values.
{% endcapture %}
{% include operation-tabs.html id="kit-template-update" label="Update" cli_state="available" cli_reason="Changes the label and the payload description of a Data Graph template. It does not change a live graph." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="updateMetadata changes the label and the payload description." metadata_body=update_metadata connect_state="blocked" connect_reason="The Connect kit resource deploys or undeploys runtime components; it does not change a template." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Delete

{% capture delete_cli %}
Deletes one stored template. Delete its membership links first (see the [membership page](/next/data-cloud-cli/data-package-kit-object/#delete)).

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
        <members>CustomerGraph</members>
        <name>DataKitObjectTemplate</name>
    </types>
    <version>68.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Deleted`. The live graph is not touched.
{% endcapture %}
{% capture delete_metadata %}
`deleteMetadata` with type `DataKitObjectTemplate` and the name returns `success: true`. A later `readMetadata` returns an empty record.
{% endcapture %}
{% include operation-tabs.html id="kit-template-delete" label="Delete" cli_state="available" cli_reason="Deletes one stored template after its membership links are gone. The live component is not touched." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="deleteMetadata removes one stored template." metadata_body=delete_metadata connect_state="blocked" connect_reason="DELETE on the Connect kit resource undeploys runtime components; it does not delete a template." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

For how moving a kit differs from installing it, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Every operation was run live on API 68.0 on new `Cli…` templates copied from an existing Data Graph template, and all of them were deleted afterwards. The verification database records it as `data360:b1.datakit-pages.sweep-api68`. No `sf-plugin-data` command (`--preview`, `--dataspace`, `--async`, `--wait-timeout`, `--keep-local-files`) applies to templates. This badge does not verify untested writes or general CRUD support.

**Versions and aliases:** The `sf project` commands on this page pass `--api-version 68.0`. `SOURCE_ALIAS` and `TARGET_ALIAS` are placeholders for your own org aliases.

**Read:** A retrieve without a name downloaded every template in the org. `listMetadata` and `readMetadata` returned the same templates with their full payload. The Connect kit manifest (`GET ssot/datakit/{kit}/manifest`) lists only template names and IDs.

**Create:** A CLI deploy (together with a kit definition and membership) and a `createMetadata` call on its own each stored a copy of a Data Graph template. The decoded payload read back unchanged. Only Data Graph templates were tested. No live graph was created.

**Update:** A CLI deploy and `updateMetadata` each changed the `masterLabel` and the `description` inside the payload; both read back. Other payload changes were not tested.

**Delete:** After its membership link was deleted, a destructive CLI deploy and `deleteMetadata` each removed one template on its own. The live graph that the template was copied from was still readable afterwards.

**Connect API:** The Connect kit resource `ssot/data-kits/{kit}` accepts `GET`, `POST`, `PATCH` and `DELETE` (a `PUT` returns `METHOD_NOT_ALLOWED`). `POST` and `PATCH` deploy runtime components and `DELETE` undeploys them. None of them stores, changes or removes the template record. They were not run against a real kit, because that would create or remove live components.

**Not verified:** Templates of other kinds (Identity Resolution, segment) created or changed through the API. Runtime creation and kit installation. Full graph updates through templates.

</details>
