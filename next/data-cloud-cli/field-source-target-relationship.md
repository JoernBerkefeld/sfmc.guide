---
layout: page
title: "Field relationship | Data Cloud with Salesforce CLI"
description: "Salesforce CLI workflows and verified operation limits for Field relationship: FieldSrcTrgtRelationship."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/field-source-target-relationship/
verification: verified
platforms:
  - next
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="field-relationship-fieldsrctrgtrelationship"></a>

**Field relationship** — `FieldSrcTrgtRelationship`.

The following example links an order's customer field to a customer DMO. It covers a custom, DataCloud-owned `ManyToOne` relationship between existing **empty custom DMOs** in the default dataspace, not managed relationships or shared lookup fields.

## Retrieve

```sh
sf project retrieve start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The `files` entry points to `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`, containing the elements illustrated under Create. Retrieve the `CustomObject` definitions separately if you also need the objects and fields.

## Create

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
sf project deploy start --metadata CustomField:Order__dlm.CustomerLookup__c --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "Order__dlm.CustomerLookup__c", "type": "CustomField", "state": "Created" },
  { "fullName": "OrderCustomer", "type": "FieldSrcTrgtRelationship", "state": "Created" }
] } }
```

This creates the lookup and relationship, **not the DMOs or their key fields**. Read back the exact relationship, field references and cardinality. No explicit activation command is included, but that is not a guarantee of no internal processing.

## Update

Change only the relationship's label:

```xml
<masterLabel>Order Customer Updated</masterLabel>
```

```sh
sf project deploy start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Expect `Changed`, or `Unchanged` on an identical repeat. Check that the lookup, source, target and cardinality stayed the same. Retargeting, cardinality changes and `OneToOne` updates have not been verified.

## Delete

**Deleting this relationship also removes its owned, sole-use lookup field.** Do not apply this to a shared lookup.

Use the generated empty `package.xml` from the DMO section. The integration supplies `relationship-delete.xml`:

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
sf project deploy start --manifest package.xml --post-destructive-changes relationship-delete.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "FieldSrcTrgtRelationship", "fullName": "OrderCustomer", "deleted": true, "success": true }] } } }
```

Confirm that the relationship and lookup are gone, but both DMOs and their original key fields remain.

**Avoid stale-source redeployment:** the local relationship and lookup files are still there. Reconcile them before another deploy. Leftover lookup XML can make later deletion fail; use an isolated empty source project rather than suppressing warnings.
