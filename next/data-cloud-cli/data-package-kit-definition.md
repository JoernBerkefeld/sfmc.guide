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
  read: { status: "yes", methods: [cli] }
  create: { status: "partial", methods: [cli] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Read its setup, placeholders and safety guidance before running these examples.

<a id="kit-definition-datapackagekitdefinition"></a>

**Data Kit definition** (`DataPackageKitDefinition`) is the metadata record that names a kit. Its templates and membership links are separate components with their own pages.

**Example used in every chapter:** `CustomerIdentityKit`, an Identity Resolution kit definition with a `CustomerIdentityTemplate` template and a `CustomerIdentityMember` membership link.

{% include crud-summary.html %}

**Plugin qualification:** No plugin workflow for kit definitions is listed in this guide.

## Read

{% capture read_cli %}
Downloads the example kit definition with its templates and membership links, using the combined retrieval.

Use the [combined kit retrieval](/next/data-cloud-cli/data-package-kit-object/#read). It saves the definition at `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`. Keep the templates and membership links with it for a complete snapshot.

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

{% include operation-tabs.html id="kit-definition-read" label="Read" cli_state="available" cli_reason="Uses the linked combined retrieval, which also saves templates and membership links." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
Deploys the kit definition, its template and its membership link together, to the source org.

Run this from an isolated Salesforce project. Its `force-app` folder must contain exactly these three files, with matching references:

- `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/CustomerIdentityTemplate.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerIdentityMember.DataPackageKitObject-meta.xml`

Replace the example names with your own. The template content must already be complete. This command does not generate it.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0
```

An exact reply is not in this guide yet. Evidence has a shortened example.
{% endcapture %}

{% include operation-tabs.html id="kit-definition-create" label="Create" cli_state="available" cli_reason="Creates the three components together in the source org. Needs three complete, matching files." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API creation workflow is supplied." %}

## Update

{% include operation-tabs.html id="kit-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates have not been tested. No workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API definition-update workflow is supplied." %}

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

An exact reply is not in this guide yet. Evidence has a shortened example.
{% endcapture %}

{% include operation-tabs.html id="kit-definition-delete" label="Delete" cli_state="available" cli_reason="Deletes the three owned components together in the source org." cli_body=delete_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API deletion workflow is supplied." %}

For the difference between moving a kit and installing it, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply. This badge does not verify untested writes or general CRUD support.

**Create:** The joint deployment was tested in the source org with the three complete, compatible files. A shortened structured reply (`--json`) is shown below. It is an illustration, not an exact reply:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

This proves joint metadata creation only. It does not prove independent member creation, runtime installation or cross-org replay.

**Delete:** The joint deletion was tested on the owned source-org definition, template and membership link. A shortened structured reply (`--json`) is shown below. It is an illustration, not an exact reply:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Deleted" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Deleted" },
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Deleted" }
] } }
```

This proves joint metadata deletion only.

**Not verified:**

- Definition updates of any kind.
- Independent creation of a membership link or template.
- Independent deletion of arbitrary membership links.
- Runtime installation and runtime undeployment.
- Cleanup of generated objects after deletion.
- Cross-org replay of the create or delete workflows.
- The Metadata API and Connect API called directly for this component. No separate workflow is supplied.

</details>