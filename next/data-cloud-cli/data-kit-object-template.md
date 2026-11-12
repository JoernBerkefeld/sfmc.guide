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
  read: { status: "yes", methods: [cli] }
  create: { status: "partial", methods: [cli] }
  update: { status: "partial", methods: [cli] }
  delete: { status: "unknown", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

<a id="kit-template-datakitobjecttemplate"></a>

A **data kit** groups configuration so it can be reused. A **data kit template** (`DataKitObjectTemplate`) stores the settings of one component in that kit. The template is a saved copy, not the live component.

**Example used in every chapter:** `CustomerGraph`, a Data Graph template.

{% include crud-summary.html %}

**Plugin qualification:** No `sf-plugin-data` workflow is tested for this template. Only the Salesforce CLI workflows below apply.

## Read

{% capture read_cli %}
Downloads the stored template into your project folder.

```sh
sf project retrieve start --metadata DataKitObjectTemplate:CustomerGraph --target-org SOURCE_ALIAS --api-version 65.0 --wait 10
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

A Data Graph template can hold projected fields, joins and refresh settings. An Identity Resolution template can hold matching and reconciliation rules. Segment templates omit the live publish schedule and status.

Keep the full payload and every reference. Source IDs and external data lake object references can stop the template from working in another org. The saved template does not update when the live component changes.

{% endcapture %}
{% include operation-tabs.html id="kit-template-read" label="Read" cli_state="available" cli_reason="Retrieves the stored template. It does not retrieve the live component." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
Stores the existing template file in the target org.

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10
```

The command reads `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`. The template is stored only. No live graph is created and no kit is installed.

Sample result (structure from a test run that used `--json`):

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" }] } }
```

The XML excerpt under Read is not a complete creation file. Retrieve the template again to compare its decoded payload.

{% endcapture %}
{% include operation-tabs.html id="kit-template-create" label="Create" cli_state="available" cli_reason="Stores a complete existing Data Graph template only. No live graph is created and no kit is installed." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API creation workflow is supplied." %}

## Update

{% capture update_cli %}
Changes the description inside the `entityPayload` of a Data Graph template, then deploys it.

Decode the JSON, change only the description, then encode it as XML text again. Leave the root, fields, keys, types and other settings as they are.

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10
```

Sample result (structure from a test run that used `--json`):

```json
{ "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Changed" }] } }
```

The update changes the stored template only. It does not change a live graph. Retrieve the template and compare the decoded payload to confirm the change.

{% endcapture %}
{% include operation-tabs.html id="kit-template-update" label="Update" cli_state="available" cli_reason="Changes only the description in a Data Graph template. It does not change a live graph." cli_body=update_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No separate API update workflow is supplied." %}

## Delete

{% include operation-tabs.html id="kit-template-delete" label="Delete" cli_state="unknown" cli_reason="No reproducible standard CLI delete command is established yet." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API template-deletion workflow is supplied." %}

For how moving a kit differs from installing it, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limits still apply. This badge does not verify untested writes or general CRUD support.

**Versions and aliases:** Every command in this guide uses API version `65.0`. `SOURCE_ALIAS` and `TARGET_ALIAS` are placeholders for your own org aliases.

**Read:** The command retrieves the stored template, not the live component. The excerpt shows only some attributes; other retrieved attributes are omitted.

**Create:** Only a complete, existing Data Graph template was stored. The command does not create a runtime graph or install a kit.

**Update:** Only the description inside a Data Graph template payload was verified. The update does not change a runtime graph.

**Delete:** Removing a stored Data Graph template has been demonstrated. An exact, reproducible standard CLI delete invocation is not established, so no command is offered. Deleting a template would not by itself prove runtime graph or supporting-artifact cleanup. No API template-deletion workflow was supplied.

**Not verified:** Runtime creation and kit installation. Arbitrary payload changes. Full graph updates through templates. Whole-container repeat or update behavior. Runtime cleanup after template deletion.

</details>