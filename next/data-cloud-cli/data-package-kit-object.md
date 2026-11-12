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
  read: { status: "yes", methods: [cli] }
  create: { status: "partial", methods: [cli] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="kit-membership-datapackagekitobject"></a>

**Data Kit membership** (`DataPackageKitObject`) links a kit definition to one of its templates. It is the metadata record that holds that link.

**Example used in every chapter:** the membership `CustomerKitGraphMember`. It links the kit `CustomerKit` to the template `CustomerGraph`.

{% include crud-summary.html %}

**Plugin qualification:** Not qualified. No sf-plugin-data workflow is tested for this membership.

## Read

{% capture read_cli %}
Downloads the kit definition, its templates and this membership as XML files in one retrieval.

```sh
sf project retrieve start --manifest manifest/package.xml --target-org SOURCE_ALIAS
```

**Manifest** (`manifest/package.xml`, the input for the command). Use the exact member names from your org, which can differ from the kit's display name:

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

**Saved file** for this membership. The file name is case-sensitive. Other members are saved to the same folder:

`force-app/main/default/DataPackageKitObjects/CustomerKitGraphMember.DataPackageKitObject-meta.xml`

```xml
<DataPackageKitObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Customer Kit</masterLabel>
  <parentDataPackageKitDefinitionName>CustomerKit</parentDataPackageKitDefinitionName>
  <referenceObjectName>CustomerGraph</referenceObjectName>
  <referenceObjectType>DataKitObjectTemplate</referenceObjectType>
</DataPackageKitObject>
```

Keep the references exactly as retrieved. Retrieval does not install the kit.
{% endcapture %}

{% include operation-tabs.html id="kit-member-read" label="Read" split_api=true cli_state="available" cli_reason="Retrieves the membership as Metadata API XML. Retrieval does not install the kit." cli_body=read_cli metadata_state="unknown" metadata_reason="Reading the membership directly through the Metadata API has not been tested." connect_state="unknown" connect_reason="No separate Connect API retrieval workflow is supplied." plugin_state="unknown" plugin_reason="No sf-plugin-data workflow is tested for this membership." %}

## Create

{% capture create_cli %}
The membership is created together with its kit definition and template. Use the [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#create) for the command.

**Known failures:**

- An Identity Resolution template can be stored, and its later instantiation can still fail.
{% endcapture %}

{% include operation-tabs.html id="kit-member-create" label="Create" split_api=true cli_state="available" cli_reason="Created with its kit definition and template in a tested joint source-org workflow (see Evidence)." cli_body=create_cli metadata_state="unknown" metadata_reason="Creating a membership on its own through the Metadata API has not been tested." connect_state="unknown" connect_reason="No separate Connect API creation workflow is supplied." plugin_state="unknown" plugin_reason="No sf-plugin-data workflow is tested for this membership." %}

## Update

{% include operation-tabs.html id="kit-member-update" label="Update" split_api=true cli_state="unknown" cli_reason="Member updates have not been verified; no workflow is supplied." metadata_state="unknown" metadata_reason="Member updates through the Metadata API have not been verified." connect_state="unknown" connect_reason="No Connect API member-update workflow is supplied." plugin_state="unknown" plugin_reason="No sf-plugin-data workflow is tested for this membership." %}

## Delete

{% capture delete_cli %}
Deletes the membership together with its kit definition and template, using the [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#kit-definition-datapackagekitdefinition). Use it only on objects you own.
{% endcapture %}

{% include operation-tabs.html id="kit-member-delete" label="Delete" split_api=true cli_state="available" cli_reason="Deleted with its kit definition and template in a tested joint metadata-deletion workflow (see Evidence)." cli_body=delete_cli metadata_state="unknown" metadata_reason="Deleting a membership on its own through the Metadata API has not been tested." connect_state="unknown" connect_reason="No separate Connect API deletion workflow is supplied." plugin_state="unknown" plugin_reason="No sf-plugin-data workflow is tested for this membership." %}

### Moving a kit is not installing it

Downloading or deploying kit XML only moves its metadata. Instantiating the kit is a separate asynchronous Connect deployment. Wait for that job's final success or error before you assume any runtime component exists.

An Identity Resolution template can be stored and still fail when it is instantiated later. That does not mean every valid kit fails.

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

The available tools do not expose canonical kit creation, component-add or template-generation, so no generated-kit workflow is supplied here.

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. This badge does not verify untested writes or general CRUD support.

**Read (combined transport):** Tested with `--api-version 65.0` and `--wait 10`. The `--json` result listed the three members as `Created`:

```json
{ "status": 0, "result": { "success": true, "files": [
  { "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerKitGraphMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

**Larger snapshot:** The generated manifest can also list the other template and membership names of the kit. Retrieval does not prove that the kit's components are portable.

**Create and delete:** The owned Identity Resolution membership link was created and deleted together with its definition and template. Independent creation or deletion of member links is not verified.

**Instantiation:** An Identity Resolution template can be stored successfully while its later instantiation fails. That does not mean every valid Salesforce-generated kit fails. The available tools do not expose generated-kit creation, component-add or template generation, so no such workflow is supplied. Do not invent template tokens, and do not treat reading a manifest as generating one.

**Vanilla CLI:** These examples use vanilla Salesforce CLI commands to call the indicated Metadata or REST API. A missing dedicated CLI command does not mean the underlying API operation is unavailable.

**Official workflows:** [CLI kit transport](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy_data_kit_using_cli.html) and [Connect kit deployment](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy-data-kits-using-connect-api.html).

**Not verified:** Independent member creation and portability. Member updates. Independent deletion of member links. Runtime undeployment of components. Kit instantiation success. Cross-org replay of a kit. Generated-kit creation.

</details>