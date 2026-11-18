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
  read: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "yes", plugin: "yes" } }
  update: { status: "partial", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "partial" } }
  delete: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "yes", plugin: "yes" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

This badge does not verify untested writes or general CRUD support. A claim marked **offline-tested** rests on the plugin code and its offline tests; no live run is recorded for it.

<a id="field-relationship-fieldsrctrgtrelationship"></a>

A field relationship links a source field to a target field. Many records in the source object can point to one record in the target object.

**Example used in every chapter:** the `OrderCustomer` relationship from `Order__dlm` to `Customer__dlm`. The source field is `Order__dlm.CustomerId__c` and the target field is `Customer__dlm.Id__c`.

The target can also be a CRM object: in the Data Cloud UI the related-object type is Data Cloud or CRM, and a relationship to a CRM object such as `Account.Id` has owner `SObject`.

Three rules apply. The native route and the plugin need the source DMO, and a target DMO, to be mapped before Salesforce creates a relationship; the Metadata API created one between two unmapped DMOs. Salesforce generates the relationship name when it creates the relationship (for example `Order_CustomerId_map_Customer_Id_1794467679481`), except on the Metadata API route, where the metadata name is yours. Salesforce offers no read by relationship name: relationships are read through the list of a DMO.

**Plugin qualification:** "Yes" means the plugin workflow works in the tested scope listed under Evidence, not for every relationship.

**Enum letter case:** An enum value in `cardinality` or `relationshipOwner` that differs from Salesforce's stored spelling only in letter case counts as unchanged on deploy. The plugin sends the value as written; retrieve writes Salesforce's spelling.

<a id="beyond-the-gui"></a>

{% capture beyond_gui %}
- **Change the label of an existing relationship.** Metadata API (`updateMetadata`, or `sf project deploy start` of the retrieved file) and plugin `deploy`. The Data Cloud UI's Edit Relationships dialog has no label field.
- **Change the cardinality, the source field or the target field in place**, keeping the same relationship id. Metadata API and `sf project deploy start`; the plugin was observed changing the cardinality and the target field (source field: Metadata API only). In the UI dialog, field, cardinality and related field are locked for an existing relationship; only the Active switch and delete work.

Evidence: live checks at API 68.0, 2026-11-16, on an `ACTIVE` relationship between mapped custom DMOs, plus a look at the UI dialog without saving. A changed target object or owner is refused by every route, the UI included. Details under Update and in the Evidence section.
{% endcapture %}
{% include callout.html type="tip" title="Beyond the Data Cloud GUI" content=beyond_gui %}

{% include crud-summary.html %}

## Read

{% capture read_cli %}
Downloads the relationship definition as an XML file.

```sh
sf project retrieve start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org SOURCE_ALIAS --wait 5
```

The file is saved to `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`. It contains the elements shown in the Create chapter:

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

Retrieve the `CustomObject` definitions separately if you also need the objects and fields.
{% endcapture %}

{% capture read_connect %}
Lists the relationships of one DMO, as source or as target. Nothing in the org changes. Quote the URL so the shell keeps the `&`.

```sh
sf api request rest "/services/data/v68.0/ssot/data-model-objects/Order__dlm/relationships?limit=200&offset=0" --target-org SOURCE_ALIAS --method GET
```

**Response excerpt (HTTP 200)**, limited to the keys this page relies on:

```json
{
  "relationships": [
    {
      "id": "0geXXXXXXXXXXXXXXX",
      "name": "Order_CustomerId_map_Customer_Id_1794467679481",
      "status": "ACTIVE",
      "creationType": "Custom",
      "owner": "DataCloud",
      "cardinality": "ManyToOne",
      "sourceObject": { "name": "Order__dlm" },
      "sourceField": { "name": "CustomerId__c" },
      "targetObject": { "name": "Customer__dlm" },
      "targetField": { "name": "Id__c" }
    }
  ],
  "totalSize": 1
}
```

