---
layout: page
title: "Calculated insights"
description: "Salesforce CLI workflows and verified operation limits for calculated insight definitions and runtime state."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/calculated-insights/
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

*Last updated: October 29, 2026, 19:43 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

A calculated insight computes values from your data, for example a customer count grouped by application. The expression uses **SQL**, a language for querying tables: `SELECT` chooses fields/calculations, `FROM` names the source, `WHERE` filters rows and `GROUP BY` groups results. Grouping fields are **dimensions**; calculated values are **measures**. You need compatible existing objects and fields, and someone who can check the query if you are not familiar with SQL.

`MktCalcInsightObjectDef` is the Metadata API XML definition of the **same calculated insight**, not another type of insight. Saving that definition alone need not create a live component. Use the runtime creation workflow below when you need a live insight; use standard metadata commands to save or compare its XML. Both workflows use Salesforce CLI, including API requests sent through the CLI.

**Important:** deploying a definition can reserve the API name without creating a runtime insight. Runtime creation then finds the name taken, while PATCH cannot attach the missing runtime. Do not deploy an XML shell first if your goal is a live insight, and do not delete someone else's definition to free a name.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_cli %}
### Save the XML definition

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`, including the SQL, label and creation type. Use the **metadata name**, not the runtime name ending in `__cio`.

The file does not include enabled state, schedule, definition type, dimensions/measures or dataspace. Keep the referenced DMO fields in mind when comparing environments.

{% endcapture %}
{% capture retrieve_api %}
### Read runtime state through the CLI

Read the live state, then download its XML separately if you want it in your project:

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method GET --target-org TARGET_ALIAS --json
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "dataSpace": "default", "publishScheduleInterval": "NOT_SCHEDULED", "lastRunStatus": null }
```

The REST request prints the live configuration. The retrieve writes the XML file above. Compare the expression and label, but remember the XML is not the complete runtime state.

{% endcapture %}
{% include operation-tabs.html id="ci-retrieve" label="Retrieve" cli_state="available" cli_reason="Save the XML definition, not the complete runtime state." cli_body=retrieve_cli api_state="available" api_reason="Read runtime configuration and retrieve its XML separately." api_body=retrieve_api %}

## Create

{% capture create_api %}
### Create a live calculated insight

Creation uses the **API 67 MCP facade**; subsequent reads, updates and deletion use **API 65 REST**. This is not a dedicated CLI insight command or a verified direct public API 65 POST create endpoint.

Use compatible existing DMO fields and an unused name ending in `__cio`. Check both runtime and metadata names first. The route creates its own metadata definition, so do not deploy one beforehand. You need permission for processing/publication; cross-org migration and processing-free creation are not established.

Save `ci-create.json` outside metadata source. `paramsJson` is a **JSON string**, not an object. Its contents are wrapped in `input`:

```json
{
  "toolName": "d360_ci_create",
  "paramsJson": "{\"input\":{\"apiName\":\"CustomerActivity__cio\",\"displayName\":\"Customer Activity\",\"expression\":\"SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm GROUP BY CustomerEvent__dlm.ApplicationId__c\",\"definitionType\":\"CalculatedMetric\",\"dataSpaceName\":\"default\",\"draft\":true}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@ci-create.json' --target-org TARGET_ALIAS --json
```

A decoded result can contain:

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "isEnabled": true, "publishScheduleInterval": "NOT_SCHEDULED", "dimensions": [], "measures": [] }
```

Use the **returned `apiName`** from now on. `DRAFT` does not prove successful computation, and `NOT_SCHEDULED` does not mean disabled or guarantee no processing. Check for embedded errors before treating the request as successful.

{% endcapture %}
{% capture create_cli %}
### Store only an XML definition

Definition-only creation requires compatible existing DMO fields and permission for possible processing. Save `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MktCalcInsightObjectDef xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY app_id__c</expression>
  <masterLabel>Customer Activity</masterLabel>
</MktCalcInsightObjectDef>
```

Replace the DMO and fields consistently. `WHERE 1 = 0` gives an empty result; it does **not** prevent scanning or processing.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": true, "success": true }] } } }
```

That success means the definition was stored. Runtime GET can still return `ITEM_NOT_FOUND`. This route is not suitable when you need a guarantee of no processing.

{% endcapture %}
{% include operation-tabs.html id="ci-create" label="Create" cli_state="available" cli_reason="Definition-only; can reserve a name and does not guarantee no processing." cli_body=create_cli api_state="available" api_reason="Bounded API 67 MCP facade workflow; not a public API 65 POST recipe." api_body=create_api %}

## Update

{% capture update_api %}
### Change runtime settings or the qualified expression

**Publish the draft:** save `ci-publish.json`:

```json
{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "SystemManaged" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-publish.json' --target-org TARGET_ALIAS --json
```

```json
{ "apiName": "CustomerActivity__cio", "status": "PROCESSING", "publishScheduleInterval": "SYSTEM_MANAGED" }
```

Read the insight again until it reaches `ACTIVE`, checking the expression and expected dimensions/measures. Stop on errors or an unresolved transition rather than repeating the PATCH. `ACTIVE` means an operational definition, **not a completed calculation or materialized output**.

