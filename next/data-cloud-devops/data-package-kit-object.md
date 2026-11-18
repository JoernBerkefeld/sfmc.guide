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
  read: { status: "yes", methods: [cli, api] }
  create: { status: "yes", methods: [cli, api] }
  update: { status: "yes", methods: [cli, api] }
  delete: { status: "yes", methods: [cli, api] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="kit-membership-datapackagekitobject"></a>

**Data Kit membership** (`DataPackageKitObject`) links a kit definition to one of its templates. It is the metadata record that holds that link.

**Example used in every chapter:** the membership `CustomerKitGraphMember`. It links the kit `CustomerKit` to the template `CustomerGraph`.

{% include crud-summary.html %}

**Plugin qualification:** Not qualified. The `sf data360` commands have no data kit family.

## Read

{% capture read_cli %}
Downloads the kit definition, its templates and this membership as XML files in one retrieval.

```sh
sf project retrieve start --manifest manifest/package.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10
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

Keep the references exactly as retrieved. Retrieval does not install the kit. To download every membership without naming each one, use `--metadata DataPackageKitObject`.
{% endcapture %}
{% capture read_metadata %}
`listMetadata` with type `DataPackageKitObject` returns every membership name. `readMetadata` with those names returns `masterLabel`, `parentDataPackageKitDefinitionName`, `referenceObjectName` and `referenceObjectType`.
{% endcapture %}

{% include operation-tabs.html id="kit-member-read" label="Read" split_api=true cli_state="available" cli_reason="Retrieves the membership as Metadata API XML. Retrieval does not install the kit." cli_body=read_cli metadata_state="available" metadata_reason="Lists every membership and reads its references." metadata_body=read_metadata connect_state="blocked" connect_reason="The Connect kit manifest lists membership names and IDs only, without the references." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Create

{% capture create_cli %}
The membership can be created together with its kit definition and template, using the [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#create), or on its own once the definition and template exist.

Save the membership as `force-app/main/default/DataPackageKitObjects/CustomerKitGraphMember.DataPackageKitObject-meta.xml` (the XML under Read), then deploy it:

```sh
sf project deploy start --metadata DataPackageKitObject:CustomerKitGraphMember --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Created`. After that, a definition created through the CLI or the Metadata API can no longer be read or updated; see the [kit definition page](/next/data-cloud-cli/data-package-kit-definition/#read).

**Known failures:**

- An Identity Resolution template can be stored, and its later instantiation can still fail.
{% endcapture %}

{% capture create_metadata %}
`createMetadata` with type `DataPackageKitObject` and `fullName`, `masterLabel`, `parentDataPackageKitDefinitionName`, `referenceObjectName` and `referenceObjectType` (`DataKitObjectTemplate`) creates the link on its own. The definition and template must already exist.
{% endcapture %}

{% include operation-tabs.html id="kit-member-create" label="Create" split_api=true cli_state="available" cli_reason="Creates the link alone, or with its kit definition and template." cli_body=create_cli metadata_state="available" metadata_reason="createMetadata creates the link on its own." metadata_body=create_metadata connect_state="blocked" connect_reason="The Connect kit resource deploys runtime components; it does not create a membership link." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Update

{% capture update_cli %}
Change the `masterLabel` or point `referenceObjectName` at another template of the same kit, then deploy the file again:

```sh
sf project deploy start --metadata DataPackageKitObject:CustomerKitGraphMember --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Changed`. Retrieve the file again to confirm the new values.
{% endcapture %}
{% capture update_metadata %}
`updateMetadata` with type `DataPackageKitObject` and the complete record with a new `masterLabel` or `referenceObjectName` returns `success: true`; `readMetadata` returns the new values.
{% endcapture %}

{% include operation-tabs.html id="kit-member-update" label="Update" split_api=true cli_state="available" cli_reason="Changes the label, or points the link at another template." cli_body=update_cli metadata_state="available" metadata_reason="updateMetadata changes the label, or points the link at another template." metadata_body=update_metadata connect_state="blocked" connect_reason="PATCH on the Connect kit resource deploys runtime components; it does not change a membership link." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

## Delete

{% capture delete_cli %}
Deletes the membership together with its kit definition and template, using the [kit definition example](/next/data-cloud-cli/data-package-kit-definition/#kit-definition-datapackagekitdefinition). Use it only on objects you own.

To delete only the link, save this as `manifest/destructiveChangesPost.xml` and use the `manifest/empty.xml` from that example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>CustomerKitGraphMember</members>
        <name>DataPackageKitObject</name>
    </types>
    <version>68.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 68.0 --wait 10
```

The deploy reports the component as `Deleted`. The definition and template stay.
{% endcapture %}
{% capture delete_metadata %}
`deleteMetadata` with type `DataPackageKitObject` and the name removes the link on its own. A later `readMetadata` returns an empty record.
{% endcapture %}

{% include operation-tabs.html id="kit-member-delete" label="Delete" split_api=true cli_state="available" cli_reason="Deletes the link on its own, or with its kit definition and template." cli_body=delete_cli metadata_state="available" metadata_reason="deleteMetadata removes the link on its own." metadata_body=delete_metadata connect_state="blocked" connect_reason="DELETE on the Connect kit resource undeploys runtime components; it does not delete a membership link." plugin_state="blocked" plugin_reason="The sf data360 commands have no data kit family." %}

### Moving a kit is not installing it

Downloading or deploying kit XML only moves its metadata. Instantiating the kit is a separate asynchronous Connect deployment. Wait for that job's final success or error before you assume any runtime component exists.

An Identity Resolution template can be stored and still fail when it is instantiated later. That does not mean every valid kit fails.

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

The available tools do not expose canonical kit creation, component-add or template-generation, so no generated-kit workflow is supplied here.

**Verification scope:** Create, update, delete and the Metadata API read were run live on API 68.0 on new `Cli…` kits, which were deleted afterwards. The verification database records it as `data360:b1.datakit-pages.sweep-api68`. The combined retrieval below comes from an earlier API 65.0 run. No `sf-plugin-data` command (`--preview`, `--dataspace`, `--async`, `--wait-timeout`, `--keep-local-files`) applies to kits. This badge does not verify untested writes or general CRUD support.

**Read (combined transport):** Tested with `--api-version 65.0` and `--wait 10`. The `--json` result listed the three members as `Created`:

```json
{ "status": 0, "result": { "success": true, "files": [
  { "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerKitGraphMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

**Larger snapshot:** The generated manifest can also list the other template and membership names of the kit. Retrieval does not prove that the kit's components are portable.

**Read (all memberships):** A retrieve without a name downloaded every membership in the org, and `listMetadata` with `readMetadata` returned the same records. The Connect kit manifest (`GET ssot/datakit/{kit}/manifest`) lists membership names and IDs without their references.

**Create and delete:** An Identity Resolution membership link was created and deleted together with its definition and template (API 65.0). On API 68.0, a CLI deploy and `createMetadata` each created a link on its own, and a destructive CLI deploy and `deleteMetadata` each deleted one on its own; the definition and template stayed.

**Update:** A CLI deploy reported `Changed` and `updateMetadata` returned `success: true` for a new `masterLabel`. Pointing a link from one template to another worked both ways: `updateMetadata` moved it to the second template, and a CLI deploy moved it back. Each change read back, and the Connect manifest listed the new template. Moving a link to another kit definition was not tried.

**Side effect on the definition:** While a link existed, its CLI- or API-created definition could not be read or updated (`UNKNOWN_EXCEPTION`). See the [kit definition page](/next/data-cloud-cli/data-package-kit-definition/#read).

**Connect API:** The kit resource `ssot/data-kits/{kit}` accepts `GET`, `POST`, `PATCH` and `DELETE` (a `PUT` returns `METHOD_NOT_ALLOWED`). `POST` and `PATCH` deploy runtime components and `DELETE` undeploys them. They were not run against a real kit, because that would create or remove live components.

**Instantiation:** An Identity Resolution template can be stored successfully while its later instantiation fails. That does not mean every valid Salesforce-generated kit fails. The available tools do not expose generated-kit creation, component-add or template generation, so no such workflow is supplied. Do not invent template tokens, and do not treat reading a manifest as generating one.

**Vanilla CLI:** These examples use vanilla Salesforce CLI commands to call the indicated Metadata or REST API. A missing dedicated CLI command does not mean the underlying API operation is unavailable.

**Official workflows:** [CLI kit transport](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy_data_kit_using_cli.html) and [Connect kit deployment](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy-data-kits-using-connect-api.html).

**Not verified:** Portability of a link to another org. Moving a link to another kit definition. Runtime undeployment of components. Kit instantiation success. Cross-org replay of a kit. Generated-kit creation.

</details>