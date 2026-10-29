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
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="kit-definition-datapackagekitdefinition"></a>

**Data Kit definition** — `DataPackageKitDefinition`.

## Retrieve

{% capture retrieve_cli %}
Use the [combined kit retrieval](/next/data-cloud-cli/data-package-kit-object/#retrieve). Its `files` response includes `DataPackageKitDefinition:CustomerKit`, written to `force-app/main/default/dataPackageKitDefinitions/CustomerKit.dataPackageKitDefinition-meta.xml`. Keep the templates and membership links alongside it for a complete snapshot.

```xml
<DataPackageKitDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <isEnabled>false</isEnabled>
  <isDeployed>false</isDeployed>
  <!-- Retrieved ordering, state and other attributes omitted. -->
</DataPackageKitDefinition>
```

These flags do not switch off schedules or automatic runs embedded in component templates.

{% endcapture %}
{% include operation-tabs.html id="kit-definition-retrieve" label="Retrieve" cli_state="available" cli_reason="Use the linked combined kit retrieval to retain templates and membership links." cli_body=retrieve_cli api_state="unknown" api_reason="No separate API retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
An owned Identity Resolution kit definition, substantive template and membership link have been created **together in the source org**. Run this only from an isolated Salesforce project whose `force-app` directory contains exactly those three complete, compatible metadata files, with matching references:

- `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/CustomerIdentityTemplate.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerIdentityMember.DataPackageKitObject-meta.xml`

These are local project-relative paths; replace the illustrative names with your own. The complete Identity Resolution template content must already exist—these paths are not a template generator.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Shortened illustrative response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

This proves joint metadata creation only, not independent member creation, runtime installation or cross-org replay.

{% endcapture %}
{% include operation-tabs.html id="kit-definition-create" label="Create" cli_state="available" cli_reason="Joint source-org metadata creation only; requires the three complete compatible files." cli_body=create_cli api_state="unknown" api_reason="No separate API creation workflow is supplied." %}

## Update

Definition updates have **not been verified**.

{% include operation-tabs.html id="kit-definition-update" label="Update" cli_state="unknown" cli_reason="Definition updates have not been verified; no workflow is supplied." api_state="unknown" api_reason="No API definition-update workflow is supplied." %}

## Delete

{% capture delete_cli %}
The owned source-org definition, template and membership link have also been deleted **together**. For the same three components, the generated local `manifest/empty.xml` contains only the package namespace and API version:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

The generated local `manifest/destructiveChangesPost.xml` selects the exact three components to remove. Replace these illustrative names only with components you own and intend to delete:

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

With both files supplied at those project-relative paths, run:

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Shortened illustrative response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Deleted" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Deleted" },
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Deleted" }
] } }
```

This proves joint metadata deletion only. Runtime undeployment, generated-object cleanup, independent deletion of arbitrary member links and cross-org behavior remain unverified.

{% endcapture %}
{% include operation-tabs.html id="kit-definition-delete" label="Delete" cli_state="available" cli_reason="Joint deletion of the three owned source-org metadata components only; runtime cleanup remains unverified." cli_body=delete_cli api_state="unknown" api_reason="No separate API deletion workflow is supplied." %}

For the shared distinction between metadata transport and runtime installation, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).
