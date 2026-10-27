---
layout: page
title: "Data Cloud with Salesforce CLI"
description: "Data Cloud metadata commands, default source-format files, illustrative responses and supported lifecycle limits for Marketing Cloud Next."
parent: Next
parent_url: /next/
permalink: /next/data-cloud-cli/
platforms:
  - next
---

Use standard Salesforce CLI to retrieve Data Cloud (Data 360) configuration into a Salesforce project. Support is operation-specific: a successful export does not establish complete migration, safe replay or full CRUD support.

Metadata examples cover **API `65.0`, default dataspace**. The operational CI chapter uses **API `67.0`** facade creation and API 65 direct lifecycle requests; operational Segment requests use API 65, and operational Data Graph and Identity Resolution CRUD use the API 67 MCP facade (native Identity Resolution GET uses API 65). The separate Segment Members runtime-data chapter uses **API `67.0`**. Replace the generic member names with exact names from your org, and `SOURCE_ALIAS` / `TARGET_ALIAS` with deliberately selected authenticated aliases. Names are illustrative, not assets supplied by Salesforce. Check the evolving [sf-plugin-data capabilities](https://github.com/JoernBerkefeld/sf-plugin-data#metadata-examples-prerequisites-and-qualification) for the current support boundary.

## Project and command conventions

Assume the default **`force-app/main/default/`** source-format layout throughout. Run commands at the project root, with an existing `force-app` directory and this `sfdx-project.json`:

```json
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "namespace": "",
  "sourceApiVersion": "65.0"
}
```

- **Read / retrieve:** reads the org and writes/replaces selected local XML. Inspect local changes first. It does not start ingestion, run calculations or publish segments.
- **Create / update:** deploys selected local XML to the target org. It does not rewrite those local files. Existing prerequisites must already be valid in the target.
- **Delete:** changes the org; the destructive-deployment mechanism below does **not** remove local source XML. Cascades require separate local reconciliation.
- All JSON and XML samples below are **sanitized, shortened illustrations**, not recorded command outputs or complete response contracts. XML comments marking omitted content mean the block is an excerpt, **not a deployable replacement**. Preserve actual retrieved attributes and dependencies.
- Only qualified operations have command shapes. Unsupported operations have limitations instead of speculative recipes.
- **Manifest-dependent examples are lower-level mechanism references, not self-contained user workflows.** Their commands run only when an integration has already supplied the exact ephemeral files shown. No current multi-family wrapper or generator invocation is provided here. Do not assume those files exist or hand-author them as a required normal workflow. A one-command interface with generated internals requires separate tooling; none is promised by these examples.

### Reading command responses

Each Metadata retrieve command below uses the same response shape; runtime REST responses use their own envelope. Illustrative shortened DMO response:

```json
{
  "status": 0,
  "result": {
    "done": true,
    "success": true,
    "status": "Succeeded",
    "files": [
      {
        "fullName": "Customer__dlm",
        "type": "CustomObject",
        "state": "Created",
        "filePath": "force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml"
      }
    ]
  }
}
```

The real file list can include many decomposed fields, and existing local files need not report `Created`. For each type below, use its stated member, type and path in interpreting that response; a success flag does not attest to omitted runtime configuration.

### Selecting multiple components

Repeat `--metadata` to retrieve multiple exact members in one command, without a manifest:

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "files": [
      { "fullName": "CustomerActivity", "type": "MktCalcInsightObjectDef", "state": "Created" },
      { "fullName": "ActiveCustomers", "type": "MarketSegmentDefinition", "state": "Created" }
    ]
  }
}
```

This writes both local definitions and changes neither org component. Their dependency and lifecycle limitations still apply independently.

## Data Model Object (DMO): `CustomObject`, `__dlm`

### Create

Standard Metadata API DMO creation is not qualified. Do not use retrieved object XML as a general creation recipe. The custom plugin's bounded JSON creation route is separate.

### Read / retrieve

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Local artifacts include:

- `force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml`
- `force-app/main/default/objects/Customer__dlm/fields/Id__c.field-meta.xml`
- One additional `fields/<FieldName>.field-meta.xml` per exported field, including system fields and lookups.

Illustrative object-file excerpt:

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer</label>
  <mktDataModelAttributes>
    <creationType>Custom</creationType>
    <dataSpaceName>default</dataSpaceName>
    <!-- Additional retrieved taxonomy, category and state attributes omitted. -->
  </mktDataModelAttributes>
</CustomObject>
```

Illustrative primary-field file:

```xml
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>Id__c</fullName>
  <label>Id</label>
  <length>60</length>
  <mktDataModelFieldAttributes>
    <definitionCreationType>Custom</definitionCreationType>
    <isDynamicLookup>false</isDynamicLookup>
    <labelOverride>Id</labelOverride>
    <masterLabel>Id</masterLabel>
    <primaryIndexOrder>1</primaryIndexOrder>
    <usageTag>None</usageTag>
  </mktDataModelFieldAttributes>
  <required>false</required>
  <type>Text</type>
</CustomField>
```

The response follows the retrieve example above. Local object/field files change; org configuration does not. Preserve actual primary/key-qualifier attributes: names alone do not establish qualifier binding. Object XML is not a complete mapping, relationship or ingestion export. An `isEnabled` value must not be interpreted as an activation contract or proof of no processing.

### Update

Standard Metadata API DMO updates are not qualified. The plugin's bounded object/existing non-primary field label-update route does not establish general XML schema updates.

### Delete

Qualified only for an **empty, explicitly owned custom DMO with freshly checked dependencies**. Its sole owned mapping can be removed by the parent cascade; this does not authorize populated/business-object deletion or arbitrary shared-dependency cascades. Downstream insights, segments, identity resolution and activations can block deletion. No universal dependency-visibility guarantee is established.

The supported lower-level mechanism uses internally generated ephemeral files. These contents explain the operation; they are **not a requirement to hand-author manifests** and do not imply an implemented plugin delete wrapper.

Generated `package.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

Generated `destructiveChangesPost.xml`, selecting exactly the admitted DMO:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>Customer__dlm</members>
    <name>CustomObject</name>
  </types>
  <version>65.0</version>
</Package>
```

Run only after ownership, emptiness and dependency admission, from an isolated project without unrelated source:

```sh
sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Illustrative shortened terminal response:

```json
{
  "status": 0,
  "result": {
    "done": true,
    "success": true,
    "status": "Succeeded",
    "details": {
      "componentSuccesses": [
        { "componentType": "CustomObject", "fullName": "Customer__dlm", "deleted": true, "success": true }
      ]
    }
  }
}
```

**Org:** removes the selected DMO and its admitted mapping cascade; no DLO is selected. Independently confirm exact DMO/mapping absence and preserved DLO state. **Local:** object, field and mapping XML remain until deliberately reconciled; generated manifests should stay ephemeral and out of Git. Do not trust provisional successes in a failed deployment. `sf project delete source` is not qualified as an interchangeable route and also deletes local files.

## Data Lake Object (DLO): `CustomObject`, `__dll`

### Create

Standard Metadata API DLO creation is not qualified. Preserve actual primary-key and system qualifier fields; stripping them is not a supported workaround.

### Read / retrieve

```sh
sf project retrieve start --metadata CustomObject:CustomerSource__dll --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Local artifacts:

