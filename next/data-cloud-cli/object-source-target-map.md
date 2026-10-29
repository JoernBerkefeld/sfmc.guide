---
layout: page
title: "DLO-to-DMO mapping"
description: "Salesforce CLI workflows and verified operation limits for DLO-to-DMO mapping: ObjectSourceTargetMap."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/object-source-target-map/
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

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** — `ObjectSourceTargetMap`.

This is the definition that connects fields in a DLO to fields in a DMO. Both objects must already exist with matching fields, primary keys and key qualifiers.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the actual metadata member name from your org, not a name guessed from the source and target objects.

{% endcapture %}
{% include operation-tabs.html id="mapping-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the mapping XML using its actual metadata member name." cli_body=retrieve_cli api_state="unknown" api_reason="No API mapping retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
Start with a complete retrieved mapping file at `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. For example, one field pair looks like this:

```xml
<ObjectSourceTargetMap xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <fieldSourceTargetMaps>
    <creationType>Custom</creationType>
    <filterApplied>false</filterApplied>
    <filterOperationType>Equal</filterOperationType>
    <isSourceFormula>false</isSourceFormula>
    <sourceField>CustomerSource__dll.Id__c</sourceField>
    <targetField>Customer__dlm.Id__c</targetField>
  </fieldSourceTargetMaps>
  <!-- Other retrieved field pairs omitted. -->
  <masterLabel>Customer Mapping</masterLabel>
  <sourceObjectName>CustomerSource__dll</sourceObjectName>
  <targetObjectName>Customer__dlm</targetObjectName>
</ObjectSourceTargetMap>
```

Keep **all** field pairs in the real file. Once you have checked the existing custom objects and confirmed that this mapping does not already exist:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }] } }
```

Read the mapping back and compare the source, target and every runtime field pair. Salesforce can generate system qualifier pairs such as `KQ_Id__c` that were not in the XML; do not add guessed pairs yourself. This example does not cover arbitrary formulas or filters, and it does not guarantee that mapping creation performs no internal processing.

{% endcapture %}
{% include operation-tabs.html id="mapping-create" label="Create" cli_state="available" cli_reason="Complete mapping between existing custom objects; formulas, filters and processing-free creation are not established." cli_body=create_cli api_state="unknown" api_reason="No API mapping creation workflow is supplied." %}

## Update

{% capture update_cli %}
The verified change is the **label only**. Edit `masterLabel` in the complete file, leaving all pairs and object references alone:

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

Then deploy it:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

The file entry can report `Changed`; sending the same file again can report `Unchanged`. These are separate invocations, and neither proves that Salesforce performed no internal work. Read back the label and pairs. Retargeting, field removal and formula/filter updates have not been verified.

{% endcapture %}
{% include operation-tabs.html id="mapping-update" label="Update" cli_state="available" cli_reason="Label-only update; retargeting, field removal and formula/filter updates are not verified." cli_body=update_cli api_state="unknown" api_reason="No API mapping update workflow is supplied." %}

## Delete

Standalone mapping deletion is not supported by this example. It can fail with an internal server error or a restriction on removing the sole mapping. Deleting an empty, owned parent DMO can remove its sole owned mapping, as described above; do not delete an arbitrary parent as a workaround.

{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="blocked" cli_reason="Standalone mapping deletion can fail with an internal error or sole-mapping removal restriction." api_state="unknown" api_reason="No standalone API mapping deletion workflow is supplied; parent-deletion observations are not a recipe." %}