A DMO without relationships answers HTTP `204` with no body. Page with `offset`: the `nextPageUrl` in a response repeats the current offset, so it does not advance. A relationship created through the Metadata API reads `INACTIVE`; one created through the native route below reads `ACTIVE`.

**Known failures:**

- `GET /services/data/v68.0/ssot/data-model-objects/relationships/{name}` answers HTTP `405`: only DELETE is allowed on the by-name route.
{% endcapture %}

{% capture read_plugin %}
Saves every relationship whose source is the named DMO, one JSON file each.

```sh
sf data360 retrieve -m relationship:Order__dlm -o SOURCE_ALIAS
```

The file is `data360/relationship/<Name>.relationship-meta.json`, named after the relationship Salesforce generated. It holds the six authored values and leaves out the id, labels, status and creation type:

```json
{
  "schemaVersion": 1,
  "kind": "relationship",
  "identity": {
    "apiName": "Order_CustomerId_map_Customer_Id_1794467679481",
    "dataSpace": "default"
  },
  "spec": {
    "sourceObjectName": "Order__dlm",
    "sourceFieldName": "CustomerId__c",
    "targetObjectName": "Customer__dlm",
    "targetFieldName": "Id__c",
    "cardinality": "ManyToOne",
    "relationshipOwner": "DataCloud"
  }
}
```

A relationship to a CRM object is saved the same way, with the CRM object and field as target and owner `SObject`:

```json
"targetObjectName": "Account",
"targetFieldName": "Id",
"relationshipOwner": "SObject"
```