- `force-app/main/default/objects/CustomerSource__dll/CustomerSource__dll.object-meta.xml`
- `force-app/main/default/objects/CustomerSource__dll/fields/<FieldName>.field-meta.xml`

Illustrative object-file excerpt:

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer Source</label>
  <mktDataLakeAttributes>
    <!-- Preserve the retrieved DLO definition and its attributes. -->
  </mktDataLakeAttributes>
</CustomObject>
```

Illustrative field excerpt:

```xml
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>Id__c</fullName>
  <label>Id</label>
  <!-- Retrieved primary-index, qualifier and field attributes omitted. -->
  <type>Text</type>
</CustomField>
```

Interpret the retrieve response with `type: CustomObject` and member `CustomerSource__dll`. **Local:** writes decomposed definition/fields. **Org:** unchanged. `__dll` identifies a DLO, not a DMO; this is not a complete connector/credential/ingestion export.

### Update

DLO updates are not qualified.

### Delete

No successful standard delete route is qualified. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even with zero listed DMO dependencies and no associated stream. Illustrative shortened error, not a success response:

```json
{
  "status": 1,
  "result": {
    "success": false,
    "status": "Failed",
    "details": {
      "componentFailures": [
        { "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }
      ]
    }
  }
}
```

That refusal leaves the DLO in place; reconcile actual state after any failure. It does not prove all deletion mechanisms unsupported. No instance-delete workaround or runnable success recipe is offered.

## DLO-to-DMO mapping: `ObjectSourceTargetMap`

### Create

Qualified for a bounded mapping with **already-existing, matching custom DLO and DMO**, independently checked fields, primary keys and key qualifiers, and no existing mapping of that identity. Standard Metadata API creation of those prerequisite objects is not supported by this reference.

Use the complete retrieved file at `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Illustrative excerpt only:

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
  <!-- All other retrieved authored/system pairs must be retained. -->
  <masterLabel>Customer Mapping</masterLabel>
  <sourceObjectName>CustomerSource__dll</sourceObjectName>
  <targetObjectName>Customer__dlm</targetObjectName>
</ObjectSourceTargetMap>
```

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "status": "Succeeded",
    "files": [
      { "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }
    ]
  }
}
```

**Org:** creates the admitted mapping; independently verify all runtime pairs and exact source/target identities. System key-qualifier pairs such as `KQ_Id__c` can be generated at runtime even when absent from XML; do not add guessed pairs. **Local:** deployment leaves the selected XML unchanged. This does not qualify arbitrary formulas, filters or general mapping fidelity. DMO `isEnabled` semantics remain undefined; neither that flag nor lack of an explicit run command proves activation or inertness.

### Read / retrieve

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The retrieve response identifies `ObjectSourceTargetMap:CustomerMapping` and the exact mapping-file path above. **Local:** writes the complete XML, including repeated `fieldSourceTargetMaps`. **Org:** unchanged. Resolve the actual member name rather than guessing generated names.

### Update

Only a **`masterLabel` change** is qualified. Edit that element in the complete mapping file, leaving all field pairs and object references unchanged:

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Illustrative shortened update and identical-repeat responses, respectively:

```json
{
  "update": { "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerMapping", "state": "Changed" }] } },
  "identicalRepeat": { "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerMapping", "state": "Unchanged" }] } }
}
```

These are two illustrative invocations, not one CLI envelope. **Org:** changes the label; independent readback must preserve every pair and identity. Identical repeat reports configuration no-change, not absence of internal work. **Local:** only your label edit changes the file; the deployment does not. Retargeting, field removal and formula/filter changes are unqualified.

### Delete

Standalone standard deletion is not supported by this reference: an internal server error or sole-mapping restriction can prevent removal. The bounded parent-DMO delete can cascade its sole owned mapping; that is **not** standalone delete support or permission to delete an arbitrary parent. No standalone delete recipe is offered.

## Field relationship: `FieldSrcTrgtRelationship`

### Create

Qualified for **custom, DataCloud-owned `ManyToOne` relationships** on existing empty custom DMOs in the default dataspace. Source and target fields, including primary/key-qualifier semantics, must already be correct. This does not qualify creating those DMOs through Metadata API, managed relationships, shared lookup reuse or activation.

The source DMO `Order__dlm` already has `CustomerId__c`; the target `Customer__dlm` already has `Id__c`. Supply the explicitly owned, sole-use lookup prerequisite in `force-app/main/default/objects/Order__dlm/fields/CustomerLookup__c.field-meta.xml`:

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

The `fullName` element is required. Supply `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`:

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

Deploy the lookup and relationship together:

```sh
sf project deploy start --metadata CustomField:Order__dlm.CustomerLookup__c --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "status": "Succeeded",
    "files": [
      { "fullName": "Order__dlm.CustomerLookup__c", "type": "CustomField", "state": "Created" },
      { "fullName": "OrderCustomer", "type": "FieldSrcTrgtRelationship", "state": "Created" }
    ]
  }
}
```

**Org:** creates one lookup field and one relationship, not the DMOs or source/target key fields. Confirm exact relationship identity, field references and cardinality independently. **Local:** creates the two authored files before deployment; deployment does not rewrite them. No explicit enable/run/publish operation is included; do not generalize that into a no-processing guarantee.

### Read / retrieve

```sh
sf project retrieve start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "files": [
      { "fullName": "OrderCustomer", "type": "FieldSrcTrgtRelationship", "state": "Created", "filePath": "force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml" }
    ]
  }
}
```

**Local:** writes the relationship XML with the elements shown above. It does not automatically supply the prerequisite objects/fields; retrieve their `CustomObject` definitions separately when needed. **Org:** unchanged.

### Update

Only **`masterLabel`** changes are qualified. Keep identity, source/target references, lookup and cardinality unchanged; edit the relationship file:

```xml
<masterLabel>Order Customer Updated</masterLabel>
```

```sh
sf project deploy start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Illustrative shortened update and identical-repeat responses:

```json
{
  "update": { "status": 0, "result": { "success": true, "files": [{ "fullName": "OrderCustomer", "state": "Changed" }] } },
  "identicalRepeat": { "status": 0, "result": { "success": true, "files": [{ "fullName": "OrderCustomer", "state": "Unchanged" }] } }
}
```

These represent separate invocations. **Org:** updates the label, retaining identity/references/cardinality; repeat reports no configuration change, not zero internal writes/work. **Local:** your label edit remains; deployment does not rewrite the file. Retargeting, cardinality changes and `OneToOne` lifecycle are not qualified.

### Delete

Qualified only for the admitted custom relationship with its **explicitly owned, sole-use lookup**. Deletion also removes that lookup field; do not assume a shared lookup is safe.

Use the empty generated `package.xml` from the DMO delete section. Generate `relationship-delete.xml` with exactly this relationship:

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

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "status": "Succeeded",
    "details": {
      "componentSuccesses": [
        { "componentType": "FieldSrcTrgtRelationship", "fullName": "OrderCustomer", "deleted": true, "success": true }
      ]
    }
  }
}
```

**Org:** removes the relationship and owned lookup, leaving both DMOs and the original source/target key fields. Confirm relationship/lookup absence and preserved objects independently. **Local:** both `OrderCustomer.fieldSrcTrgtRelationship-meta.xml` and `CustomerLookup__c.field-meta.xml` remain stale until deliberately reconciled.

**Avoid stale-source redeployment:** reconcile those exact local files with confirmed org state before another deployment. Leftover lookup XML can cause a later destructive deployment to fail with a missing-field warning. Use an isolated empty source project for separately admitted destructive cleanup rather than suppressing warnings or broadly deploying the stale project. A failed deployment's provisional component successes do not establish deletion. Keep generated destructive files ephemeral and out of Git; this is a lower-level mechanism, not a promised plugin wrapper.

## Source object configuration: `DataSourceObject`

### Create

Creation is not qualified.

### Read / retrieve

```sh
sf project retrieve start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Local file: `force-app/main/default/dataSourceObjects/CustomerSource.dataSourceObject-meta.xml`. Illustrative content:

```xml
<DataSourceObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataSource>SalesforceSource</dataSource>
  <externalRecordIdentifier>Contact</externalRecordIdentifier>
  <masterLabel>Customer Source</masterLabel>
  <storageType>LOCAL</storageType>
  <templateVersion>1</templateVersion>
</DataSourceObject>
```

The retrieve response identifies `DataSourceObject:CustomerSource` and this file path. **Local:** writes configuration XML. **Org:** unchanged. This representation has no field definitions and is not a complete connector/credential export.

### Update

Updates are not qualified.

### Delete

Deletion is not qualified.

## Data stream configuration: `DataStreamDefinition`

### Create

Creation is not qualified.

### Read / retrieve

```sh
sf project retrieve start --metadata DataStreamDefinition:CustomerStream --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Local file: `force-app/main/default/dataStreamDefinitions/CustomerStream.dataStreamDefinition-meta.xml`. Illustrative excerpt:

```xml
<DataStreamDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataConnector>SalesforceConnector</dataConnector>
  <dataConnectorType>SalesforceDotCom</dataConnectorType>
  <dataExtractMethods>FULL_REFRESH</dataExtractMethods>
  <dataSource>SalesforceSource</dataSource>
  <mktDataLakeObject>CustomerSource__dll</mktDataLakeObject>
  <mktDataTranObject>CustomerTransform</mktDataTranObject>
  <!-- Additional retrieved attributes omitted. -->
</DataStreamDefinition>
```

The retrieve response identifies `DataStreamDefinition:CustomerStream` and this path. **Local:** writes the definition. **Org:** unchanged; no ingestion or refresh starts. Connector, source, DLO and transform references remain dependencies. The source-object and stream examples are independent shapes, not a complete configured ingestion chain.

### Update

Updates, activation and refresh are not qualified.

### Delete

Deletion is not qualified.

## Calculated insight: `MktCalcInsightObjectDef`

These operations manage a **Metadata definition**, not a qualified runnable calculated insight. Runtime binding, enabled/schedule state, materialization and safe noncomputing execution are not established **by this Metadata route**. A definition-only deployment can reserve the API name while no operational CI exists: runtime creation then reports that the name already exists, and PATCH cannot attach/publish the missing runtime. Do not create a Metadata shell before the operational route below; resolve any owned name collision deliberately, never by deleting a shared definition. Do not use this route where absence of processing is a requirement.

### Create

Create a definition only with an admitted existing DMO/field dependency and explicit permission for possible processing. Save `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml` with the complete sanitized example below, replacing its DMO and fields with compatible existing names:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MktCalcInsightObjectDef xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY app_id__c</expression>
  <masterLabel>Customer Activity</masterLabel>
</MktCalcInsightObjectDef>
```

The zero-row predicate bounds returned business rows, **not scanning or processing**. It is not a draft/inertness control.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "status": "Succeeded",
    "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": true, "success": true }] }
  }
}
```

**Org:** stores the definition; success does not prove a runtime `CustomerActivity__cio` exists or can run. A runtime lookup can return `ITEM_NOT_FOUND` despite definition success. **Local:** the authored XML remains unchanged by deployment. Independently retrieve it to verify SQL, creation type and label.

### Read / retrieve

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Use the Metadata member name, not its runtime `__cio` name. Local file: `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`. Illustrative excerpt:

```xml
<MktCalcInsightObjectDef xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <expression><!-- Retrieved SQL expression omitted. --></expression>
  <masterLabel>Customer Activity</masterLabel>
</MktCalcInsightObjectDef>
```

The retrieve response identifies `MktCalcInsightObjectDef:CustomerActivity` and this path. **Local:** writes SQL/label/creation-type XML. **Org:** unchanged; retrieval starts no calculation. XML omits **enabled state, schedule, definition type, dimensions/measures and dataspace**. Referenced DMO fields remain dependencies. Unscheduled source state does not establish inert deployment.

### Update

Only a definition's **`masterLabel` change** is qualified. Change that element to `Customer Activity Updated`, retain the expression/creation type, and deploy the same exact file:

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened response:

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": false, "changed": true, "success": true }] } } }
```

**Org:** updates the definition label; retrieve independently to confirm unchanged expression/creation type. **Local:** only your label edit changes the file. Expression updates, identical-repeat semantics and runtime updates are not qualified by this Metadata route; see the separate operational CI chapter for runtime PATCH.

### Delete

For an explicitly owned definition with admitted dependencies, an integration can supply the empty `manifest/package.xml` (version `65.0`, no types) and exact `manifest/destructiveChangesPost.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerActivity</members>
    <name>MktCalcInsightObjectDef</name>
  </types>
  <version>65.0</version>
</Package>
```

Conditional lower-level command, only with those supplied ephemeral files:

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "deleted": true, "success": true }] } } }
```

**Org:** deletes the exact definition; confirm its absence independently. This is not a general runtime insight cleanup or generated-data removal guarantee. **Local:** XML remains for deliberate reconciliation; exclude generated manifests from Git.

## Segment: `MarketSegmentDefinition`

The qualified write operations below are **source-only API 65 DBT Metadata definition CRUD**, not live segment instantiation. A saved definition can exist while its runtime GET returns `ITEM_NOT_FOUND`. Neither safe noncomputing deployment nor target/cross-org replay is established; use the separate Operational segments chapter for the distinct live REST route. UI criteria retrieval does not qualify UI-definition writes.

### Create

Use an isolated source project containing only the explicitly owned definition and an existing compatible unified DMO/key. Save the complete generic example at `force-app/main/default/marketSegmentDefinitions/CustomerDefinition.marketSegmentDefinition-meta.xml`, replacing the model and DMO/key consistently:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</includeCriteria>
  <masterLabel>Customer Definition</masterLabel>
  <segmentType>DBT</segmentType>
</MarketSegmentDefinition>
```

DBT criteria are XML-escaped pipeline XML; this shape omits `segmentOn`. The empty-result SQL does **not** guarantee absence of scanning, processing or off-core activity. With explicit permission for possible processing:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened deploy response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": true, "changed": true, "success": true }] } } }
```

**Org:** stores the definition, not a proven usable runtime segment. A `--dry-run` response is not persisted-create evidence. **Local:** deployment leaves authored XML in place; explicit retrieve writes/replaces the same definition path. Independently compare decoded pipeline SQL/model, label and type. Do not deploy unrelated files through this project-wide selector.

### Read / retrieve

```sh
sf project retrieve start --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Local file: `force-app/main/default/marketSegmentDefinitions/ActiveCustomers.marketSegmentDefinition-meta.xml`. Illustrative excerpt:

```xml
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Active Customers</masterLabel>
  <segmentOn>UnifiedCustomer__dlm</segmentOn>
  <segmentType>UI</segmentType>
  <!-- Retrieved nested selection criteria omitted. -->
</MarketSegmentDefinition>
```

This is a separate **UI retrieval example**, not the DBT creation payload above. The retrieve response identifies `MarketSegmentDefinition:ActiveCustomers` and this path. **Local:** writes criteria/label/target/type XML. **Org:** unchanged; retrieval does not publish, count or activate. XML omits **lookback, schedule, state and dataspace**. Unified/link DMOs, source objects, fields and relationships remain dependencies. `NO_REFRESH` does not prove draft behavior or absence of initial computation on deployment.

### Update

For the owned DBT definition, change only `masterLabel` to `Customer Definition Updated`, preserving decoded criteria/model/SQL and `segmentType`. Repeat the isolated-source deploy and independent retrieve:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative shortened changed-component response:

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": false, "changed": true, "success": true }] } } }
```

An identical redeployment can report the segment component `Unchanged` (`created: false`, `changed: false`). **Unchanged is not zero writes**: a deploy job still occurs and package metadata can change. **Org:** updates only the qualified definition label, not a demonstrated live segment. **Local:** your label edit remains; retrieve replaces XML for comparison. Broader criteria/SQL/UI changes and runtime-update fidelity are not qualified by this Metadata route.

### Delete

For the exact owned DBT definition, an integration supplies an ephemeral empty `manifest/package.xml` and exact `manifest/destructiveChangesPost.xml`. Complete empty package:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

Complete destructive package:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerDefinition</members>
    <name>MarketSegmentDefinition</name>
  </types>
  <version>65.0</version>
</Package>
```

Conditional lower-level command, only when those exact integration-supplied files exist:

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org SOURCE_ALIAS --api-version 65.0 --json
```

Illustrative shortened deletion response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "deleted": true, "success": true }] } } }
```

Require independent inventory absence of `CustomerDefinition`. **Org:** deletes that definition only; no runtime or generated-data cleanup guarantee follows. **Local:** source XML remains for deliberate reconciliation before future deploys; generated manifests are internal and stay out of Git. This is not a required hand-authored-manifest workflow.

## Operational calculated insights

This is a separate runtime route from `MktCalcInsightObjectDef` deployment: **standard CLI transports an API 67 MCP facade create request**, then API 65 direct REST requests manage the returned CI. It is not a dedicated CI CLI command or a demonstrated direct public API 65 POST create endpoint. Creation produces its own Metadata definition. Require compatible existing DMO fields, an unused API name ending `__cio`, and explicit permission for processing/publication. Source lifecycle support does not establish cross-org fidelity or noncomputing target admission.

All REST commands in this and the next chapter print responses to **stdout** (`--json` adds the CLI envelope); they do not automatically create `force-app` source files. Save the shown JSON request files deliberately in a private working directory outside metadata source. File names are user-prepared inputs, not generated artifacts. Inspect HTTP/body errors and embedded facade errors, not CLI exit status alone. Responses below are sanitized illustrative selections; omitted fields/headers are not a complete response contract.

### Create

Save the full `ci-create.json` body. `paramsJson` is a **JSON string**, not an object; its decoded value contains the `input` wrapper. Replace the DMO/fields with existing compatible names:

```json
{
  "toolName": "d360_ci_create",
  "paramsJson": "{\"input\":{\"apiName\":\"CustomerActivity__cio\",\"displayName\":\"Customer Activity\",\"expression\":\"SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm GROUP BY CustomerEvent__dlm.ApplicationId__c\",\"definitionType\":\"CalculatedMetric\",\"dataSpaceName\":\"default\",\"draft\":true}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@ci-create.json' --target-org TARGET_ALIAS --json
```

Illustrative decoded successful **facade result selection**, not the literal facade envelope:

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "isEnabled": true, "publishScheduleInterval": "NOT_SCHEDULED", "dimensions": [], "measures": [] }
```

A facade's outer success/response code can contain an embedded error. Require a real successful result and use its **returned `apiName`** thereafter. **Org:** creates a draft runtime CI and associated definition. `isEnabled: true` and `NOT_SCHEDULED` are not disabled/no-processing guarantees; draft creation is not proof of successful computation. **Local:** only your request JSON exists until you explicitly retrieve metadata.

### Read / retrieve

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method GET --target-org TARGET_ALIAS --json
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

Illustrative selected REST body:

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "dataSpace": "default", "publishScheduleInterval": "NOT_SCHEDULED", "lastRunStatus": null }
```

**Org:** both reads leave configuration unchanged. **Local:** REST prints stdout only; the separate retrieve writes `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`, retaining expression, creation type and label but not complete runtime state. Use the actual Metadata member name when correlating the runtime object, not a runtime selector in `--metadata`.

### Update

Publication is a runtime PATCH, **not** Metadata deployment. Save complete `ci-publish.json`:

```json
{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "SystemManaged" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-publish.json' --target-org TARGET_ALIAS --json
```

Illustrative selected body:

```json
{ "apiName": "CustomerActivity__cio", "status": "PROCESSING", "publishScheduleInterval": "SYSTEM_MANAGED" }
```

Read the same CI with GET until processing resolves; require `ACTIVE`, correct expression, and expected dimension/measure schema before considering publication settled. Stop on errors or an unresolved transition; do not blindly repeat publication. `ACTIVE` proves an operational definition, **not materialized output, successful last run or computation completion**. No explicit run/computed dataset is qualified here.

For the qualified label/schedule update, save `ci-update.json` (omit `definitionType` on update):

```json
{ "displayName": "Customer Activity Updated", "publishScheduleInterval": "NotScheduled" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-update.json' --target-org TARGET_ALIAS --json
```

Illustrative selected body:

```json
{ "apiName": "CustomerActivity__cio", "displayName": "Customer Activity Updated", "status": "PROCESSING", "publishScheduleInterval": "NOT_SCHEDULED" }
```

Independently GET and verify label/schedule, identity, unchanged SQL and dimension/measure schema; reconcile any processing transition. `NotScheduled` does not mean disabled. **Org:** PATCH changes runtime configuration and may process. **Local:** only the deliberately saved request files change; retrieve metadata separately if needed. Arbitrary SQL mutation and identical-repeat semantics are not qualified by these commands.

### Delete

Delete only the explicitly owned CI after reviewing dependencies. The demonstrated CLI request-file form avoids the local empty-body error possible with a bare `--method DELETE`. Save full `ci-delete.json`:

```json
{ "url": "/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file ci-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/calculated-insights' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0 --json
```

The delete response can be empty while the CI remains `DELETING`. Illustrative selected collection during transition:

```json
{ "items": [{ "apiName": "CustomerActivity__cio", "status": "DELETING" }] }
```

**Terminal checks:** reconcile the full runtime collection, including any continuation, until the exact CI is absent; independently require its Metadata member absent from the inventory. An empty DELETE body is not completion. Do not issue another DELETE merely because removal is asynchronous. **Org:** removes the owned runtime CI and associated definition asynchronously; no general generated-data cleanup claim follows. **Local:** request files and any earlier retrieved XML remain; reconcile stale XML before future deployments.

## Operational segments

This API 65 REST route creates a live segment, unlike a saved `MarketSegmentDefinition` alone. It requires compatible existing unified DMO/key fields and explicit permission for automatic processing. **`NoRefresh` can transition `PROCESSING` → `ACTIVE`**; it is not draft/noncomputing admission. Empty-result SQL also does not prove no processing. No member export, send destination or explicit publication/count/run is implied.

### Create

Save full `segment-create.json`, replacing the model name and existing DMO/key together:

```json
{
  "developerName": "ActiveCustomers",
  "displayName": "Active Customers",
  "description": "Customer segment with an empty initial audience",
  "segmentOnApiName": "UnifiedCustomer__dlm",
  "segmentType": "Dbt",
  "includeDbt": {
    "models": {
      "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }]
    }
  },
  "publishSchedule": "NoRefresh"
}
```

```sh
sf api request rest '/services/data/v65.0/ssot/segments' --method POST --body '@segment-create.json' --target-org TARGET_ALIAS --json
```

Illustrative selected response body:

```json
{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "includeDbt": { "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }] } }
```

**Input uses nested `includeDbt.models.models`; output uses an array at `includeDbt.models`.** Do not send the response back verbatim as a request. Use returned API name/identities to reconcile the same segment. `P90D` is the returned lookback in this qualified shape, not a universal configurable default. **Org:** creates a live definition and may process automatically. **Local:** request JSON is user-authored; REST writes stdout, not project XML.

### Read / retrieve

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
```

Illustrative selected GET body, whose segment is inside `segments`:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

Require the exact API name/identities, original SQL/model/type/dataspace, lookback and schedule. Resolve `PROCESSING` to terminal status before the next lifecycle operation; `ACTIVE` alone is not broader migration or publication fidelity. **Org:** unchanged by GET. **Local:** stdout only. For XML, separately run the Metadata retrieve command in the `MarketSegmentDefinition` chapter; that artifact is not a full runtime export.

### Update

A sparse label-only PATCH is not qualified. The supported update carries the **complete preserved definition** (type, segment-on and DBT model/SQL), changes only label/description and **omits both `publishSchedule` and `publishScheduleInfo`** to preserve the existing no-refresh schedule. Do not re-send `NoRefresh` on this PATCH or invent a `None` schedule subtype.

Save complete `segment-update.json`:

```json
{
  "displayName": "Active Customers Updated",
  "description": "Updated customer segment description",
  "segmentType": "Dbt",
  "segmentOnApiName": "UnifiedCustomer__dlm",
  "includeDbt": {
    "models": {
      "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }]
    }
  }
}
```

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method PATCH --body '@segment-update.json' --target-org TARGET_ALIAS --json
```

Illustrative selected response body:

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

Independently GET until settled `ACTIVE`; require updated label/description and unchanged identity, type, dataspace, segment-on, model/SQL, lookback and schedule. This qualifies preservation for this narrow complete-definition update, **not arbitrary missing-field preservation, schedule/lookback editing or broader SQL/UI grammar**. **Org:** changes the definition and may process. **Local:** only the user-prepared request changes; no automatic source artifact.

### Delete

Save complete `segment-delete.json` for the explicitly owned segment:

```json
{ "url": "/services/data/v65.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0 --json
```

A successful DELETE can return HTTP `204` with no body. Require independent GET HTTP `404` / `ITEM_NOT_FOUND` and absence of the exact Metadata member, not just an empty response. Illustrative selected error body after removal:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "<segment not found>" }]
```

**Org:** removes the owned live segment/definition; shared unified DMOs or membership tables must not be deleted as guessed cleanup. **Local:** request files and any retrieved XML remain; reconcile stale XML explicitly. Target noncomputing creation, arbitrary schedules and cross-org fidelity remain unqualified.

## Segment Members: runtime data, not metadata

Segment membership uses **API `67.0`** here, independently of the API 65 metadata examples. These are data reads, not `sf project` retrievals. They do not automatically create anything under `force-app/main/default/`, publish a segment or refresh its population. Member identifiers and profile details are personal data: avoid Git, shared logs and screenshots; restrict access and retention for any export.

### Read basic membership

Resolve the exact segment descriptor first:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers' --target-org SOURCE_ALIAS --json
```

Use its returned `marketSegmentId`, `dataSpace`, `segmentMembershipDmo.latestTable` and `segmentOnApiName` for enrichment. Do not infer a membership table from the display name. Then request a small basic page:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --json
```

Illustrative sanitized response, omitting headers and timing/filter properties:

```json
{
  "status": 0,
  "result": {
    "statusCode": 200,
    "body": {
      "data": [{ "id": "<redacted-member-id>", "deltaType": "<redacted>", "snapshotType": "<redacted>", "timestamp": "<redacted>", "versionStamp": "<redacted>" }],
      "limit": 1,
      "offSet": 0,
      "rowCount": 1,
      "totalCount": 1200,
      "nextPageUrl": "<continuation>"
    }
  }
}
```

`totalCount` above is illustrative, not a promised population size. Basic rows contain membership/audit data, **not enriched profile fields**. One CLI invocation makes one request; it does not automatically export every page. The documented maximum page size is **1000**. Basic continuation is a documented mechanism, not an end-to-end qualified full export: issue bounded requests on the same validated path with increasing offsets; check `offSet`, stable totals and nonempty progress, incrementing offset by returned row count. Do not blindly follow a returned URL into another org/path/context. A changing population requires reconciliation rather than assuming a consistent snapshot.

### Read enriched details: discover, join, paginate

There is **no standard CLI `--include-details` flag** for this endpoint. Enrichment requires multiple reads and a Data 360 SQL query; `sf data query` is core **SOQL**, not the Data 360 SQL executor.

1. Resolve the descriptor above, then validate its dataspace with SOQL:

```sh
sf data query --target-org SOURCE_ALIAS --api-version 67.0 --query "SELECT Id, DataSpaceApiName FROM DataSpace WHERE DataSpaceApiName = 'default' LIMIT 2" --json
```

Require exactly one matching dataspace. Illustrative shortened result:

```json
{ "status": 0, "result": { "totalSize": 1, "done": true, "records": [{ "DataSpaceApiName": "default" }] } }
```

2. Read Data 360 schema in that space:

```sh
sf api request rest '/services/data/v67.0/ssot/metadata' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

From the response, resolve the descriptor's **exact latest membership table** and **segment-on detail DMO**, primary key, ordered detail fields and the relationship between them. Require an exact **N:1** relationship with source/target attributes (including `fromEntityAttribute` / `toEntityAttribute` where returned). Do not hardcode a field count or assume `Id__c` joins to every DMO's key. Illustrative selected schema facts, abbreviated from the larger metadata response:

```json
{
  "membershipTable": "CustomerMembership__dlm",
  "detailTable": "UnifiedCustomer__dlm",
  "membershipKey": "Id__c",
  "detailKey": "CustomerKey__c",
  "detailFieldsInMetadataOrder": ["CustomerKey__c", "DisplayName__c"],
  "relationshipCardinality": "NTOONE"
}
```

This block is an explanatory selection, **not the literal REST metadata envelope**. Stop if identities, keys, cardinality or field order are missing/ambiguous.

3. Prepare the SQL request. The following is the **complete JSON body** for a minimal illustrative two-detail-column projection. Replace table/key/field identifiers using discovery; to include all details, enumerate **every discovered detail field in metadata order**, not `SELECT *`. Replace `SEGMENT_ID_15` with the resolved MarketSegment ID's case-preserved first 15 characters, never the segment API name. Quote identifiers and validate/escape values before constructing SQL.

Save this request as `segment-member-query.json` in a private working directory, outside metadata source and excluded from Git:

```json
{
  "sql": "SELECT * FROM (SELECT d.\"CustomerKey__c\", d.\"DisplayName__c\", m.\"Id__c\" AS \"membership_key_internal\", COUNT(d.\"CustomerKey__c\") OVER (PARTITION BY m.\"Id__c\") AS \"detail_match_count_internal\" FROM \"CustomerMembership__dlm\" m LEFT JOIN \"UnifiedCustomer__dlm\" d ON m.\"Id__c\" IS NOT DISTINCT FROM d.\"CustomerKey__c\" WHERE m.\"Segment_Id__c\" = 'SEGMENT_ID_15') q ORDER BY \"membership_key_internal\" LIMIT 2",
  "rowLimit": 1
}
```

The outer `SELECT *` preserves the explicitly ordered inner projection. `LIMIT 2` bounds the **total query result**, while `rowLimit: 1` requests one result row per page. Neither bounds total engine scanning. The null-safe `LEFT JOIN` retains membership rows without a detail match; unmatched detail values are null. Do not accept more than one matching detail row per membership key.

Submit the JSON file explicitly:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body '@segment-member-query.json' --json
```

`--body @file` reads the shown JSON, not a metadata manifest. The equivalent `--body -` takes that JSON from stdin; stdin submission is the qualified execution route. For example, from PowerShell in the private working directory:

```powershell
Get-Content -Raw -LiteralPath './segment-member-query.json' | sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body - --json
```

The file-input form is documented CLI syntax. POST submits a read query, not a segment refresh, but it can consume query resources.

Illustrative shortened successful submission (`201` is valid):

```json
{
  "status": 0,
  "result": {
    "statusCode": 201,
    "body": {
      "data": [[null, null, "<redacted-membership-key>", 0]],
      "metadata": ["<column descriptors abbreviated>"],
      "returnedRows": 1,
      "status": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 }
    }
  }
}
```

The four-value row illustrates this minimal projection's two null detail fields, membership key and zero detail matches. With all discovered fields, actual row width is **detail-field count + 2**. This sample does not disclose a person's data or imply that only two detail columns exist.

4. Use the fresh query handle in `result.body.status.queryId` (or `body.queryId` where returned). If asynchronous, poll the query status until recognized success; stop on errors, expiry or incompatible status/schema:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Illustrative shortened status response: unlike submission, status properties are **directly at the body root**:

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 } } }
```

Submission may already include page one. Use `offset=1` only after validating and accepting exactly one submission row (including metadata width/order and match count). Read the next bounded page without submitting a second query:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=1&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Otherwise, if submission contains no rows, wait for recognized status success, then fetch the first bounded page at `offset=0&rowLimit=1` so row zero is not skipped:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=0&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Illustrative sanitized continuation:

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "data": [[null, null, "<redacted-membership-key>", 0]], "metadata": ["<column descriptors abbreviated>"], "returnedRows": 1 } } }
```

`returnedRows` is page size; `status.rowCount` is the total bounded SQL result. Advance offset by the actual number of validated and accepted rows, including any accepted submission rows, not by the requested page size. Keep offsets/page bounds, stable total and metadata width/order consistent; require positive progress, stop at the total, and reject match counts greater than one before exporting. Two bounded SQL pages are qualified, **not an unbounded/full-population export**. Raw CLI retains array rows and the two internal validation columns; it does not automatically remove internals, format label/API keys or normalize dates. Validate and transform privately before delivering data.

### Local output, privacy and unsupported operations

Without `--stream-to-file`, `sf api request rest` writes to **stdout**; `--json` wraps `statusCode`, headers and body. No runtime-data file or source artifact is automatically created. Avoid logging the complete output.

Optional documented file-output syntax, **not live-qualified for this member workflow**:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --stream-to-file 'PRIVATE_EXPORT_PATH/members.json'
```

Choose a real restricted path outside metadata source; this flag writes API response bytes. Do not add `--include` when pure JSON is required. The query request file and any member/profile output should stay out of Git; stdout redirection and file output are explicit user choices, not automatic metadata retrieval. Create/update/delete of membership rows, refresh/publish and a single-call equivalent of enriched export are not provided here.

See the official [segment members API](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/references/mc-connect-segments?meta=getSegmentMembers).

## Operational Data Graphs

Use standard `sf api request rest` as transport for the documented **API 67 MCP execute facade**. These are not qualified native graph CRUD endpoints. A `DataKitObjectTemplate` deployment stores template XML; **it does not instantiate this runtime graph**.

The root-only example projects a customer key/name from an existing unified DMO, then adds the surname. `UnifiedssotIndividualMkt__dlm` and its Text fields `ssot__Id__c`, `ssot__FirstName__c`, `ssot__LastName__c` are a compatible schema shape; verify the exact root, types, mapped fields and key in your org before using them. Replace the root name consistently if yours differs. Do not create or modify the underlying DMO merely to follow this example.

**Creation automatically processes** and generates supporting objects/transform; updates can also process. Require explicit permission and account for resource use—no zero-cost/noncomputing or cross-org guarantee is established. Save the following complete JSON request bodies deliberately outside metadata source. `paramsJson` is a JSON string. Commands print to stdout (`--json` supplies the CLI envelope); they create **no automatic `force-app` artifact**. Inspect embedded facade errors even when the HTTP/CLI envelope succeeds. Samples below show sanitized decoded result selections, not full facade envelopes.

### Create

Save `graph-create.json`:

```json
{
  "toolName": "d360_data_graph_create",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-create.json' --target-org TARGET_ALIAS --json
```

Illustrative selected result:

```json
{ "name": "CustomerGraph", "status": "creating", "version": "1" }
```

**Org:** creates the runtime graph and starts automatic supporting work; there is no required explicit activation/refresh step in this sequence. Do not submit duplicate refresh/create requests while work is running. **Local:** only your request file exists; runtime responses go to stdout.

### Read / retrieve

Save `graph-get.json`, using the actual created name:

```json
{ "toolName": "d360_data_graph_get", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\",\"includeCIDetails\":true,\"includeSegmentDetails\":true}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS --json
```

Illustrative selected settled result:

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1" }
```

Independently inspect the returned root, projected fields/key flags, description, schedule and incremental setting—not merely the state. Capture exact generated ID/VALUE/fragment DMO and transform references from returned configuration before deletion; do not guess their generated names. Consumer detail flags do not guarantee an exhaustive external-consumer inventory. **Org:** unchanged by this facade read despite its HTTP POST transport. **Local:** stdout only. Template retrieval is separate and writes `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml` as described below.

### Update

Preserve the complete configuration, change the description and add the verified surname projection. Save `graph-update.json`; `editScheduleOnly` is **outside `input`**:

```json
{
  "toolName": "d360_data_graph_update",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key, given-name and surname projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true},{\"sourceFieldName\":\"ssot__LastName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}},\"editScheduleOnly\":false}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-update.json' --target-org TARGET_ALIAS --json
```

Illustrative selected initial result:

```json
{ "name": "CustomerGraph", "status": "processing", "version": "1" }
```

The qualified sequence is **initial generated transform completes successfully, then update is accepted**; earlier states can reject edits. Neither `ready` alone nor transform completion is a universal edit-eligibility guarantee, and not every lifecycle state is mutable. Reconcile work/status errors instead of blindly retrying. Independent GET must confirm the changed description and three projected Text fields: Id key=true, FirstName/LastName key=false; preserve root, seven-day schedule and incremental=false. Update can pass through `processing` / `editing_post_sync` before `ready`.

Once settled, repeating the identical update request can retain the same graph/node/field identities, version `1` and semantic definition. Verify with independent GET; this is **not a guarantee of zero writes, no processing or universal idempotency**. **Org:** changes runtime projection/description. **Local:** request edit only; no automatic template/source synchronization.

### Delete

Review dependencies, then save `graph-delete.json` for the explicitly owned graph:

```json
{ "toolName": "d360_data_graph_delete", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-delete.json' --target-org TARGET_ALIAS --json
```

Illustrative selected result:

```json
{ "success": true }
```

Require independent `graph-get.json` to report the exact graph not found. The inspected generated ID/VALUE/fragment DMOs and transform can also become unreadable after deletion; confirm exact captured references with the same access used before removal. This supports only those inspected artifacts: **generated mapping absence and graph-specific internal-state cleanup are not proven**. Do not claim universal absence of leftovers or delete the shared `DataGraphStateTable__dlm` or the source unified DMO as guessed cleanup. **Org:** removes the owned graph; supporting-artifact cleanup is bounded as above. **Local:** request files and any separately retrieved template XML remain for deliberate reconciliation.

## Operational Identity Resolution

Standard CLI can execute the documented **API 67 MCP facade** for source Identity Resolution create/read/substantive update/delete. Native API 65 **GET** is separately supported below; native write equivalence and cross-org fidelity are not established. This route needs no custom data plugin, user manifest or mandatory GUI workflow.

Use existing compatible Individual/name/ContactPointEmail fields and a unique ruleset suffix of **at most four characters**. `cust` below is illustrative; verify it is unused and use the actual returned `objectApiName` thereafter. Creation and update automatically enter **`PUBLISHING` even with `doesRunAutomatically: false`**. This is not draft/nonpublishing admission or a no-processing guarantee. Require explicit permission for publication/provisioning; no successful data-run/profile-counter claim follows.

All files below are complete user-prepared request JSON saved deliberately outside metadata source. `paramsJson` is a **JSON string**. Standard REST commands write stdout, with `--json` wrapping the response; no automatic `force-app` source artifact is created. Inspect **nested `body.error`** as well as the decoded result: HTTP `201` and CLI exit `0` can still contain an operation error. Samples are sanitized illustrative decoded selections, not literal complete facade envelopes.

### Create

Save `ir-create.json`:

```json
{
  "toolName": "d360_ir_create",
  "paramsJson": "{\"input\":{\"configurationType\":\"Individual\",\"dataSpaceName\":\"default\",\"label\":\"Customer Identity\",\"description\":\"Resolve customers using name and normalized email\",\"rulesetId\":\"cust\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"LastUpdated\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-create.json' --json
```

Illustrative selected result:

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHING" }
```

**Org:** creates the owned ruleset and starts automatic publication/provisioning of unified/link outputs. Additional reconciliation entities can be supplied by the service; do not assume the request's single reconciliation rule is the complete response. **Local:** request file only; no generated source XML. Capture the returned identity and exact generated output references for readback/deletion reconciliation, not guessed naming patterns.

### Read / retrieve

Save `ir-get.json` with the actual returned identity:

```json
{ "toolName": "d360_ir_get", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
sf api request rest '/services/data/v65.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --json
```

Illustrative selected settled result:

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHED" }
```

The facade read uses POST transport but does not mutate the ruleset. Require exact identity, match criteria, reconciliation values and generated output references. **Wait for `PUBLISHED` before updating**; `PUBLISHING` can reject an update despite outer HTTP/CLI success. Stop on nested errors or unresolved transitions rather than replaying writes. **Org:** unchanged by reads. **Local:** stdout only. A separate kit/template retrieve can write XML but is not this runtime configuration route.

### Update

The qualified update preserves the complete name/email match definition and changes the Individual reconciliation rule from `LastUpdated` to **`MostFrequent`**, plus description. Supply label and full matching/reconciliation input; do not assume an arbitrary sparse PATCH works. Save `ir-update.json`:

```json
{
  "toolName": "d360_ir_update",
  "paramsJson": "{\"identityResolution\":\"Individual_cust\",\"input\":{\"label\":\"Customer Identity\",\"description\":\"Prefer the most frequent customer values\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"MostFrequent\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-update.json' --json
```

Illustrative selected result, abbreviating other service-supplied rules:

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "PUBLISHING", "reconciliationRules": { "rules": [{ "entityName": "ssot__Individual__dlm", "ruleType": "mostfrequent" }] } }
```

Independently GET and reconcile publication, unchanged identity/matches and the substantive reconciliation change. Do not treat the echoed update as sufficient readback or perform another update while publishing. **Org:** changes the ruleset and can publish/provision again, even with automatic runs false. **Local:** only the request file changes; no automatic template refresh. Broader matching grammar, run success and repeat/idempotency behavior are not qualified here.

### Delete

Save `ir-delete.json` for the explicitly owned ruleset after dependency review:

```json
{ "toolName": "d360_ir_delete", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-delete.json' --json
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
```

Illustrative decoded delete result and transitional read selection:

```json
{ "success": true }
```

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "DELETING", "reconciliationRules": [] }
```

Delete acceptance is **not completion**. Poll the exact identity until the facade reports not found; independently confirm native API 65 GET HTTP `404` / `ITEM_NOT_FOUND`. Do not repeat DELETE while asynchronous removal is underway. Generated outputs can remain readable during `DELETING`; reconcile their exact captured references only after terminal ruleset absence. Later unreadability of inspected output/link DMOs means absent **or inaccessible**, not permission-independent proof of physical deletion, profile-row removal or universal cleanup. Do not race the owning ruleset's cleanup with guessed DMO deletes.

**Org:** removes the owned ruleset asynchronously. **Local:** request files and separately retrieved template XML remain; protect personal/configuration data and reconcile stale artifacts deliberately.

### Template transport and instantiation limits

Kit/template Metadata transport is separate from runtime CRUD. A manually constructed IR template can be stored successfully yet its asynchronous instantiation job can fail; that does **not** establish failure of every valid Salesforce-generated kit. An accepted job must be reconciled to terminal success/error, not equated with instantiated IR. The currently available tools do not expose canonical kit creation/component-add/template-generation; reading a manifest is not generation. Do not invent token/config fields or prescribe mandatory GUI work for the direct facade workflow above. Successful canonical kit instantiation and cross-org replay remain unqualified.

## Kit template: `DataKitObjectTemplate`

### Create

Standard deployment can store a standalone **Data Graph template**, without instantiating a graph or requiring a parent kit. Use the complete, dependency-reviewed template XML at `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`. The payload must retain its valid root, projected fields, data types, key flags and other required configuration; the abbreviated excerpt below is not a complete creation payload.

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

Illustrative shortened response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" }] } }
```

**Org:** stores the template only. A successful deployment does not create the named runtime graph, install a kit or qualify component replay. **Local:** deployment does not rewrite the template file. Independently retrieve and compare the decoded payload. No inertness or cross-org fidelity guarantee follows.

### Read / retrieve

Retrieve one standalone template directly:

```sh
sf project retrieve start --metadata DataKitObjectTemplate:CustomerGraph --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Illustrative shortened response:

```json
{ "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created", "filePath": "force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml" }] } }
```

**Local:** writes the XML-escaped JSON template payload at that path. **Org:** unchanged. For a complete kit snapshot, retain its definition and membership links as well.

### Read / retrieve a kit snapshot

Retrieve kit templates together with their definition and membership links. The lower-level transport uses an **internally generated** manifest containing the actual member names, not merely the kit display name. Illustrative complete manifest structure at `manifest/package.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerGraph</members>
    <members>CustomerIdentity</members>
    <members>ActiveCustomers</members>
    <name>DataKitObjectTemplate</name>
  </types>
  <types>
    <members>CustomerKit</members>
    <name>DataPackageKitDefinition</name>
  </types>
  <types>
    <members>CustomerKitGraphMember</members>
    <members>CustomerKitIdentityMember</members>
    <members>CustomerKitSegmentMember</members>
    <name>DataPackageKitObject</name>
  </types>
  <version>65.0</version>
</Package>
```

The member names above are illustrative; use actual names, not invented naming conventions. Lower-level command:

```sh
sf project retrieve start --manifest manifest/package.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Illustrative shortened response:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "files": [
      { "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" },
      { "fullName": "CustomerKit", "type": "DataPackageKitDefinition", "state": "Created" },
      { "fullName": "CustomerKitGraphMember", "type": "DataPackageKitObject", "state": "Created" }
    ]
  }
}
```

Other selected templates/members are omitted from this abbreviated response. Local template paths:

- `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/CustomerIdentity.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/ActiveCustomers.dataKitObjectTemplate-meta.xml`

Illustrative template-file excerpt:

```xml
<DataKitObjectTemplate xmlns="http://soap.sforce.com/2006/04/metadata">
  <entityPayload><!-- XML-escaped JSON payload omitted. --></entityPayload>
  <sourceObjectType>DataGraph</sourceObjectType>
  <templateVersion>1</templateVersion>
  <!-- Other retrieved template attributes omitted. -->
</DataKitObjectTemplate>
```

**Local:** writes substantive payloads, not just names; identity resolution uses `IdentityResolution`, segments `MarketSegment`. **Org:** unchanged, no kit installation or instantiation. Data graphs include projected fields/joins and refresh settings; identity resolution includes match/reconciliation rules and automatic-run settings. Segment templates omit live publish schedule/status. Existing kits are snapshots, not automatically refreshed live exports.

Source IDs, generated DMOs/transforms and external DLO references remain dependencies. Disabled kit state does not neutralize graph refresh or identity-resolution automatic runs. Direct individual graph/identity-resolution metadata lifecycle is not qualified; do not infer it from kit transport.

### Update

A Data Graph template's **description inside `entityPayload`** can be updated with the same selector command. Decode the JSON, change only its description, re-encode it as XML text in the complete template file, and preserve all root/field/key/type settings:

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

Illustrative shortened response:

```json
{ "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Changed" }] } }
```

**Org:** updates stored template content, not an instantiated graph. Retrieve independently to confirm the decoded description and preserved payload. **Local:** your XML edit remains; deployment does not rewrite it. Full graph updates through template deployment, arbitrary payload edits and refreshing snapshots from current live configuration are not qualified; the separate operational graph chapter qualifies only its facade-based projection/description update. Identity-resolution template/container operations are separate; do not infer that a whole-container repeat/update is supported.

### Delete

A stored Data Graph template can be removed, but no exact reproducible standard delete invocation is specified by this reference. No deletion command is offered. Do not infer runtime graph deletion or supporting-artifact cleanup from template removal.

## Kit definition: `DataPackageKitDefinition`

### Create

Kit creation/installation and target replay are not qualified. Transporting kit metadata does not instantiate its components.

### Read / retrieve

Use the combined kit manifest command above. Local file: `force-app/main/default/dataPackageKitDefinitions/CustomerKit.dataPackageKitDefinition-meta.xml`. The abbreviated response includes `DataPackageKitDefinition:CustomerKit`.

Illustrative excerpt:

```xml
<DataPackageKitDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <isEnabled>false</isEnabled>
  <isDeployed>false</isDeployed>
  <!-- Retrieved template ordering, state and other definition attributes omitted. -->
</DataPackageKitDefinition>
```

**Local:** writes definition/state/order XML. **Org:** unchanged. These flags do not guarantee inactive downstream behavior or complete dependency closure.

### Update

Definition updates are not qualified.

### Delete

Deletion/undeployment is not qualified.

## Kit membership: `DataPackageKitObject`

### Create

Member creation is not qualified.

### Read / retrieve

Use the same combined kit manifest command. Local files:

- `force-app/main/default/DataPackageKitObjects/CustomerKitGraphMember.DataPackageKitObject-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerKitIdentityMember.DataPackageKitObject-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerKitSegmentMember.DataPackageKitObject-meta.xml`

Capitalization matters. Illustrative graph-member file:

```xml
<DataPackageKitObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Customer Kit</masterLabel>
  <parentDataPackageKitDefinitionName>CustomerKit</parentDataPackageKitDefinitionName>
  <referenceObjectName>CustomerGraph</referenceObjectName>
  <referenceObjectType>DataKitObjectTemplate</referenceObjectType>
</DataPackageKitObject>
```

Each file links a kit to a template; preserve its exact retrieved references. The abbreviated kit response includes `DataPackageKitObject:CustomerKitGraphMember`. **Local:** writes membership XML. **Org:** unchanged. These links are not independent proof of portable components.

### Update

Member updates are not qualified.

### Delete

Member deletion is not qualified.

## Kit transport is not component instantiation

Standard CLI retrieval/deployment transports kit metadata. Instantiating an installed kit is a **separate asynchronous Connect deployment** whose job must be reconciled to completion/error; transport success alone is not target component creation. See Salesforce's [CLI kit transport guide](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy_data_kit_using_cli.html) and [Connect kit deployment guide](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy-data-kits-using-connect-api.html).

`sf-plugin-data` has separate bounded DMO JSON retrieval, preview and guarded creation/label-update capabilities. Those commands do not support every operation listed here. Keep export completeness, dependency closure, lifecycle fidelity, safe execution and independent post-operation readback as separate requirements.
