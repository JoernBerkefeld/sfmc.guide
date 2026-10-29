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
  retrieve: { status: "yes", methods: [cli] }
  create: { status: "partial", methods: [cli] }
  update: { status: "partial", methods: [cli] }
  delete: { status: "unknown", methods: [] }
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="kit-template-datakitobjecttemplate"></a>

**Data Kit template** — `DataKitObjectTemplate`.

A **data kit** groups configuration for reuse. Its definition describes the kit, templates store component settings, and membership files link the two. **Instantiation** or installation creates live components from that saved configuration; copying files alone does not do this. A **payload** is simply the content carried inside a field or request.

A kit template is a **snapshot**, not the live component. A Data Graph template can contain projected fields, joins and refresh settings; an Identity Resolution template can contain matching and reconciliation rules. Segment templates omit live publish schedule/status.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata DataKitObjectTemplate:CustomerGraph --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

The response points to `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`. Its `entityPayload` is XML-escaped JSON:

```xml
<DataKitObjectTemplate xmlns="http://soap.sforce.com/2006/04/metadata">
  <entityPayload><!-- XML-escaped JSON payload omitted. --></entityPayload>
  <sourceObjectType>DataGraph</sourceObjectType>
  <templateVersion>1</templateVersion>
  <!-- Other retrieved template attributes omitted. -->
</DataKitObjectTemplate>
```

Other template types use `IdentityResolution` or `MarketSegment`. Preserve complete payloads and references: source IDs, generated objects/transforms and external DLO references can prevent replay elsewhere. Existing snapshots do not automatically update when a live component changes.

{% endcapture %}
{% include operation-tabs.html id="kit-template-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the stored template snapshot, not the live component." cli_body=retrieve_cli api_state="unknown" api_reason="No separate API retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
A complete Data Graph template can be stored without a parent kit. Use the existing, dependency-reviewed file at `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`:

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" }] } }
```

This stores the template; **it does not create a runtime graph or install a kit**. Retrieve it again to compare the decoded payload. The excerpt under Retrieve is not a complete creation file.

{% endcapture %}
{% include operation-tabs.html id="kit-template-create" label="Create" cli_state="available" cli_reason="Store a complete existing Data Graph template only; no runtime creation or kit installation." cli_body=create_cli api_state="unknown" api_reason="No separate API creation workflow is supplied." %}

## Update

{% capture update_cli %}
The verified edit is the **description inside `entityPayload`** of a Data Graph template. Decode the JSON, change only the description, then encode it as XML text again. Keep the root, fields, keys, types and other settings:

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Changed" }] } }
```

This updates stored template content, not an instantiated graph. Retrieve and compare the decoded payload. Arbitrary payload changes, full graph updates through templates, and whole-container repeat/update behavior have not been verified.

{% endcapture %}
{% include operation-tabs.html id="kit-template-update" label="Update" cli_state="available" cli_reason="Only the description inside a Data Graph template payload is verified; not runtime graph updates." cli_body=update_cli api_state="unknown" api_reason="No separate API update workflow is supplied." %}

## Delete

Removing a stored Data Graph template has been demonstrated, but an exact reproducible standard CLI delete invocation is not established here. No command is offered. Template deletion would not by itself prove runtime graph or supporting-artifact cleanup.

{% include operation-tabs.html id="kit-template-delete" label="Delete" cli_state="unknown" cli_reason="Deletion was demonstrated, but no exact reproducible standard CLI invocation is established here." api_state="unknown" api_reason="No API template-deletion workflow is supplied." %}

For the shared distinction between metadata transport and runtime installation, see [Moving a kit is not installing it](/next/data-cloud-cli/data-package-kit-object/#moving-a-kit-is-not-installing-it).
