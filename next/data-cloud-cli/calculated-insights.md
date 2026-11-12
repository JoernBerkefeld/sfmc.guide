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
  read: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "partial" } }
  create: { status: "partial", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "partial" } }
  update: { status: "partial", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

A calculated insight computes values from your data, for example a customer count grouped by application. You define it with an SQL query. `GROUP BY` fields are dimensions, and calculated values are measures.

**Example used in every chapter:** `CustomerActivity__cio`, which counts customers per application from the `CustomerEvent__dlm` object.

**Warning:** Saving a definition can reserve the insight's name without creating a live insight. Do not deploy an XML file first if you need a live insight.

{% include crud-summary.html %}

**Plugin qualification:** The plugin workflows work only in the tested scope listed under Evidence.

## Read

{% capture read_cli %}
Saves the insight's XML definition to your project. It does not save the full runtime state.

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

This writes `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`. The file holds the SQL, label and creation type. It does not hold the enabled state, the schedule or the data space.

Use the metadata name, `CustomerActivity`, not the runtime name that ends in `__cio`.

A sample of the retrieved file is not in this guide yet.
{% endcapture %}

{% capture read_connect %}
<a id="read-runtime-state-through-the-cli"></a>

### Native API68 read

Reads the live configuration of the insight by its full name. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --target-org TARGET_ALIAS
```

Server body excerpt (not a CLI envelope):

```json
{ "apiName": "CustomerActivity__cio", "calculatedInsightStatus": "ACTIVE", "dataSpace": "default", "creationType": "Custom", "definitionType": "CALCULATED_METRIC", "displayName": "Customer Activity", "isFromPackage": false, "queryDialect": "ANSI_SQL", "publishScheduleInterval": "NOT_SCHEDULED", "lastRunStatus": null }
```

The lifecycle state is in `calculatedInsightStatus`: `DRAFT`, `PROCESSING`, `ACTIVE`, or `DELETING` while a delete runs. The response also holds `expression`, `dimensions`, `measures` and the run fields. A draft has empty `dimensions` and `measures`. `lastRunStatus: null` means the insight has never run.

A missing insight answers HTTP 404:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "Calculated Insight record not found." }]
```

The same route without a name lists the insights of the org under `collection.items`.

To download the XML too, run the retrieve command from the CLI tab. The XML does not include the full runtime state, so compare the expression and label only.
{% endcapture %}

{% capture read_plugin %}
Plugin runtime requests use68; standard XML, Metadata and dependency bindings use65.

Default/auto uses API 68 as well; `--api-version 65.0` is refused with `INVALID_SCOPE`.

Installed retrieval produced byte-identical XML/JSON.

These are API-led plugin operations, not out-of-the-box Salesforce CLI commands. The plugin command uses an explicit `--api-version 68.0` and default data space.

<a id="optional-sf-plugin-data-native-lifecycle"></a>

Saves a settled `ACTIVE` insight as a paired XML and JSON file. Use an explicit API version of 68.0.

```sh
sf data360 retrieve -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --api-version 68.0 -d ./project
```

The command writes these files under the source package:

- `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`
- `force-app/main/default/data360/calculatedInsights/CustomerActivity__cio.calculatedInsight.json`

A sample of the JSON file is not in this guide yet.
{% endcapture %}

{% include operation-tabs.html id="ci-read" label="Read" cli_state="available" cli_reason="Saves the XML definition, not the complete runtime state." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 read of the runtime configuration. The XML is saved separately." connect_body=read_connect plugin_state="available" plugin_reason="Saves an ACTIVE insight as a paired XML and JSON file, using API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_cli %}
Saves the definition as an XML file, then deploys it. The deploy stores the definition only. It does not guarantee that no processing happens.

Write this file at `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MktCalcInsightObjectDef xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY app_id__c</expression>
  <masterLabel>Customer Activity</masterLabel>
</MktCalcInsightObjectDef>
```

Use DMO fields that already exist. `WHERE 1 = 0` returns no rows. It does not stop processing.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5
```

The result reports the component as created:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": true, "success": true }] } } }
```

**Known failures:**

- A successful deploy does not create a live insight. A runtime lookup can still show that the insight is not found.
{% endcapture %}

{% capture create_connect %}
### Native API68 create

Creates a live insight as a draft with one POST. It does not publish the insight. Check first that the name is absent: the item read answers `ITEM_NOT_FOUND`, and the retrieve command from the CLI tab finds no definition.

Save `ci-create.json` outside your metadata folder:

```json
{
  "apiName": "CustomerActivity__cio",
  "displayName": "Customer Activity",
  "expression": "SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY CustomerEvent__dlm.ApplicationId__c",
  "definitionType": "CalculatedMetric",
  "dataSpaceName": "default",
  "draft": true
}
```

```sh
sf api request rest '/services/data/v68.0/ssot/calculated-insights' --method POST --body '@ci-create.json' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --target-org TARGET_ALIAS
```

The POST response is not proof of the result. Read the insight until `calculatedInsightStatus` is `DRAFT`, with empty `dimensions` and `measures`, `NOT_SCHEDULED` and your expression and label. The plugin reads up to 12 times, one second apart, within 120 seconds, and also compares the Metadata definition. `DRAFT` does not show that the insight has computed.

The body above is exactly what the plugin sends. It sends only one qualified expression shape: an approximate distinct count grouped by one field, with a `WHERE 1 = 0` filter. Other SQL is not tested on this route.

Do not send the POST again if the outcome is unclear. Read the insight first.
{% endcapture %}

{% capture create_plugin %}
Installed cross-org API68 publish passed.

Installed cross-org API68 create passed. This does not qualify arbitrary SQL or released packages.

Creates a draft insight from a checked XML and JSON pair in `./ci-pair`. It does not publish the insight. Run the preview first.

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --draft --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --draft --allow-processing
```

Create requires exact runtime and Metadata absence, not an XML-only shell. Preview is read-only. The second command changes the org and needs `--allow-processing`.

The sample output is not in this guide yet.
{% endcapture %}

{% include operation-tabs.html id="ci-create" label="Create" cli_state="available" cli_reason="Definition only. It can reserve a name and does not guarantee that no processing happens." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 POST creates a draft insight; it does not publish it." connect_body=create_connect plugin_state="available" plugin_reason="Creates a draft insight from a correlated XML and JSON pair, using API 68.0." plugin_body=create_plugin %}

## Update

{% capture update_cli %}
Changes the label in the XML definition, then deploys the same file.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5
```

The result reports the component as changed:

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": false, "changed": true, "success": true }] } } }
```

Retrieve the file again to confirm the new label and the unchanged SQL.
{% endcapture %}

{% capture update_connect %}
### Native API68 update

Publishes a draft, or changes the expression of a draft or `ACTIVE` insight. Each change is one PATCH on the item route. Send one kind of change per request, then read the insight again.

To publish the draft, save `ci-publish-native.json`:

```json
{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "NotScheduled" }
```

```sh
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-publish-native.json' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --target-org TARGET_ALIAS
```

Read the insight until `calculatedInsightStatus` is `ACTIVE` with `NOT_SCHEDULED`. It passes through `PROCESSING` first. `ACTIVE` means the definition is published, not that the calculation has run.

To change the expression of an `ACTIVE` insight, save `ci-expression-native.json`. Keep the same aggregation and output names; this example adds one condition to the filter:

```json
{ "expression": "SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 AND CustomerEvent__dlm.CustomerId__c IS NOT NULL GROUP BY CustomerEvent__dlm.ApplicationId__c" }
```

```sh
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-expression-native.json' --target-org TARGET_ALIAS
```

The insight goes to `PROCESSING` and back to `ACTIVE`. The publication state and schedule stay as they were. For a draft, the plugin adds `"draft": true` to the same body, and the insight stays `DRAFT`.

The plugin reads the insight up to 12 times, one second apart, within 120 seconds. It compares the whole definition and checks the expression and label against the Metadata definition. It never sends a PATCH again after an unclear result; do the same and read the insight first.

These are the bodies the plugin sends. The publish body repeats the existing label and `NotScheduled`; the plugin sends no other label or schedule change on this route.

### API 65 update route

The label and schedule change below, and a publish with a `SystemManaged` schedule, are shown on API 65 only.

To publish the draft with a system-managed schedule, save `ci-publish.json`:

```json
{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "SystemManaged" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-publish.json' --target-org TARGET_ALIAS
```

Server body excerpt (not a CLI envelope):

```json
{ "apiName": "CustomerActivity__cio", "status": "PROCESSING", "publishScheduleInterval": "SYSTEM_MANAGED" }
```

Read the insight again until its status is `ACTIVE`. Stop on errors instead of repeating the PATCH. `ACTIVE` does not mean the calculation has finished.

To change the label and schedule, save `ci-update.json`. Leave `definitionType` out:

```json
{ "displayName": "Customer Activity Updated", "publishScheduleInterval": "NotScheduled" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-update.json' --target-org TARGET_ALIAS
```

**Known failures:**

- On API 65, changing `APPROX_COUNT_DISTINCT` to `COUNT` with the same measure alias is refused.
- A PATCH can return `PROCESSING` again. Read the insight until it returns to `ACTIVE`.
{% endcapture %}

{% capture update_plugin %}
Installed cross-org API68 publish passed.

Installed GET-only unchanged deployment and ACTIVE edit passed.

Edits a paired definition, then publishes it as a separate step. Preview each command first.

For a draft, keep `--draft`:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --draft --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --draft --allow-processing
```

For an `ACTIVE` insight, leave out `--draft`. The publication state stays the same:

```sh
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --preview
sf data360 deploy -o TARGET_ALIAS --source-dir ./ci-pair --api-version 68.0 --allow-processing
```

To publish, select the JSON file of the pair, not its folder:

```sh
sf data360 publish -o TARGET_ALIAS --source-dir ./ci-pair/force-app/main/default/data360/calculatedInsights/CustomerActivity__cio.calculatedInsight.json --api-version 68.0 --preview
sf data360 publish -o TARGET_ALIAS --source-dir ./ci-pair/force-app/main/default/data360/calculatedInsights/CustomerActivity__cio.calculatedInsight.json --api-version 68.0 --allow-processing
```

Only the qualified expression edits are admitted. They are not arbitrary SQL, label, schema or schedule changes. A matching `ACTIVE` publish is unchanged.

The sample output is not in this guide yet.
{% endcapture %}

{% include operation-tabs.html id="ci-update" label="Update" cli_state="available" cli_reason="Only a change to the XML label is verified." cli_body=update_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 publish and qualified expression PATCH; the API 65 label and schedule change is separate." connect_body=update_connect plugin_state="available" plugin_reason="Qualified draft and ACTIVE expression edits, then a separate publish. Not arbitrary SQL." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
Deletes an owned definition through a deployment manifest. It does not remove a live insight or its generated data. Check ownership and dependencies first.

Create the manifest files. `destructiveChangesPost.xml` names the definition:

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
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0
```

The deletion must complete successfully. The second command confirms that the definition is gone.

A sample of the deletion result is not in this guide yet.
{% endcapture %}

{% capture delete_connect %}
### Native API68 delete

Deletes the live insight by its full name, then checks that it is gone. Check ownership and dependencies first.

The plugin sends a DELETE without a body. The Salesforce CLI needs a body entry for DELETE, so save `ci-delete.json` with an explicit empty raw body:

```json
{ "url": "/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file ci-delete.json --target-org TARGET_ALIAS --include
sf api request rest '/services/data/v68.0/ssot/calculated-insights/CustomerActivity__cio' --target-org TARGET_ALIAS --include
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0
```

`--include` prints the HTTP status and headers with the body. The DELETE reply body is empty and is not proof of deletion. While removal runs, the item read still returns the insight with `"calculatedInsightStatus": "DELETING"`. Read it again until it answers `ITEM_NOT_FOUND`, and check that the metadata entry `CustomerActivity` is gone. In one live run that took six `DELETING` reads and about 35 seconds. Do not send another DELETE while removal is running.

**Known failures:**

- A DELETE without a body can fail in the CLI with a missing `mode` error. Use the whole-request file shown above.
- The plugin reads up to 12 times within 120 seconds. Two live deletes ended unconfirmed within that budget, and later reads found the insight gone. Read again instead of deleting again.
{% endcapture %}

{% capture delete_plugin %}
Deletes one insight, using the exact JSON file from its pair. Run the preview first.

```sh
sf data360 delete -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --source-dir ./ci-pair/force-app/main/default/data360/calculatedInsights/CustomerActivity__cio.calculatedInsight.json --api-version 68.0 --preview
sf data360 delete -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --source-dir ./ci-pair/force-app/main/default/data360/calculatedInsights/CustomerActivity__cio.calculatedInsight.json --api-version 68.0 --confirm-delete
```

Deletion does not cascade. It does not delete local files. Preview is read-only. Without `--confirm-delete`, an owned insight is not deleted. Check the runtime and metadata afterwards.

The sample output is not in this guide yet.

**Known failures:**

- A delete can return an unconfirmed result. Check the runtime and metadata with reads.
- Do not run the delete again after an unconfirmed result.
{% endcapture %}

{% include operation-tabs.html id="ci-delete" label="Delete" cli_state="available" cli_reason="Deletes an owned definition through a manifest. It does not remove runtime data." cli_body=delete_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 DELETE by name, then item read and metadata checks." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one exact pair member after a guarded check. Uncertain results are not replayed." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>



**Plugin scope:** The plugin uses API 68 and the default data space. Default and `auto` use API 68 too; `--api-version 65.0` is refused with `INVALID_SCOPE`. Native runtime requests use 68; standard XML, Metadata and dependency bindings use 65. Internal native 64 to 68 feasibility does not qualify the public lifecycle at every version.

**Plugin evidence:**

- Retrieve exports settled ACTIVE only. Installed retrieval produced byte-identical XML/JSON.
- Installed cross-org API68 create passed. This does not qualify arbitrary SQL or released packages.
- Installed GET-only unchanged deployment and ACTIVE edit passed.
- Installed cross-org API68 publish passed.
- Two initial public deletes returned CI_DELETION_UNCONFIRMED. Later runtime and Metadata reads confirmed that the insight was absent.
- A later installed delete passed in 35.2 seconds after six `DELETING` polls and dual absence on poll 7. The two unconfirmed results remain unexplained. This is not reliable completion every time, and not a version-specific defect.
- Native 64 asynchronous deletion evidence does not identify a version-specific defect.
- One observer harness journal was recovered from independent observations. Child CLI output was lost, so the retained evidence is not a complete raw response archive.

**Native API 68 Connect routes:**

- Create is one POST to `/ssot/calculated-insights` with `draft: true`; publish and expression edits are PATCH requests on the item route; delete is a DELETE on the item route. The request bodies on this page are the ones the plugin sends.
- Installed plugin runs on these routes created a draft, published it to `ACTIVE` with `NOT_SCHEDULED`, edited the `ACTIVE` expression and deleted the insight. Independent runtime, Metadata and dependency reads confirmed each result. `lastRunStatus` stayed null, so `ACTIVE` is not computation evidence.
- The tested expression edit added a fully qualified `IS NOT NULL` condition to the `WHERE 1 = 0` filter. The aggregation, output aliases and grouped dimension were kept. This proves that bounded edit, not arbitrary SQL or schema editing.
- On consecutive API 68 reads, the returned fields' derived `dataSource` changed, although formulas were stable. Do not use that attribution as a dependency identifier.
- Before sending an expression PATCH, read the current expression and settings. If they already match, skip the unnecessary PATCH yourself. This is comparison guidance, not an automatic no-op or identical-repeat guarantee from the API.

**API 65 expression check:** We tried replacing `APPROX_COUNT_DISTINCT` with `COUNT` on API 65, keeping the same measure alias. Salesforce rejected that change because it changed how the existing measure can be aggregated. Separate reads confirmed that the original SQL and field definitions were unchanged. This does not mean that every SQL edit will fail. The change was not tried on API 68.

**Deletion routes:**

- Delete binds the exact selector to its expected never-run `NOT_SCHEDULED` content and fresh dependencies.
- The plugin does not prove the original creator owns the insight. A present owner needs `--confirm-delete`.
- After a write, reconcile runtime and Metadata absence with reads. Do not replay DELETE.
- All owned CI fixtures are confirmed absent.

**Not verified:** populated-data calculations, storage or credit cleanup, released-package qualification, unchanged-source cross-org deployment, arbitrary SQL edits, scheduled-processing behavior, successful calculation, and the Metadata API read of the insight directly.

</details>