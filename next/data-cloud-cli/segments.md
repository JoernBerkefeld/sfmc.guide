---
layout: page
title: "Segments"
description: "Salesforce CLI workflows and verified operation limits for Operational segments."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/segments/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  retrieve: { status: "yes", methods: [cli, api] }
  create: { status: "partial", methods: [cli, api] }
  update: { status: "partial", methods: [cli, api] }
  delete: { status: "partial", methods: [api] }
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

A **segment** selects an audience using rules. Publishing prepares it for use; refreshing recalculates it, while activation sends data to a destination. These are distinct from saving the definition. A **unified DMO** contains the combined profiles produced by identity resolution; use an existing one with its actual key.

The examples distinguish `UI` criteria built in Salesforce's visual interface from `DBT`/`Dbt`, a SQL-based pipeline representation. You do not need to install a separate dbt command-line tool for the requests here. **CRUD** simply abbreviates create, read, update and delete.

`MarketSegmentDefinition` is the Metadata API XML definition of the **same segment**, not a separate segment type. Both metadata commands and runtime API requests below use Salesforce CLI. Saving XML alone need not create a usable live segment. The XML writes cover **source-only API 65 DBT Metadata definition CRUD**; cross-org replay and deployment without processing have not been verified. Being able to retrieve UI criteria does not establish UI-definition writes.

This API 65 runtime route creates a live segment. Unlike saving XML alone, it can begin processing immediately: **`NoRefresh` can transition `PROCESSING` → `ACTIVE`**. Empty-result SQL does not prevent scanning or processing either. Get permission for those effects before creating or updating a segment.

The example does not set up a send destination, export members or prove cross-org migration.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
### Save the XML definition

For an existing segment:

```sh
sf project retrieve start --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes `force-app/main/default/marketSegmentDefinitions/ActiveCustomers.marketSegmentDefinition-meta.xml`. A **UI retrieval example**, separate from the DBT creation example, looks like this:

```xml
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Active Customers</masterLabel>
  <segmentOn>UnifiedCustomer__dlm</segmentOn>
  <segmentType>UI</segmentType>
  <!-- Retrieved selection criteria omitted. -->
</MarketSegmentDefinition>
```

The XML omits lookback, schedule, state and dataspace. It does not publish, count or activate the segment. Referenced objects, fields and relationships remain dependencies; `NO_REFRESH` is not proof that a later deployment will do no initial processing.

{% endcapture %}
{% capture retrieve_api %}
### Read runtime state through the CLI

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
```

The **lookback** is the time window used by the segment; `P90D` is duration notation for 90 days. Check the returned value rather than assuming every segment uses it.

GET wraps the segment in a `segments` array:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

