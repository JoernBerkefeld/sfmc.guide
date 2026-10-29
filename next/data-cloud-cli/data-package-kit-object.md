---
layout: page
title: "Data Kit membership"
description: "Salesforce CLI workflows and verified operation limits for Kit membership: DataPackageKitObject."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-package-kit-object/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  retrieve: { status: "yes", methods: [cli] }
  create: { status: "partial", methods: [cli] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="kit-membership-datapackagekitobject"></a>

**Data Kit membership** — `DataPackageKitObject`.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
A membership file links a kit definition to a template. Use exact member names from the org; they are not necessarily the kit's display name.

For the verified combined transport, the integration supplies `manifest/package.xml` with the actual member names. Here is a small example of that generated file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerGraph</members>
    <name>DataKitObjectTemplate</name>
  </types>
  <types>
    <members>CustomerKit</members>
    <name>DataPackageKitDefinition</name>
  </types>
  <types>
    <members>CustomerKitGraphMember</members>
    <name>DataPackageKitObject</name>
  </types>
  <version>65.0</version>
</Package>
```

With that file supplied, retrieve the pieces together:

```sh
sf project retrieve start --manifest manifest/package.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "files": [
  { "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerKitGraphMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

The member file is `force-app/main/default/DataPackageKitObjects/CustomerKitGraphMember.DataPackageKitObject-meta.xml`. **Capitalization matters.** Further members each have their own file in that same directory.

```xml
<DataPackageKitObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Customer Kit</masterLabel>
  <parentDataPackageKitDefinitionName>CustomerKit</parentDataPackageKitDefinitionName>
  <referenceObjectName>CustomerGraph</referenceObjectName>
  <referenceObjectType>DataKitObjectTemplate</referenceObjectType>
</DataPackageKitObject>
```

Preserve the exact references. For a larger snapshot, the generated manifest includes the other actual template and membership names too. Retrieval does not install the kit, and these links alone do not prove that its components are portable.

{% endcapture %}
{% include operation-tabs.html id="kit-member-retrieve" label="Retrieve" cli_state="available" cli_reason="Combined metadata transport only; retrieval does not install the kit." cli_body=retrieve_cli api_state="unknown" api_reason="No separate API retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
The owned Identity Resolution membership link was created together with its definition and template using the shared [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#create). Independent member creation and portability remain **unverified**.

{% endcapture %}
{% include operation-tabs.html id="kit-member-create" label="Create" cli_state="available" cli_reason="Use the linked joint source-org workflow; independent member creation remains unverified." cli_body=create_cli api_state="unknown" api_reason="No separate API creation workflow is supplied." %}

## Update

Member updates have **not been verified**.

{% include operation-tabs.html id="kit-member-update" label="Update" cli_state="unknown" cli_reason="Member updates have not been verified; no workflow is supplied." api_state="unknown" api_reason="No API member-update workflow is supplied." %}

## Delete

{% capture delete_cli %}
The owned Identity Resolution membership link was deleted together with its definition and template using the shared [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#kit-definition-datapackagekitdefinition). Independent deletion of arbitrary member links and runtime component undeployment remain **unverified**.

{% endcapture %}
{% include operation-tabs.html id="kit-member-delete" label="Delete" cli_state="available" cli_reason="Use the linked joint metadata-deletion workflow; independent member deletion and runtime undeployment remain unverified." cli_body=delete_cli api_state="unknown" api_reason="No separate API deletion workflow is supplied." %}

### Moving a kit is not installing it

Downloading or deploying kit XML only transports its metadata. Instantiation is a **separate asynchronous Connect deployment**: wait for that job's final success or error before assuming any runtime component exists.

In particular, an Identity Resolution template can be stored successfully while its later instantiation fails. That does not mean every valid Salesforce-generated kit fails. The available tools do not expose canonical kit creation, component-add or template-generation, so no generated-kit workflow is supplied here. Do not invent template tokens or treat reading a manifest as generating one. Successful canonical kit instantiation and cross-org replay remain unverified; the direct runtime routes above do not require a GUI detour.

For the official workflows, see [CLI kit transport](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy_data_kit_using_cli.html) and [Connect kit deployment](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy-data-kits-using-connect-api.html).

These examples use vanilla Salesforce CLI commands to call the indicated Metadata or REST API. A missing dedicated CLI command does not mean the underlying API operation is unavailable.
