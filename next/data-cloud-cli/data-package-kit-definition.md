---
layout: page
title: "Data Kit definition"
description: "Salesforce CLI workflows and verified operation limits for Kit definition: DataPackageKitDefinition."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-package-kit-definition/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "partial", methods: [cli, api] }
  create: { status: "yes", methods: [cli, api] }
  update: { status: "partial", methods: [cli, api] }
  delete: { status: "yes", methods: [cli, api] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="kit-definition-datapackagekitdefinition"></a>

**Data Kit definition** (`DataPackageKitDefinition`) is the metadata record that names a kit. Its templates and membership links are separate components with their own pages.

**Example used in every chapter:** `CustomerIdentityKit`, an Identity Resolution kit definition with a `CustomerIdentityTemplate` template and a `CustomerIdentityMember` membership link.

{% include crud-summary.html %}

**Plugin qualification:** No plugin workflow for kit definitions is listed in this guide. The `sf data360` commands have no data kit family.

**Known failure:** A kit definition created through the CLI or the Metadata API could not be read or updated while it had a membership link. Retrieve skipped it with "Load of metadata from db failed", and `readMetadata` and `updateMetadata` returned `UNKNOWN_EXCEPTION`. Without its membership link both work, and the existing kits in the test org (stored with `dataKitSource` `LOCAL`) read fine with their links.

## Read

{% capture read_cli %}
Downloads the example kit definition with its templates and membership links, using the combined retrieval.

Use the [combined kit retrieval](/next/data-cloud-cli/data-package-kit-object/#read). It saves the definition at `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`. Keep the templates and membership links with it for a complete snapshot. To download every definition without naming each one, use `--metadata DataPackageKitDefinition`.

Excerpt of the saved definition. Other attributes are omitted:

```xml
<DataPackageKitDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <isEnabled>false</isEnabled>
  <isDeployed>false</isDeployed>
  <!-- Retrieved ordering, state and other attributes omitted. -->
</DataPackageKitDefinition>
```

These flags do not switch off schedules or automatic runs embedded in component templates.
{% endcapture %}
{% capture read_metadata %}
`listMetadata` with type `DataPackageKitDefinition` returns every definition name. `readMetadata` with those names returns `dataKitSource`, `dataKitType`, `dataSpaceDefinitionDevName`, `deploymentOrder` (when set), `developerName`, `isDeployed`, `isEnabled`, `masterLabel`, `useDeterministicNaming` and `versionNumber`. See **Known failure** above.
{% endcapture %}
{% capture read_connect %}
Reads one kit by name, with its components and publishing order:

```sh
sf api request rest "services/data/v68.0/ssot/data-kits/CustomerIdentityKit" --target-org SOURCE_ALIAS
```

The reply has `dataKitDetails` with `components`, `dataKitSource`, `dataKitType`, `developerName`, `label` and `publishingSequence`. The manifest lists the kit's metadata names and IDs:

```sh
sf api request rest "services/data/v68.0/ssot/datakit/CustomerIdentityKit/manifest" --target-org SOURCE_ALIAS
```

The list resource (`GET ssot/data-kits`) failed in the test org with `INTERNAL_SERVER_ERROR`, so each kit must be named.
{% endcapture %}
{% include operation-tabs.html id="kit-definition-read" label="Read" cli_state="available" cli_reason="Retrieves one definition or all of them. A CLI- or API-created definition with a membership link is skipped." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Lists and reads every definition, except a CLI- or API-created one that has a membership link." metadata_body=read_metadata connect_state="available" connect_reason="Reads one named kit and its manifest. The list resource failed in the test org." connect_body=read_connect plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Create

{% capture create_cli %}
Deploys the kit definition, its template and its membership link together, to the source org.

Run this from an isolated Salesforce project. Its `force-app` folder must contain exactly these three files, with matching references:

- `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/CustomerIdentityTemplate.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerIdentityMember.DataPackageKitObject-meta.xml`

Replace the example names with your own. The template content must already be complete. This command does not generate it.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 68.0
```

A definition can also be deployed on its own with `--metadata DataPackageKitDefinition:CustomerIdentityKit`. Salesforce stores `dataKitSource` as `EXTERNAL`, whatever the file says.

A shortened result is under Evidence.
{% endcapture %}
{% capture create_metadata %}
`createMetadata` with type `DataPackageKitDefinition` creates a definition on its own. The tested record had `fullName`, `developerName`, `masterLabel`, `dataKitSource`, `dataKitType` (`SANDBOX`), `dataSpaceDefinitionDevName` (`default`), `isDeployed`, `isEnabled`, `useDeterministicNaming` and `versionNumber`. `readMetadata` returned it with `dataKitSource` set to `EXTERNAL`.
{% endcapture %}
{% include operation-tabs.html id="kit-definition-create" label="Create" cli_state="available" cli_reason="Creates the definition alone or with its template and membership link." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="createMetadata creates a definition on its own." metadata_body=create_metadata connect_state="blocked" connect_reason="The Connect kit resource deploys runtime components from an existing kit; it does not create a definition." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Update

{% capture update_cli %}
Change the label or other fields in the definition file, then deploy only the definition:

```sh
sf project deploy start --metadata DataPackageKitDefinition:CustomerIdentityKit --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Changed`. While the definition has a membership link, the same deploy fails with "An unexpected error occurred". Delete the membership link first, update the definition, then create the link again.
{% endcapture %}
{% capture update_metadata %}
`updateMetadata` with type `DataPackageKitDefinition` and the complete record changed `masterLabel`, `versionNumber` and `description`; `readMetadata` returned the new values. With a membership link present, it returned `UNKNOWN_EXCEPTION`.
{% endcapture %}
{% include operation-tabs.html id="kit-definition-update" label="Update" cli_state="available" cli_reason="Changes a definition that has no membership link. Fails while a link exists." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="updateMetadata changes a definition that has no membership link." metadata_body=update_metadata connect_state="blocked" connect_reason="PATCH on the Connect kit resource deploys runtime components; it does not change the definition." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Delete

{% capture delete_cli %}
Deletes the example kit definition, its template and its membership link in one deployment. Use only components you own.

Save this as `manifest/empty.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

Save this as `manifest/destructiveChangesPost.xml`. It names the three components to remove. Change the names to your own components:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerIdentityTemplate</members>
    <name>DataKitObjectTemplate</name>
  </types>
  <types>
    <members>CustomerIdentityMember</members>
    <name>DataPackageKitObject</name>
  </types>
  <types>
    <members>CustomerIdentityKit</members>
    <name>DataPackageKitDefinition</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0
```

To delete only the definition, name just it in `destructiveChangesPost.xml`. Delete its membership links first. The definition alone was deleted this way on API 68.0.

A shortened result is under Evidence.
{% endcapture %}
{% capture delete_metadata %}
`deleteMetadata` with type `DataPackageKitDefinition` and the name returns `success: true`. A later `readMetadata` returns an empty record, and the Connect kit read answers "Data Kit: … not found".
{% endcapture %}
{% include operation-tabs.html id="kit-definition-delete" label="Delete" cli_state="available" cli_reason="Deletes the definition with its template and membership link, or on its own after its links are gone." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="deleteMetadata removes a definition." metadata_body=delete_metadata connect_state="blocked" connect_reason="DELETE on the Connect kit resource undeploys runtime components; it does not delete the definition." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

For the difference between moving a kit and installing it, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Every operation was run live on API 68.0 on new `Cli…` kits, which were deleted afterwards. The verification database records it as `data360:b1.datakit-pages.sweep-api68`. The joint deletion recipe comes from an earlier API 65.0 run. No `sf-plugin-data` command (`--preview`, `--dataspace`, `--async`, `--wait-timeout`, `--keep-local-files`) applies to kits. This badge does not verify untested writes or general CRUD support.

**Read:** A retrieve without a name, and `listMetadata` with `readMetadata`, returned both existing kits in the test org, including one with three membership links. A kit definition created through the CLI or `createMetadata` read fine until a membership link was added. After that, the retrieve reported "Load of metadata from db failed for metadata of type:DataPackageKitDefinition", and `readMetadata` returned `UNKNOWN_EXCEPTION`. The Connect kit read and manifest still answered for it.

**Create:** The joint CLI deploy reported all three components as `Created`. A shortened structured reply (`--json`) is shown below. It is an illustration, not an exact reply:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

`createMetadata` created a definition on its own. In both cases `dataKitSource` was stored as `EXTERNAL` although the request said `LOCAL`.

**Update:** With no membership link, a definition-only CLI deploy reported `Changed`, and `updateMetadata` changed `masterLabel`, `versionNumber` and `description`. With a link, the joint CLI deploy failed on the definition ("An unexpected error occurred. Please include this ErrorId…"), which rolled back the whole deploy. A definition-only deploy and `updateMetadata` failed the same way. A `deploymentOrder` value sent with `updateMetadata` was not stored.

**Delete:** The joint deletion (API 65.0) reported all three components as `Deleted`. A shortened structured reply (`--json`) is shown below. It is an illustration, not an exact reply:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Deleted" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Deleted" },
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Deleted" }
] } }
```

On API 68.0, a destructive CLI deploy and `deleteMetadata` each removed a definition on its own after its membership link was deleted.

**Connect API:** `GET ssot/data-kits/{kit}` and `GET ssot/datakit/{kit}/manifest` read a named kit. `GET ssot/data-kits` failed with `INTERNAL_SERVER_ERROR` ("… DataSourceBundleDefinition.getDeveloperName() … bundle is null") in the test org. The kit resource also accepts `POST`, `PATCH` and `DELETE` (a `PUT` returns `METHOD_NOT_ALLOWED`); those deploy or undeploy runtime components and were not run, because that would create or remove live components.

**Not verified:**

- Runtime installation and runtime undeployment.
- Cleanup of generated objects after deletion.
- Cross-org replay of the create or delete workflows.
- Why a CLI- or API-created definition with a membership link cannot be read.

</details>