Check the exact segment, SQL/model, type, dataspace, segment-on object, lookback and schedule. Wait for processing to settle before the next change. REST does not write the XML file for you. For audience rows rather than configuration, see [Segment members](/next/data-cloud-cli/segment-members/#retrieve).

{% endcapture %}
{% include operation-tabs.html id="segments-retrieve" label="Retrieve" cli_state="available" cli_reason="Save the XML definition; runtime settings and audience rows are not included." cli_body=retrieve_cli api_state="available" api_reason="Read runtime configuration, not an XML file or audience export." api_body=retrieve_api %}

## Create

{% capture create_api %}
### Create a live segment

Save `segment-create.json`, replacing the existing unified DMO/key and model name consistently:

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

```json
{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "includeDbt": { "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }] } }
```

There is an easy-to-miss difference: the **request** uses nested `includeDbt.models.models`, but the **response** has an array at `includeDbt.models`. Do not send the response back unchanged. `P90D` is an example returned lookback, not a universal writable default.

{% endcapture %}
{% capture create_cli %}
### Store only an XML definition

Use a separate project containing only this owned definition, with a compatible existing unified DMO/key. Save `force-app/main/default/marketSegmentDefinitions/CustomerDefinition.marketSegmentDefinition-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</includeCriteria>
  <masterLabel>Customer Definition</masterLabel>
  <segmentType>DBT</segmentType>
</MarketSegmentDefinition>
```

**Escaping** preserves text that would otherwise be interpreted as file syntax: `&lt;` means `<`, `&gt;` means `>` and `&amp;` means `&` in XML text. Decoding reverses that representation; it does not execute the contents. Keep the escaping when saving nested XML, and do not replace it with raw tags.

`includeCriteria` contains XML-escaped pipeline XML. This DBT form has no `segmentOn` element. Replace the model and DMO/key consistently, and obtain permission for possible processing even with the empty-result SQL.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": true, "changed": true, "success": true }] } } }
```

The second command downloads the definition for comparison. Check the decoded model/SQL, label and type. A successful deploy can still leave runtime GET returning `ITEM_NOT_FOUND`; `--dry-run` would not store anything at all. The project-wide selector above is why this project must contain no unrelated files.

{% endcapture %}
{% include operation-tabs.html id="segments-create" label="Create" cli_state="available" cli_reason="Source-only API 65 DBT definition creation; runtime creation and processing-free deployment are not established." cli_body=create_cli api_state="available" api_reason="Live API 65 DBT creation can begin processing even with NoRefresh." api_body=create_api %}

## Update

{% capture update_api %}
### Change the live segment

A label-only PATCH is not enough here. Send the **complete preserved definition**, changing just the label and description. The example deliberately omits both `publishSchedule` and `publishScheduleInfo` to retain the existing no-refresh schedule. Do not re-send `NoRefresh` or invent a `None` schedule value.

Save `segment-update.json`:

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

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

GET again until `ACTIVE`, then compare the changed label/description and all preserved values. In one owned DBT update, separate reads observed **`PROCESSING` → `COUNTING` → `ACTIVE`** without intervention. `COUNTING` was not final success or proof of failure. The later `ACTIVE` read was about nine minutes after the observed `COUNTING` read; the exact transition time between those checks is unknown.

Independent runtime and standard XML retrieval then confirmed the exact updated label/description, original model/SQL/type, identities, dataspace, segment-on object, schedule/lookback and generated membership references. Description is runtime-only; the XML label agreed with runtime. The first command had already stopped with an unknown outcome: later API settlement does not retroactively make that command successful. Do not replay an update with an unknown outcome; reconcile it with reads. This narrow result does not establish arbitrary omitted-field preservation, SQL/UI criteria updates or schedule/lookback editing.

{% endcapture %}
{% capture update_cli %}
### Change only the XML definition's label

In the owned DBT file, change only `masterLabel` to `Customer Definition Updated`. Keep the criteria, model, SQL and type intact:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Expect `changed: true` for the label change. An identical repeat can report `Unchanged`. **Unchanged is not zero writes**: a deployment job still runs and package metadata can change. Broader SQL/criteria edits and live segment updates are not established by this route.

{% endcapture %}
{% include operation-tabs.html id="segments-update" label="Update" cli_state="available" cli_reason="Only the owned DBT XML masterLabel change is qualified; Unchanged is not zero writes." cli_body=update_cli api_state="available" api_reason="Bounded full-definition label/description update only; reconcile unknown outcomes with reads." api_body=update_api %}

## Delete

Do not delete shared unified DMOs or membership tables as extra cleanup. Previously downloaded source files remain local.

{% capture delete_api %}
### Delete the live segment and check its definition

For the owned segment, save `segment-delete.json`:

```json
{ "url": "/services/data/v65.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0 --json
```

DELETE can return HTTP `204` without a body. Confirm that GET returns HTTP `404` / `ITEM_NOT_FOUND` and the exact metadata member is absent:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "<segment not found>" }]
```

{% endcapture %}
{% capture delete_cli %}
### Delete an owned definition-only component

Use the integration-supplied empty `manifest/package.xml` and this exact `manifest/destructiveChangesPost.xml`:

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

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org SOURCE_ALIAS --api-version 65.0 --json
```

The completed response reports `deleted: true`. Require independent inventory absence of `CustomerDefinition` as well. This deletes the definition only; it does not promise runtime or generated-data cleanup. The downloaded XML remains on your computer.

{% endcapture %}
{% include operation-tabs.html id="segments-delete" label="Delete" cli_state="available" cli_reason="Owned definition-only deletion; runtime and generated-data cleanup are not promised." cli_body=delete_cli api_state="available" api_reason="Delete the owned live segment and independently confirm runtime and metadata absence." api_body=delete_api %}