Select several DMOs with repeated `-m` flags. A bare `-m relationship` retrieves every relationship of the org: there is no org-wide list route, so the plugin reads the relationships of every DMO the API lists, one DMO after another over one connection. It then reads the relationship labels of all DMOs together through the Metadata API, 10 names per read: about 3,800 relationships of about 850 DMOs took about 380 reads and about 4 minutes, which stays within the Metadata API's hourly request limit. A failed label read fails only the DMOs whose names it carried. The plugin pages the DMO's list by offset; the pages must add up to the reported `totalSize` without duplicate names, otherwise that DMO stops with `RELATIONSHIP_INVENTORY_INCOMPLETE`. An identical local file is unchanged; a differing one needs `--overwrite` (`-x`). `--output-dir` (`-d`) sets the project root, which defaults to the current directory. The optional `--dataspace NAME` (alias `--data-space`) selects a data space other than `default`; non-default spaces are offline-tested only.
{% endcapture %}
{% capture read_metadata %}
### Metadata API read of the relationship definition

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>FieldSrcTrgtRelationship</met:type>
      <met:fullNames>OrderCustomer</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds the elements of the CLI tab's file plus an empty `targetEntity` (`xsi:nil`). A name that does not exist returns an empty record, not an error. `listMetadata` with the type `FieldSrcTrgtRelationship` returns every relationship of the org without naming them, standard and custom, each with its `fullName` and the `0ge` id that the native list also shows.
{% endcapture %}
{% include operation-tabs.html id="relationship-read" label="Read" cli_state="available" cli_reason="Retrieves the relationship XML. Retrieve the object definitions separately." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0: listMetadata lists every relationship of the org; readMetadata returns named definitions." metadata_body=read_metadata connect_state="available" connect_reason="Lists a DMO's relationships over the native route, tested at API 68.0." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves every relationship (bare -m relationship) or those of one named source DMO. Observed at API 68.0 on empty custom DMOs." plugin_body=read_plugin %}

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

The deployment creates the lookup and the relationship. It does not create the DMOs or their key fields. Read back the relationship, field references and cardinality to confirm them. The new relationship reads `INACTIVE` through the native list.
{% endcapture %}

{% capture create_connect %}
Creates one relationship on its source DMO. Both DMOs must already exist and be mapped. Save `relationship-create.json`:

```json
{
  "relationships": [
    {
      "sourceObjectName": "Order__dlm",
      "sourceFieldName": "CustomerId__c",
      "targetObjectName": "Customer__dlm",
      "targetFieldName": "Id__c",
      "cardinality": "ManyToOne",
      "relationshipOwner": "DataCloud"
    }
  ]
}
```

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Order__dlm/relationships --target-org TARGET_ALIAS --method POST --body @relationship-create.json --header Content-Type:application/json
```

Salesforce answers HTTP `201` with the created relationship, in the shape of the Read chapter, including the generated `name`. The relationship was listed `ACTIVE` from both DMOs about 5 seconds later. Read the list to confirm it.

**Known failures:**

- A relationship between two DMOs that are not mapped is refused with HTTP `400` `INVALID_INPUT`: "No ObjectSourceTargetMaps were found for the DMOs in the relationships. Make sure that the DMOs are mapped." Nothing is created.
{% endcapture %}

{% capture create_plugin %}
Creates the relationship from `data360/relationship/<Name>.relationship-meta.json`, in the shape shown in the Read chapter. Preview first.

```sh
sf data360 deploy -m relationship:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS --preview
sf data360 deploy -m relationship:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS
```

`--source-dir` with the file path works as well; the file must sit in a `data360/relationship/` folder and its name must match `identity.apiName`. A hand-written file may use any name: deploy lists the source DMO's relationships and finds the relationship by the file's name, otherwise by its binding (source and target object and field). `--preview` only reads.

- Present with the file's values: `unchanged`, nothing is written.
- Absent: one create request on the source DMO, then reads of the list until the relationship is `ACTIVE` with the requested cardinality and owner. The result names the relationship Salesforce created in `targetApiName`. If that does not happen in time, the command ends with `RELATIONSHIP_PERSISTENCE_UNCONFIRMED`, and a status other than `ACTIVE` or `CREATING` stops the reads at once with the same code.
- Present with other values: updated through the Metadata API (see the Update chapter). A file with a `label` gets the label set the same way right after a create.

Cardinality and owner are sent as written; Salesforce decides which values it accepts. A relationship between unmapped DMOs is rejected by Salesforce with HTTP `400` and reported as `RELATIONSHIP_HTTP_ERROR`; the plugin does not check this itself. Two files with the same binding in one command are refused (`DUPLICATE_IDENTITY`).

In a batch the relationship runs after the DLOs, DMOs and mappings, so one command can create all of them:

```sh
sf data360 deploy -m dlo:OrderSource__dll -m dlo:CustomerSource__dll -m dmo:Order__dlm -m dmo:Customer__dlm -m mapping:OrderMapping -m mapping:CustomerMapping -m relationship:OrderCustomer -o TARGET_ALIAS
```

A preview of a relationship whose DMO the same batch creates reports `planned-dependencies` (`RELATIONSHIP_DEPENDENCIES_PLANNED`): nothing is asserted about the relationship until the DMO exists.

Creating a relationship makes Salesforce add a key qualifier `KQ_<Field>__c` for its source field, for example `KQ_RefId__c` for `RefId__c`, even when that field is no key: to the source DMO, to the DLO mapped onto it and as a pair to that mapping. The plugin treats these as generated, so the hand-written DLO, DMO and mapping files redeploy `unchanged` afterwards and a retrieve leaves them out. `--dataspace NAME` (alias `--data-space`) selects a non-default data space, which is offline-tested only.
{% endcapture %}
{% capture create_metadata %}
### Metadata API create of the relationship

Send `createMetadata` to the same SOAP endpoint and headers as the Read tab. The metadata name is yours.

```xml
<met:createMetadata>
  <met:metadata xsi:type="met:FieldSrcTrgtRelationship" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>OrderCustomer</met:fullName>
    <met:definitionCreationType>Custom</met:definitionCreationType>
    <met:masterLabel>Order Customer</met:masterLabel>
    <met:owner>DataCloud</met:owner>
    <met:relationshipCardinality>ManyToOne</met:relationshipCardinality>
    <met:sourceFieldName>Order__dlm.CustomerId__c</met:sourceFieldName>
    <met:targetFieldName>Customer__dlm.Id__c</met:targetFieldName>
  </met:metadata>
</met:createMetadata>
```

The answer is `success` `true` with the full name. Without `lookupFieldName`, Salesforce adds a lookup field named after the relationship, here `Order__dlm.OrderCustomer__c`, referencing `Customer__dlm`; `readMetadata` returns it as `lookupFieldName`. The native list of both DMOs shows the relationship under the same name, `INACTIVE`. In the live run neither DMO was mapped.
{% endcapture %}
{% include operation-tabs.html id="relationship-create" label="Create" cli_state="available" cli_reason="Creates a ManyToOne relationship and lookup between two existing empty custom DMOs." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with createMetadata between two unmapped empty custom DMOs. Adds the lookup itself; the relationship reads INACTIVE." metadata_body=create_metadata connect_state="available" connect_reason="Creates a ManyToOne relationship between two mapped custom DMOs, tested at API 68.0." connect_body=create_connect plugin_state="available" plugin_reason="Creates the relationship from a project file, alone or in a batch, observed at API 68.0 on empty custom DMOs." plugin_body=create_plugin %}

## Update

{% capture update_cli %}
Change only the relationship label:

```xml
<masterLabel>Order Customer Updated</masterLabel>
```

```sh
sf project deploy start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --test-level NoTestRun --wait 5
```

Expect `Changed`, or `Unchanged` on an identical repeat. The deploy sends the whole `FieldSrcTrgtRelationship` file and changes the relationship in place: its id and name stay the same.

The same deploy also changes `relationshipCardinality` (for example `ManyToOne` to `OneToOne`) and `sourceFieldName`, alone or together with the label. This was tested at API 68.0 on an `INACTIVE` relationship and on an `ACTIVE` relationship created through the native route between two mapped DMOs. The `ACTIVE` relationship kept its id and stayed `ACTIVE`. Check the result in the native list of the source DMO.

**Known failures:**

- Salesforce refuses a changed target object and the owner `SObject` with `Failed` and "An unexpected error occurred" with an ErrorId. Nothing changes. Delete the relationship and create it again instead. A changed `targetFieldName` failed the same way in one run, but the same kind of change was accepted through `updateMetadata` in a later run (Evidence); send it again before you fall back to delete and create.
- `ManyToMany` fails before anything is sent: "'ManyToMany' is not a valid value for the enum 'RelationshipCardinality'".
- On the `ACTIVE` relationship, two valid deploys (one sent about a minute after the create) also failed with "An unexpected error occurred" and changed nothing. The same files deployed `Changed` when sent again. Read the list before you repeat a deploy.
{% endcapture %}

{% capture update_metadata %}
### Metadata API update of the relationship

Read the relationship first, change the elements, then send the whole record with `updateMetadata` to the same SOAP endpoint and headers as the Read tab. Keep `lookupFieldName` as read.

```xml
<met:updateMetadata>
  <met:metadata xsi:type="met:FieldSrcTrgtRelationship" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>OrderCustomer</met:fullName>
    <met:definitionCreationType>Custom</met:definitionCreationType>
    <met:lookupFieldName>Order__dlm.OrderCustomer__c</met:lookupFieldName>
    <met:masterLabel>Order Customer Updated</met:masterLabel>
    <met:owner>DataCloud</met:owner>
    <met:relationshipCardinality>OneToOne</met:relationshipCardinality>
    <met:sourceFieldName>Order__dlm.CustomerId__c</met:sourceFieldName>
    <met:targetFieldName>Customer__dlm.Id__c</met:targetFieldName>
  </met:metadata>
</met:updateMetadata>
```

The answer is `success` `true`. Three separate updates changed the label, the cardinality and the source field; each time the native list showed the same id and name with the new values, still `INACTIVE`.

The same calls work on an `ACTIVE` relationship that the plugin created between two mapped DMOs: the label, the cardinality and the source field changed in place, alone or all in one call, and the relationship stayed `ACTIVE` with the same id. A changed target object or owner (`SObject`) was refused with `success` `false` and `UNKNOWN_EXCEPTION`, and an unknown cardinality such as `ManyToMany` with a SOAP fault; none of these changed anything. A changed target field (`Id__c` to `Note__c` on the same target DMO) was refused the same way in one run and accepted with `success` `true` in a later one; `readMetadata` then showed the new target field. On a relationship created through the native route or the plugin, the metadata name is the generated relationship name, `masterLabel` starts out equal to that name, and `lookupFieldName` reads `<SourceDmo>.rel_<number>_end__c`.
{% endcapture %}

{% capture update_plugin %}
Edit the relationship file, for example a label and another cardinality:

```json
"spec": {
  "sourceObjectName": "Order__dlm",
  "sourceFieldName": "CustomerId__c",
  "targetObjectName": "Customer__dlm",
  "targetFieldName": "Id__c",
  "cardinality": "OneToOne",
  "relationshipOwner": "DataCloud",
  "label": "Order Customer Updated"
}
```

```sh
sf data360 deploy -m relationship:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS --preview
sf data360 deploy -m relationship:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS
```

The preview reports `update` and lists the differing keys in `changes`. Deploy finds the relationship by the file's name, otherwise by its binding. It reads the relationship's Metadata API record, puts in the file's label, cardinality, owner, source and target, and sends the whole record with one `updateMetadata` over the command's connection. It then reads the relationship back until it holds the file and reports `updated`; a repeat is `unchanged`. Salesforce decides which changes it accepts: a changed target field was accepted, while a changed target object or owner is refused. A refusal is reported as `RELATIONSHIP_UPDATE_REJECTED` with Salesforce's answer, and nothing is written. When Salesforce answers only "An unexpected error occurred" (`UNKNOWN_EXCEPTION`), which can be transient, the plugin reads the record again and, if the org still holds the record as before the update, sends the same update once more. A second refusal is `RELATIONSHIP_UPDATE_REJECTED`; a record that changed in between is `RELATIONSHIP_PERSISTENCE_UNCONFIRMED`, and nothing is resent. In a live test 16 valid updates (label, cardinality, source field and target field) were each accepted on the first call; the "unexpected error" did not occur, so the resend is in place but was not exercised live. The `label` key is optional; retrieve saves it, and a file without it leaves the label as it is.
{% endcapture %}
{% include operation-tabs.html id="relationship-update" label="Update" cli_state="available" cli_reason="Partial: changes label, cardinality and source field in place, tested at API 68.0 on INACTIVE and ACTIVE relationships. A changed target object or owner is refused." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="Partial: updateMetadata changes label, cardinality, source field and target field in place, tested at API 68.0 on INACTIVE and ACTIVE relationships. A changed target object or owner is refused." metadata_body=update_metadata connect_state="blocked" connect_reason="Re-tested at API 68.0: PATCH and PUT on the by-name route answer 405 (only DELETE allowed), PATCH on the collection answers 405 (GET, HEAD, POST), and the DMO-scoped item route answers 404. Use the Metadata API, or delete and create again." plugin_state="available" plugin_reason="Partial: updates label, cardinality, source field and target field through the Metadata API, observed at API 68.0 on an ACTIVE relationship between mapped custom DMOs. Salesforce refuses a changed target object or owner; delete and deploy again for those." plugin_body=update_plugin %}

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

{% capture delete_connect %}
Deletes one relationship by its exact name, taken from the list of the source DMO. Check the name first; the by-name route cannot be read.

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/relationships/Order_CustomerId_map_Customer_Id_1794467679481 --target-org TARGET_ALIAS --method DELETE
```

Salesforce answers HTTP `204` with no body. List the relationships of the source DMO afterwards: the relationship is gone, and the list answers `204` when it was the only one. The DELETE reply alone is not proof.
{% endcapture %}

{% capture delete_plugin %}
Deletes one relationship, named with its source DMO and its generated name: `relationship:<SourceDmo__dlm>:<Name>`. A bare `relationship:<Name>` is refused with `INVALID_SELECTION`. The command has no confirmation flag. Preview first.

```sh
sf data360 delete -m relationship:Order__dlm:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS --preview
sf data360 delete -m relationship:Order__dlm:Order_CustomerId_map_Customer_Id_1794467679481 -o TARGET_ALIAS
```

The command reads no local file. It lists the source DMO's relationships and looks for the name, ignoring letter case. No match reports `unchanged`, and so does a source DMO that does not exist, so a rerun after the DMO was deleted finishes. Two matches are refused with `AMBIGUOUS_RELATIONSHIP_TARGET`; a match whose source object is another DMO is refused with `RELATIONSHIP_TARGET_BINDING_MISMATCH`, which names the right selector. To find the generated name, run `sf data360 retrieve -m relationship:Order__dlm`.

Otherwise it sends one DELETE and reads the source DMO's list until the relationship is gone (`RELATIONSHIP_DELETION_UNCONFIRMED` otherwise). `--preview` only reads and lists the local file it would remove. After a confirmed deletion the local file `data360/relationship/<Name>.relationship-meta.json` in the current directory is removed; `--keep-local-files` keeps it. Running the delete again reports `unchanged`. Salesforce's reference allows deleting custom relationships only; the plugin sends the request and reports Salesforce's answer. In a delete batch, relationships run first, before mappings, DMOs and DLOs.
{% endcapture %}
{% capture delete_metadata %}
### Metadata API delete of the relationship

**This also removes the relationship's lookup field.** Send `deleteMetadata` to the same SOAP endpoint and headers as the Read tab.

```xml
<met:deleteMetadata>
  <met:type>FieldSrcTrgtRelationship</met:type>
  <met:fullNames>OrderCustomer</met:fullNames>
</met:deleteMetadata>
```

The answer is `success` `true`. Afterwards `readMetadata` returns an empty record, `listMetadata` no longer shows the name, the lookup field is gone from the source DMO and the native list of both DMOs answers `204`. Both DMOs remain.
{% endcapture %}
{% include operation-tabs.html id="relationship-delete" label="Delete" cli_state="available" cli_reason="Deletes an owned relationship and its sole-use lookup. Both DMOs and key fields remain." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with deleteMetadata. Removes the relationship and its lookup; both DMOs remain." metadata_body=delete_metadata connect_state="available" connect_reason="Deletes a relationship by name, tested at API 68.0." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes a relationship named with its source DMO and confirms its absence, observed at API 68.0." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Native route, API 68.0 (raw requests, empty synthetic custom DMOs, default data space):**

- A POST of a `ManyToOne` relationship with owner `DataCloud` between two unmapped DMOs is refused with HTTP `400` `INVALID_INPUT`, and no relationship is listed afterwards.
- The same POST between two mapped DMOs returns HTTP `201` with a generated name, and the relationship is listed `ACTIVE` from both DMOs about 5 seconds later.
- `DELETE .../ssot/data-model-objects/relationships/{name}` returns HTTP `204`, and the source DMO lists no relationship afterwards.
- `GET` on the by-name route returns HTTP `405` (only DELETE is allowed), proven on a standard relationship of `ssot__Brand__dlm`.

**Plugin, API 68.0 (default), empty custom DMOs in one org:** one command deployed two DLOs, two DMOs, two mappings and a relationship between the DMOs, and the relationship was created `ACTIVE` after the mappings. `retrieve -m relationship:<SourceDmo__dlm>` wrote one file named after the generated relationship, and that file redeployed `unchanged` with no write. In a second run the retrieved file, with its label and cardinality (`ManyToOne` to `OneToOne`) changed, deployed `updated`; a new retrieve wrote a byte-identical file and a repeat deploy was `unchanged`. A delete removed the relationship, the source DMO's list showed no relationship afterwards, and a repeated delete was `unchanged`.

**Generated key qualifier, API 68.0 (plugin, empty custom DLOs and DMOs in one org):** after a relationship from the non-key field `RefId__c` of one DMO to the primary key of another was created from hand-written files, Salesforce held `KQ_RefId__c` on the source DLO and the source DMO (`creationType` `System`, `usageTag` `KeyQualifier`, named by the `keyQualifierName` of `RefId__c`) and the pair `KQ_RefId__c` onto `KQ_RefId__c` in the mapping. A repeat deploy of the same hand-written files reported all seven items `unchanged`; a retrieve left `KQ_RefId__c` and its pair out, and the retrieved files redeployed `unchanged`. A relationship from a non-key field of a standard DMO was not tested.

**Metadata API calls, API 68.0 (two new unmapped empty custom DMOs, default data space):** `listMetadata` listed 3,829 relationships of the org without naming them; `readMetadata` returned a standard relationship by name and an empty record for an unknown name. `createMetadata` without `lookupFieldName` succeeded and added the lookup `<SourceDmo>.<fullName>__c`; both DMOs listed the relationship `INACTIVE` under its metadata name. `updateMetadata` then changed the label, the cardinality (`ManyToOne` to `OneToOne`) and the source field, one at a time; each change read back through `readMetadata` and the native list with the same id. A `sf project deploy start` of the retrieved file with label, cardinality and source field changed reported `Changed` and read back the same way. On the same relationship, PATCH and PUT on `.../ssot/data-model-objects/relationships/{name}` answered `405` (allowed: DELETE), PATCH on `.../{dmo}/relationships` answered `405` (allowed: GET, HEAD, POST), PATCH on `.../{dmo}/relationships/{name}` answered `404`, and nothing changed. `deleteMetadata` removed the relationship and its lookup; both native lists answered `204`, and both test DMOs were deleted afterwards.

**Metadata API, API 65:** the create, update and delete examples cover custom, DataCloud-owned `ManyToOne` relationships between existing empty custom DMOs in the default data space. Both tested DMO relationship endpoints returned the created relationship with status `INACTIVE`, `creationType` `Custom`, owner `DataCloud` and `ManyToOne`. After the exact relationship deletion both endpoints returned HTTP `204` while both DMOs still existed and the owned lookup was absent from the source Metadata. An independent exact-name standard Metadata API 65 retrieve of a standard relationship in one source org returned a definition export; that read does not prove prerequisite compatibility, cross-org portability or safe deployment.

**Data Cloud UI:** the Edit Relationships dialog of a DMO has no label field, and for an existing relationship its field, cardinality and related field are locked; only the Active switch and the delete button can be used. The dialog loads its data through internal Aura actions, not a public API.

**Plugin behaviour (offline-tested):** default and `auto` select API `68.0`; numeric pins from `61.0` are kept as given, and admitting a version is not a live test of it. Deploy never deletes relationships. The portable file holds the six authored values and an optional label; the generated name is not part of the binding.

| Diagnostic | Meaning |
|---|---|
| `RELATIONSHIP_INVENTORY_INCOMPLETE` | The list pages did not add up to `totalSize` or repeated a name. Rerun. |
| `RELATIONSHIP_UPDATE_REJECTED` | Salesforce refused the Metadata API update, for example a changed target object or owner; nothing was written. After "An unexpected error occurred" the update was sent once more first. |
| `AMBIGUOUS_RELATIONSHIP_TARGET` | More than one relationship links the same four fields. Delete the extra one by name. |
| `RELATIONSHIP_HTTP_ERROR` | Salesforce rejected a request, for example because the DMOs are not mapped. |
| `RELATIONSHIP_PERSISTENCE_UNCONFIRMED` | A create or update was sent but did not read back with the file's values in time, or the record changed after an "unexpected error" refusal. Nothing is resent. |
| `RELATIONSHIP_REQUEST_UNCONFIRMED` | A request ended without a clear HTTP result. List the DMO before trying again. |
| `RELATIONSHIP_FILE_IDENTITY_MISMATCH` | `identity.apiName` of the file differs from the selected name. |
| `RELATIONSHIP_TARGET_BINDING_MISMATCH` | The named relationship links other objects or fields than the file, or on delete has another source DMO than the selector. |
| `RELATIONSHIP_NAME_MISMATCH` | No relationship has that name, but another carries the file's binding. |
| `RELATIONSHIP_DELETION_UNCONFIRMED` | The delete was sent but the relationship is still listed. |
| `RELATIONSHIP_DEPENDENCIES_PLANNED` | The batch creates a DMO the relationship uses; the preview cannot compare it yet. |
| `RELATIONSHIP_DATASPACE_COLLISION` / `UNSUPPORTED_RELATIONSHIP_DATASPACE` | The file's data space differs from the command's. |

**CLI deploys to an `ACTIVE` relationship, API 68.0 (sf 2.151.7, two mapped empty custom DMOs created through the Connect API, relationship created through the native route, default data space):** `sf project retrieve start` saved the relationship under its generated name, with `lookupFieldName` `<SourceDmo>.rel_<number>_end__c` and an empty `targetEntity`. Deploys of that file changed the label alone, the cardinality alone (`ManyToOne` to `OneToOne`), the source field alone (in both directions), and the label, cardinality and source field together. Each time the native list showed the same id, the new values and `ACTIVE`, and `readMetadata` returned the same values. Two earlier deploys of valid changes failed with "An unexpected error occurred" and changed nothing; the same changes were accepted when sent again. A changed target object and owner `SObject` each failed with "An unexpected error occurred". A changed target field failed the same way in this run but was accepted in a later plugin run (below), so that failure was probably the same transient error. `ManyToMany` failed with "'ManyToMany' is not a valid value for the enum 'RelationshipCardinality'". The list was unchanged after each failure. The target DMO could not be deleted while the relationship existed (see [Data Model Object](/next/data-cloud-cli/data-model-object/)). The relationship, both DMOs and their DLOs were deleted afterwards.

**Plugin target field and owner changes, API 68.0 (2026-11-16, one org, an `ACTIVE` `ManyToOne` relationship between two mapped empty custom DMOs, update calls counted):** a retrieved file with the target field changed from `Id__c` to `Note__c` deployed `updated` with one `updateMetadata` call answered `success` `true`; `readMetadata` then showed `Note__c`, owner `DataCloud`. The same file with owner `SObject` got `UNKNOWN_EXCEPTION` "An unexpected error occurred"; the plugin read the record, found it unchanged and sent the update once more, which got the same answer, and ended `RELATIONSHIP_UPDATE_REJECTED` after exactly two calls. The relationship, DMOs and DLOs were deleted afterwards and confirmed gone.

**Plugin valid updates, API 68.0 (one org, an `ACTIVE` relationship between two mapped empty custom DMOs, update calls counted):** 16 valid updates through retrieved files: 10 label and cardinality changes (`ManyToOne` and `OneToOne` alternating) and 6 source or target field changes (`RefId__c` or `Note__c` onto `Id__c` or `Note__c`). Each sent exactly one `updateMetadata`, was answered `success` `true` and reported `updated`, in 6 to 9 seconds. "An unexpected error occurred" never came back, so the resend never fired. A final retrieve showed the last label, cardinality and fields, and a repeat deploy was `unchanged`. Everything was deleted afterwards and confirmed gone.

**Not verified:** a changed owner or target object accepted by any route (the Metadata API, the CLI and the plugin refused both); a changed target field through `sf project deploy start` since it was accepted; a transient "unexpected error" followed by a successful resend; `OneToOne` relationships beyond the in-place changes above; standard relationships (other than the 405 read); relationships of populated DMOs; managed relationships and shared lookup fields; non-default data spaces; other API versions through the plugin. No explicit activation command is included, which is not a guarantee of no internal processing.

</details>
