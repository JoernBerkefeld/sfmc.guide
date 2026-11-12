---
layout: page
title: "Field relationship"
description: "Salesforce CLI workflows and verified operation limits for Field relationship: FieldSrcTrgtRelationship."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/field-source-target-relationship/
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

This badge does not verify untested writes or general CRUD support.

<a id="field-relationship-fieldsrctrgtrelationship"></a>

A field relationship links a source field to a target field. Many records in the source object can point to one record in the target object.

**Example used in every chapter:** the `OrderCustomer` relationship from `Order__dlm` to `Customer__dlm`.

**Plugin qualification:** No `sf-plugin-data` workflow is covered on this page.

{% include crud-summary.html %}

## Read

{% capture read_cli %}
Downloads the relationship definition as an XML file.

```sh
sf project retrieve start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org SOURCE_ALIAS --wait 5
```

The file is saved to `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`. It contains the elements shown in the Create chapter. Retrieve the `CustomObject` definitions separately if you also need the objects and fields.

A sample of the retrieved file is not in this guide yet.
{% endcapture %}
{% include operation-tabs.html id="relationship-read" label="Read" cli_state="available" cli_reason="Retrieves the relationship XML. Retrieve the object definitions separately." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API relationship retrieval workflow is supplied." %}

## Create

{% capture create_cli %}
Assume `Order__dlm.CustomerId__c` and `Customer__dlm.Id__c` already exist with the correct key settings. You need two files.

First, the new lookup field at `force-app/main/default/objects/Order__dlm/fields/CustomerLookup__c.field-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>CustomerLookup__c</fullName>
  <label>Customer Lookup</label>
  <referenceTo>Customer__dlm</referenceTo>
  <relationshipName>CustomerOrders</relationshipName>
  <type>Lookup</type>
</CustomField>
```

Do not leave out `fullName`. Second, the relationship at `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FieldSrcTrgtRelationship xmlns="http://soap.sforce.com/2006/04/metadata">
  <definitionCreationType>Custom</definitionCreationType>
  <lookupFieldName>Order__dlm.CustomerLookup__c</lookupFieldName>
  <masterLabel>Order Customer</masterLabel>
  <owner>DataCloud</owner>
  <relationshipCardinality>ManyToOne</relationshipCardinality>
  <sourceFieldName>Order__dlm.CustomerId__c</sourceFieldName>
  <targetFieldName>Customer__dlm.Id__c</targetFieldName>
</FieldSrcTrgtRelationship>
```

Deploy both together:

```sh
sf project deploy start --metadata CustomField:Order__dlm.CustomerLookup__c --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --test-level NoTestRun --wait 5
```

The result includes:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "Order__dlm.CustomerLookup__c", "type": "CustomField", "state": "Created" },
  { "fullName": "OrderCustomer", "type": "FieldSrcTrgtRelationship", "state": "Created" }
] } }
```

The deployment creates the lookup and the relationship. It does not create the DMOs or their key fields. Read back the relationship, field references and cardinality to confirm them.
{% endcapture %}
{% include operation-tabs.html id="relationship-create" label="Create" cli_state="available" cli_reason="Creates a ManyToOne relationship and lookup between two existing empty custom DMOs." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API relationship creation workflow is supplied." %}

## Update

{% capture update_cli %}
Change only the relationship label:

```xml
<masterLabel>Order Customer Updated</masterLabel>
```

```sh
sf project deploy start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --test-level NoTestRun --wait 5
```

Expect `Changed`, or `Unchanged` on an identical repeat. Check that the lookup, source, target and cardinality stayed the same.
{% endcapture %}
{% include operation-tabs.html id="relationship-update" label="Update" cli_state="available" cli_reason="Changes the relationship label. The other fields stay the same." cli_body=update_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API relationship update workflow is supplied." %}

## Delete

{% capture delete_cli %}
**Deleting this relationship also removes its owned, sole-use lookup field.** Do not use this on a shared lookup.

Your integration supplies an empty `package.xml`. Its `relationship-delete.xml` names the relationship:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>OrderCustomer</members>
    <name>FieldSrcTrgtRelationship</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest package.xml --post-destructive-changes relationship-delete.xml --target-org TARGET_ALIAS --test-level NoTestRun --wait 5
```

The result includes:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "FieldSrcTrgtRelationship", "fullName": "OrderCustomer", "deleted": true, "success": true }] } } }
```

Check that the relationship and lookup are gone. Both DMOs and their key fields remain.

**Known failures:**

- Stale-source redeployment: leftover lookup XML in the local project can make a later deletion fail. Use an isolated, empty source project rather than suppressing warnings.
{% endcapture %}
{% include operation-tabs.html id="relationship-delete" label="Delete" cli_state="available" cli_reason="Deletes an owned relationship and its sole-use lookup. Both DMOs and key fields remain." cli_body=delete_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="No API relationship deletion workflow is supplied." %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Read verification:** An independent exact-name standard Metadata API 65 retrieve was reverified against a retained standard relationship in one source org. It used a separately configured package source directory. The returned XML is a definition export. It is not proof of prerequisite compatibility, cross-org portability or safe deployment. That read did not create, update or delete any relationship, and it does not requalify the bounded write examples.

**Write scope:** The create, update and delete examples cover custom, DataCloud-owned `ManyToOne` relationships between existing empty custom DMOs in the default dataspace. The command examples were run with API version 65.0.

**Activation:** No explicit activation command is included. That is not a guarantee of no internal processing.

**Not verified:** Retargeting, cardinality changes and `OneToOne` updates. Managed relationships and shared lookup fields are outside this scope.

</details>