**Change its label and schedule:** save `ci-update.json`. Leave `definitionType` out of updates:

```json
{ "displayName": "Customer Activity Updated", "publishScheduleInterval": "NotScheduled" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-update.json' --target-org TARGET_ALIAS --json
```

The result can return `PROCESSING` again, with the new label and `NOT_SCHEDULED`. Read it back to confirm the change and preserved SQL/dimensions/measures. `NotScheduled` does not disable the insight.

We tried replacing `APPROX_COUNT_DISTINCT` with `COUNT` while keeping the same measure alias. Salesforce rejected that change because it changed how the existing measure can be aggregated. Separate reads confirmed that the original SQL and field definitions were unchanged. This does not mean that every SQL edit will fail.

A later **expression-only API 65 PATCH** succeeded: we retained `WHERE 1 = 0` and added a fully qualified `DeviceId IS NOT NULL` predicate, keeping `APPROX_COUNT_DISTINCT`, output aliases and the grouped application dimension unchanged. Use the exact actual field name, such as `ssot__DeviceApplicationEngagement__dlm.ssot__DeviceId__c`, not the shortened name in this explanation. Send only `expression` in the PATCH body through the same vanilla `sf api request rest` update route above.

After `PROCESSING`, independent runtime reads reached `ACTIVE`, and a separate Metadata read contained the exact edited SQL. The aggregate formula, dimension/measure names, types, roles and aggregability, label and schedule/settings were retained. The returned fields' derived `dataSource` attribution changed despite stable formulas; do not treat that attribution as an unchanged dependency identifier. This proves the bounded predicate edit, not arbitrary SQL or schema editing, general omitted-field preservation, an identical-repeat guarantee or completed computation. The empty-result filter also cannot demonstrate a change in output rows.

**Separate target-bound check — October 29, 2026:** an existing `ACTIVE` insight
with `NOT_SCHEDULED` received one API 65 PATCH containing only `expression`.
The original `WHERE 1 = 0` filter was retained and the fully qualified
`DeviceId IS NOT NULL` predicate added without changing the aggregation or
output schema. HTTP 200 was followed by independent runtime, Metadata XML and
referenced-DMO checks: the exact edited SQL was present, non-expression settings
and dependency bindings were preserved, and the insight remained `ACTIVE` with
`NOT_SCHEDULED`. This is distinct from the earlier `SYSTEM_MANAGED` evidence;
no schedule change was sent or qualified by this check.

Before sending an expression PATCH, independently read and compare the current
expression and preserved settings with the desired definition. If they already
match, skip the unnecessary PATCH yourself. This is comparison-before-write
guidance, not an automatic no-op or identical-repeat guarantee from the API.
The target-bound result does not establish unchanged-source cross-org deployment,
arbitrary SQL edits, scheduled-processing behavior or a successful calculation:
`lastRunStatus` remained null, so `ACTIVE` alone is not computation evidence.

{% endcapture %}
{% capture update_cli %}
### Change only the XML definition's label

The verified change is the definition's **`masterLabel` change**. Keep the expression and creation type, edit the label, and deploy the same file:

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": false, "changed": true, "success": true }] } } }
```

Retrieve again to confirm the label and unchanged SQL. Expression updates, identical-repeat semantics and runtime updates are not qualified by this Metadata route.

{% endcapture %}
{% include operation-tabs.html id="ci-update" label="Update" cli_state="available" cli_reason="Only the metadata masterLabel change is verified." cli_body=update_cli api_state="available" api_reason="Runtime settings and the bounded predicate edit only; retain all qualifications." api_body=update_api %}

## Delete

**Shared safety:** Confirm ownership and dependencies before either deletion workflow. Definition deletion is not runtime or generated-data cleanup.

{% capture delete_api %}
### Delete the live insight and check its definition

After checking ownership and dependencies, save `ci-delete.json`. If a DELETE without `--body` fails with `No 'mode' found in 'body' entry`, use a whole-request file with an explicit empty raw body, as below. This workaround was verified with Salesforce CLI 2.151.7.

```json
{ "url": "/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file ci-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/calculated-insights' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0 --json
```

An empty response can mean deletion has started, not finished. The collection may still show:

```json
{ "items": [{ "apiName": "CustomerActivity__cio", "status": "DELETING" }] }
```

**Terminal checks:** read the full collection, including continuation pages, until this insight is absent. Also check that its metadata member is gone. Do not send another DELETE while removal is underway. Generated-data cleanup is not guaranteed, and any downloaded XML still needs local reconciliation.

{% endcapture %}
{% capture delete_cli %}
### Delete an owned definition-only component

For an owned definition whose dependencies have been checked, the integration supplies the empty `manifest/package.xml` and this `manifest/destructiveChangesPost.xml`:

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

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0 --json
```

The successful component response reports `deleted: true`. Confirm the exact definition is absent from the inventory. This is definition deletion, not a promise to clean up a runtime insight or its generated data.
{% endcapture %}
{% include operation-tabs.html id="ci-delete" label="Delete" cli_state="available" cli_reason="Owned definition-only component deletion; not runtime cleanup." cli_body=delete_cli api_state="available" api_reason="Runtime deletion requires terminal collection and metadata checks." api_body=delete_api %}
