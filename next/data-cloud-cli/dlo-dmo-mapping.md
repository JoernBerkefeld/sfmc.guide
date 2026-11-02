---
layout: page
title: "DLO-DMO-mapping"
description: "Salesforce CLI workflows and verified operation limits for DLO-to-DMO mapping: ObjectSourceTargetMap."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/dlo-dmo-mapping/
redirect_from:
  - /next/data-cloud-cli/object-source-target-map/
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

*Last updated: October 29, 2026, 17:27 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** — `ObjectSourceTargetMap`.

This is the definition that connects fields in a DLO to fields in a DMO. Both objects must already exist with matching fields, primary keys and key qualifiers.

**API family:** The native JSON route
`/services/data/vXX.0/ssot/data-model-object-mappings` (including its item and
field-mapping routes) belongs to the **Data 360 Connect REST API**, not the
SOAP-based Metadata API. Salesforce lists mapping routes separately in the
[Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec)
and shows the full versioned URL in its
[mapping use case](https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.md).
Native plugin requests to this family use authenticated `sf api request rest`;
that is API access through a CLI runner, not a dedicated out-of-the-box mapping
command. The `sf project` XML examples in the CLI sections below instead use
Metadata API with `ObjectSourceTargetMap`. This attribution alone does not qualify
a native mapping workflow, alter the existing API-tab ratings or establish CRUD
support at an untested version.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** the `sf project` retrieve/deploy examples on this page use
`ObjectSourceTargetMap` definitions, not the native Connect REST JSON route.

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the actual metadata member name from your org, not a name guessed from the source and target objects.

An independent exact-name standard Metadata API 65 retrieve was reverified on
October 29, 2026 for one retained mapping in one source org. The separately
retrieved XML matched the exported definition byte for byte in a configured
package source directory. This is source-only definition evidence: it does not
establish primary-key or key-qualifier compatibility, prerequisite readiness,
cross-org portability or operational deployment. No target calls, writes or
processing were performed in this check; it does not requalify the bounded
write examples below.

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

**Shared restriction (CLI / API / Plugin):** the completed native Connect REST
API68 comparison rejected changing only the DLO, only the DMO, or both through the
field-mapping PATCH route, for both last and non-last mappings. All six requests
returned HTTP `404` for an input/existing-binding mismatch, not an absent original
mapping. This is not a claim that every update is impossible: a separate native
API68 selector-free field-mapping PATCH successfully added a field pair, whereas
the Metadata API example below establishes only a label change. These API results
do not establish experimental coverage of CLI and Plugin retargeting.
{: .mapping-shared-restriction }

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

### Completed API68 binding-retarget comparison

On November 2, 2026, each case first tested the last mapping, then repeated the
attempt only after a separate DLO-to-original-DMO survivor mapping was independently
`ACTIVE`: two distinct DLO mappings then existed for the original DMO.

- **a — DLO only:** alternate source DLO, original target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **b — DMO only:** original source DLO, alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **c — both:** alternate source DLO and alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.

All six used `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{originalMappingName}/field-mappings?dataspace=default`,
with the desired source/target developer names and a names-only `Beta__c` →
`Beta__c` field addition. That valid Text field existed on every parent and was not
already mapped. The service rejected the mismatch between the requested bindings
and those resolved from the original mapping name (`Is Valid Interface: false`).
Independent original GETs returned HTTP `200`, `ACTIVE`, with the same name,
source/target selectors and all six field pairs; survivor mappings and all parent
schemas/primary keys were unchanged. Separate target/pair reads found no alternate
binding. No deletion was attempted in this comparison.

This establishes a limitation of that tested API68 route in one org, not universal
unavailability of every Salesforce retarget mechanism or plugin acceptance.
`replaceSource` was not attempted: its semantics were undocumented in the inspected
contract. Do not infer a replacement or last-mapping-deletion workaround from it.

## Delete

**Shared restriction (CLI / API / Plugin):** the last-mapping removal restriction
is a platform constraint, not merely a plugin limitation; see
[Salesforce Help](https://help.salesforce.com/s/articleView?id=001993463&language=en_US&type=1).
In the bounded native Connect REST API68 experiment, deleting the last mapping
returned HTTP `500`; deleting a non-last mapping returned HTTP `204` with an empty
body, followed by two exact mapping GET `404` readbacks while both parent objects
remained. This does not establish that CLI, API and Plugin deletion were all
experimentally tested, or authorize deleting a parent as a workaround. The completed
retarget comparison above did not provide a workaround for last-mapping deletion.
{: .mapping-shared-restriction }

{% capture delete_evidence %}
Standalone mapping deletion is not supported by this example. It can fail with an internal server error or a restriction on removing the sole mapping. Deleting an empty, owned parent DMO can remove its sole owned mapping, as described above; do not delete an arbitrary parent as a workaround.

{% endcapture %}
{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="blocked" cli_reason="Standalone mapping deletion can fail with an internal error or sole-mapping removal restriction." api_state="unknown" api_reason="No standalone API mapping deletion workflow is supplied; parent-deletion observations are not a recipe." %}

{{ delete_evidence | markdownify }}
