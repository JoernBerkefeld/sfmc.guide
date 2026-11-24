---
layout: page
title: "Calculated insights"
description: "Salesforce CLI workflows and verified operation limits for calculated insight definitions and runtime state."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/calculated-insights/
redirect_from:
  - /next/data-cloud-cli/calculated-insights/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "yes" } }
  update: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "yes" } }
  delete: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "yes" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

A calculated insight computes values from your data, for example a customer count grouped by application. You define it with an SQL query. `GROUP BY` fields are dimensions, and calculated values are measures.

**Example used in every chapter:** `CustomerActivity__cio`, which counts customers per application from the `CustomerEvent__dlm` object.

**Warning:** Saving a definition can reserve the insight's name without creating a live insight. Do not deploy an XML file first if you need a live insight.

{% include crud-summary.html %}

**Plugin qualification:** The plugin sends any SQL, status and schedule as written, and Salesforce decides. The live runs are listed under Evidence.

**SQL that fails silently:** Salesforce accepts the create and the publish of an insight whose SQL it cannot run. About three minutes after publishing, the insight reads `ERROR` with `CREATE_FAILED`, with no message, no dimensions or measures and no output table. Check the status after every publish. Tested live at API 68 (2026-11-22):

- **Classic insights** (`queryDialect` `ANSI_SQL`) fail with:
  - **a table alias**, also when every column has `AS`. `FROM CustomerEvent__dlm e` with `e.CustomerId__c` fails. Write the full name instead: `FROM CustomerEvent__dlm` with `CustomerEvent__dlm.CustomerId__c`.
  - **a quoted column alias:** `AS "customer_count__c"`, `"customer_count__c"` or `` AS `customer_count__c` ``.
  - **a text value as a column**, such as `'x' AS label__c`.
  - **a `--` comment line**, even one that names nothing.
- **SQL Insights Builder insights** (`queryDialect` `DC_SQL`) take table aliases, double-quoted aliases and text value columns. They fail only with a backtick alias.
- **Both dialects** accept a column alias without `AS`, after a closing bracket (`COUNT(CustomerEvent__dlm.CustomerId__c) customer_count__c`), after a field or after a number.
- **No quick check:** the validation route (`POST /ssot/calculated-insights/actions/validate`) answered "This feature is not supported for this org". The Query API accepts SQL that classic insights then fail on, so it is no substitute.

**Enum letter case:** An enum value in `definitionType`, `queryDialect`, `publishScheduleInterval` or `historyPublishScheduleInterval` that differs from Salesforce's stored spelling only in letter case counts as unchanged on deploy. The plugin sends the value as written; retrieve writes Salesforce's spelling.

## Read

{% capture read_cli %}
Saves the insight's XML definition to your project. It does not save the full runtime state.

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org SOURCE_ALIAS --api-version 68.0 --wait 5
```

This writes `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`. The file holds the SQL, label and creation type. It does not hold the enabled state, the schedule or the data space.

Use the metadata name, `CustomerActivity`, not the runtime name that ends in `__cio`.

The file has the same three elements as the definition on the Create tab: `creationType`, `expression` and `masterLabel`.
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
These are API-led plugin operations, not out-of-the-box Salesforce CLI commands. Every plugin command for calculated insights uses API 68 only: the default `--api-version auto` selects it, an explicit `68.0` pin is optional, and any other version is refused with `INVALID_SCOPE`. `--dataspace` names the data space (`default` when omitted), and a file of another space is refused; see [Data Spaces](/next/data-spaces/). No plugin request goes through the Metadata API.

<a id="optional-sf-plugin-data-native-lifecycle"></a>

Saves one insight, whatever its status, schedule or SQL, as a JSON file and an SQL file. A Visual Builder draft has no SQL in the API, so it is saved as-is with a warning (`CI_VISUAL_DRAFT_WITHOUT_SQL`) and no SQL file, and deploy does not send it. Run it from the project root. A retrieve replaces differing existing files; an identical repeat reports `unchanged`.

```sh
sf data360 retrieve -o SOURCE_ALIAS -m calculated-insight:CustomerActivity__cio
```

Bare `-m calculated-insight` saves every insight the API lists in the data space. A retrieve without `-m` includes every insight as well.

The command writes two files under the project root (not under the package directory):

- `data360/calculatedInsights/CustomerActivity__cio.calculatedInsight-meta.json`
- `data360/calculatedInsights/CustomerActivity__cio.calculatedInsight-meta.sql`

The JSON file is the API 68 read with its key names and enum values exactly as the API returns them (`dataSpace`, `CALCULATED_METRIC`, `NOT_SCHEDULED`). The plugin leaves out what the org sets or derives: the status and run fields (`calculatedInsightStatus`, `definitionStatus`, `isEnabled`, `lastRun…`), `sourceCiId`, `sourceCiName`, `creationType`, `subType`, and the `dimensions` and `measures` Salesforce derives from the SQL. An excerpt:

```json
{ "apiName": "CustomerActivity__cio", "displayName": "Customer Activity", "dataSpace": "default", "definitionType": "CALCULATED_METRIC", "isFromPackage": false, "queryDialect": "ANSI_SQL", "publishScheduleInterval": "NOT_SCHEDULED" }
```

The SQL file holds the `expression` as plain SQL. Salesforce returns it HTML-escaped (`&gt;`, `&#39;`) unless the request asks for plain text; the plugin asks for plain text:

```sql
SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY CustomerEvent__dlm.ApplicationId__c
```

Retrieve only reads. An insight the org does not have is refused with `CI_NOT_FOUND`.
{% endcapture %}

{% capture read_metadata %}
### Metadata API read of the definition

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes. Use the metadata name without the `__cio` suffix.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>MktCalcInsightObjectDef</met:type>
      <met:fullNames>CustomerActivity</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds `fullName`, `creationType`, `expression` and `masterLabel`. It has no status, schedule or data space; read those on the Connect API tab. `listMetadata` with the type `MktCalcInsightObjectDef` returns the full names in the org.
{% endcapture %}

{% include operation-tabs.html id="ci-read" label="Read" cli_state="available" cli_reason="Saves the XML definition, not the complete runtime state." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata and listMetadata. Returns the definition, not the runtime state." metadata_body=read_metadata connect_state="available" connect_reason="Native API68 read of the runtime configuration. The XML is saved separately." connect_body=read_connect plugin_state="available" plugin_reason="Saves any insight as a JSON file and an SQL file, using API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_cli %}
Saves the definition as an XML file, then deploys it. The deploy stores the definition only. It does not guarantee that no processing happens.

**Evidence:** this create, the label and SQL updates and the delete below were run live at API 65 on a new definition (see Evidence). Each deploy succeeded, a retrieve matched the file, and the runtime read kept answering `ITEM_NOT_FOUND`.

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
- A live insight's definition cannot be changed this way, not even while it is a draft: the deploy fails with "Cannot update a MktCalcInsightObjectDef when DefinitionStatus is in use." Change a live insight on the Connect API tab.
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

The POST response is not proof of the result. Read the insight until `calculatedInsightStatus` is `DRAFT`, with empty `dimensions` and `measures`, `NOT_SCHEDULED` and your expression and label. The plugin reads up to 12 times, one second apart, within 120 seconds. `DRAFT` does not show that the insight has computed.

The create body uses some other names than the read: `dataSpaceName` instead of `dataSpace`, `createdFromPackage` instead of `isFromPackage`, and `NotScheduled` instead of `NOT_SCHEDULED`. At API 68 Salesforce refuses `dataSpace` and `isFromPackage` as unrecognised input and `NOT_SCHEDULED` as a value; `definitionType` and `queryDialect` take either spelling on POST.

Do not send the POST again if the outcome is unclear. Read the insight first.

**Known failures:**

- Salesforce does not create a Real-Time Insight (`definitionType` `GRAPH_METRIC`) through the API: the POST answers "The Definition Type is not supported". Create it in the UI; update and delete work through the API.
{% endcapture %}

{% capture create_plugin %}
Creates an insight from the JSON and SQL files of the Read tab. Run it from the project root and run the preview first.

```sh
sf data360 deploy -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --draft --preview
sf data360 deploy -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --draft
```

`-d` with either file selects the insight too. The plugin joins the JSON with its SQL file; a missing JSON or SQL file, an `expression` kept in the JSON, or another `CustomerActivity__cio.calculatedInsight-meta.*` file beside them is refused with `INVALID_SOURCE`.

Deploy reads the insight by name. When the org answers HTTP 404 `ITEM_NOT_FOUND`, one POST creates it. `--draft` creates a draft; without it the insight is created active. The file is sent as written, with the read names translated to the create names shown on the Connect API tab and `null` values left out. Any SQL, status and schedule is sent; Salesforce decides, and a 4xx answer is reported as `rejected` with Salesforce's message. After the POST the plugin reads the insight up to 12 times within 120 seconds until it is no longer `PROCESSING` and holds the file. No flag acknowledges processing.

Preview is read-only. `--changed-since <git-ref>` can select changed files instead of `-m`; files deleted in the range are reported and never deleted by deploy. The insight runs after the selected DMOs, identity resolutions and other insights whose names appear in its SQL.

The human-readable output is, for the second command (derived from the command's output code; offline-tested):

```text
created calculated-insight CustomerActivity__cio
Deployed: 1 (1 created / 0 updated / 0 failed)
```

The preview prints `Planned create: calculated-insight:CustomerActivity__cio.` and performs no write.

**Known failures:**

- A Real-Time Insight (`GRAPH_METRIC`, built with the Visual Builder on a Real-Time Data Graph) cannot be created through Salesforce's public API, so its create is reported as `rejected`. Create it in the UI, then retrieve it; updates and delete through the plugin work.
{% endcapture %}

{% capture create_metadata %}
### Metadata API create of the definition

Send `createMetadata` to the same SOAP endpoint and headers as the Read tab. The record has the same four elements a read returns. Use DMO fields that already exist, and the metadata name without `__cio`.

```xml
<met:createMetadata>
  <met:metadata xsi:type="met:MktCalcInsightObjectDef" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerActivity</met:fullName>
    <met:creationType>Custom</met:creationType>
    <met:expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY CustomerEvent__dlm.ApplicationId__c</met:expression>
    <met:masterLabel>Customer Activity</met:masterLabel>
  </met:metadata>
</met:createMetadata>
```

The answer is `success` `true` with the full name. `readMetadata` then returns the same four values, and `listMetadata` shows the name. Like the CLI deploy, this saves the definition only: in the live run, the runtime read on the Connect API tab kept answering `ITEM_NOT_FOUND`, so no insight was created and nothing ran.
{% endcapture %}

{% include operation-tabs.html id="ci-create" label="Create" cli_state="available" cli_reason="Definition only. It can reserve a name and does not guarantee that no processing happens." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with createMetadata. Saves the definition only; no live insight is created." metadata_body=create_metadata connect_state="available" connect_reason="Native API68 POST creates a draft insight; it does not publish it." connect_body=create_connect plugin_state="available" plugin_reason="Creates an insight, as a draft with --draft, from its JSON and SQL files, using API 68.0." plugin_body=create_plugin %}

## Update

{% capture update_cli %}
Changes the label or the SQL in the XML definition, then deploys the same file. Both were tested live on a definition without a live insight. Change the label and the SQL in separate deploys if you want to compare each result.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5
```

The result reports the component as changed:

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": false, "changed": true, "success": true }] } } }
```

Retrieve the file again to confirm the new label or SQL. An identical repeat reports the component with `changed` `false`.

**Known failures:**

- The definition of a live insight, even a draft, cannot be updated: the deploy fails with "Cannot update a MktCalcInsightObjectDef when DefinitionStatus is in use." Change its label or SQL on the Connect API tab; a label PATCH there also changes the definition's `masterLabel`.
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

The plugin reads the insight up to 12 times, one second apart, within 120 seconds, until it is no longer `PROCESSING` and holds the file. It never sends a PATCH again after an unclear result; do the same and read the insight first.

A PATCH must not carry `definitionType`, not even an unchanged one: Salesforce refuses it with "Cannot change the calculated insight definition type". A PATCH without `draft` publishes a draft, so the plugin sends `"draft": true` on every update of a draft and publishes only through `sf data360 publish`.

To change only the label of a draft, send `{ "displayName": "Customer Activity Updated", "draft": true }`. At API 68 this answered HTTP 200; the insight stayed `DRAFT` and `NOT_SCHEDULED` with the new label, and the Metadata API definition showed the same new `masterLabel`.

### API 65 update route

The publish with a `SystemManaged` schedule is a verification-database row at API 65 only. The schedule change after it was not repeated: this sweep runs no schedule on probes. The label change alone is tested at API 68 above.

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
Edits the JSON or SQL file, deploys it, and publishes a draft as a separate step. Retrieve the files first (Read tab), edit them, then preview each command. Run the commands from the project root.

```sh
sf data360 deploy -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --preview
sf data360 deploy -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio
```

Deploy reads the insight by name. It reports `unchanged` without a write when the org insight holds every key of the JSON and the SQL; keys the file leaves out are not compared, so a retrieved file deploys back unchanged. Otherwise one PATCH sends the file as written, without `apiName` and without a `definitionType` equal to the org value. Any SQL, label or schedule change is sent; Salesforce decides, and a 4xx answer is reported as `rejected`. The plugin then reads the insight until it is no longer `PROCESSING` and holds the file.

Deploy never publishes. An update of a `DRAFT` insight always sends `"draft": true`, so the insight stays a draft; `--draft` does the same. An `ACTIVE` insight stays `ACTIVE`.

To publish, pass the JSON or the SQL file of the insight:

```sh
sf data360 publish -o TARGET_ALIAS -d data360/calculatedInsights/CustomerActivity__cio.calculatedInsight-meta.json --preview
sf data360 publish -o TARGET_ALIAS -d data360/calculatedInsights/CustomerActivity__cio.calculatedInsight-meta.json
```

An `ACTIVE` insight that holds every key of the file reports `unchanged`. Otherwise one PATCH sends the file with `"draft": false`, and the plugin reads the insight until it is `ACTIVE` and holds the file. An insight the org does not have is `CI_NOT_FOUND`; create it with deploy first.

`publish` takes `-o`, one exact file as `-d`/`--source-dir` (the JSON or its SQL file, never a folder), `--api-version` (`auto` or `68.0`), `--dataspace` (the run's data space, `default` when omitted; `c__dataSpace` in the file must name it) and `--preview`. It needs no acknowledgement flag. `publish` is also available as `datacloud:publish`, `d360:publish` and `dc:publish`.

The human-readable output is (derived from the command's output code; offline-tested):

```text
Publish: success.
published: CustomerActivity__cio; mutation: confirmed-published.
```

With `--preview` the header is `Publish preview: success.` and the line reads `publish: CustomerActivity__cio; mutation: not-attempted.`. An equal `ACTIVE` target reads `unchanged`.
{% endcapture %}

{% capture update_metadata %}
### Metadata API update of the definition

Send `updateMetadata` with the complete record, in the same form as the create on the Create tab, with only the changed value edited. The live run changed `masterLabel` to `Customer Activity Updated` and kept the SQL:

```xml
<met:updateMetadata>
  <met:metadata xsi:type="met:MktCalcInsightObjectDef" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerActivity</met:fullName>
    <met:creationType>Custom</met:creationType>
    <met:expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY CustomerEvent__dlm.ApplicationId__c</met:expression>
    <met:masterLabel>Customer Activity Updated</met:masterLabel>
  </met:metadata>
</met:updateMetadata>
```

The answer is `success` `true`. `readMetadata` then shows the new label and the unchanged SQL. An SQL change in `expression` works the same way: the live run added `AND <field> IS NOT NULL` to the filter and `readMetadata` returned the new SQL. Both change the definition only; they do not create, change or publish a live insight.

The definition of a live insight, even a draft, cannot be updated: the answer is `success` `false` with `FIELD_NOT_UPDATABLE` ("Cannot update a MktCalcInsightObjectDef when DefinitionStatus is in use."), and the insight keeps its values. Use the Connect API tab for a live insight.
{% endcapture %}

{% include operation-tabs.html id="ci-update" label="Update" cli_state="available" cli_reason="Label and SQL changes of a definition without a live insight. A live insight's definition is refused." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with updateMetadata: label and SQL changes of a definition without a live insight. A live insight's definition is refused." metadata_body=update_metadata connect_state="available" connect_reason="Native API68 publish, draft label change and qualified expression PATCH; the API 65 schedule change is separate." connect_body=update_connect plugin_state="available" plugin_reason="Sends the edited files with one PATCH; deploy keeps a draft, publish activates it." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
Deletes an owned definition through a deployment manifest. It does not remove a live insight or its generated data. Check ownership and dependencies first. Tested live at API 65 on a definition without a live insight. The definition of a live insight, even a draft, is refused with `DEPENDENCY_EXISTS` ("referenced elsewhere in Salesforce"); delete a live insight on the Connect API tab, which removes its definition too.

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
- The plugin reads up to 12 times within 120 seconds. A delete can end unconfirmed within that budget (`CI_DELETION_UNCONFIRMED`) while the insight is still being removed. Read the insight again instead of sending another DELETE.
- Salesforce sometimes answers a DELETE or a later read with HTTP 404 `ENTITY_IS_DELETED` instead of `ITEM_NOT_FOUND`. The plugin counts both as gone and reports the delete confirmed once a read finds the insight absent.
{% endcapture %}

{% capture delete_plugin %}
Deletes one insight, selected by name. The insight is read from the org by name before anything is deleted, also by the preview, in any status, schedule or SQL. Run the preview first.

```sh
sf data360 delete -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio --preview
sf data360 delete -o TARGET_ALIAS -m calculated-insight:CustomerActivity__cio
```

The read must answer with the selected name and data space (`CI_IDENTITY_CHANGED` otherwise). The plugin sends one DELETE, then reads the insight until it answers HTTP 404, waiting through `DELETING`. Deletion does not cascade. One delete can also name other families; they run in reverse dependency order. Preview is read-only. The delete takes no confirmation flag. An insight the org does not have reports `unchanged`, so a repeated delete after confirmed absence changes nothing.

After a confirmed deletion the command removes the JSON and the SQL file at their canonical paths under `data360/calculatedInsights/` in the current directory. Pass `--keep-local-files` to keep them. A failed removal keeps the confirmed org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`.

The human-readable output is (derived from the command's output code; offline-tested):

```text
Delete: success.
deleted calculated-insight CustomerActivity__cio
removed local file <path of the JSON file>
removed local file <path of the SQL file>
```

The preview prints `Planned delete: calculated-insight:CustomerActivity__cio; mutation: not-attempted.` and one `Planned local file removal:` line per existing file, and removes nothing.

**Known failures:**

- A delete can return an unconfirmed result. Check the runtime and metadata with reads.
- Do not run the delete again after an unconfirmed result.
{% endcapture %}

{% capture delete_metadata %}
### Metadata API delete of the definition

Send `deleteMetadata` with the type and the metadata name. Check ownership and dependencies first.

```xml
<met:deleteMetadata>
  <met:type>MktCalcInsightObjectDef</met:type>
  <met:fullNames>CustomerActivity</met:fullNames>
</met:deleteMetadata>
```

The answer is `success` `true`. Confirm with reads: `readMetadata` returns an empty record and `listMetadata` no longer shows the name. The definition of a live insight, even a draft, is refused: `success` `false` with `DEPENDENCY_EXISTS` ("referenced elsewhere in Salesforce"), and the insight and its definition stay. For a live insight, use the Connect API tab; its DELETE removes the definition too.
{% endcapture %}

{% include operation-tabs.html id="ci-delete" label="Delete" cli_state="available" cli_reason="Deletes an owned definition without a live insight through a manifest. A live insight's definition is refused." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with deleteMetadata on a definition without a live insight. A live insight's definition is refused." metadata_body=delete_metadata connect_state="available" connect_reason="Native API68 DELETE by name, then item read and metadata checks." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one insight by name, then removes its JSON and SQL files. Uncertain results are not replayed." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>



**Plugin scope:** Every plugin command for calculated insights uses API 68 in the run's data space (`--dataspace`, `default` when omitted). Default and `auto` use API 68; an explicit `68.0` pin is optional; any other version is refused with `INVALID_SCOPE`. The plugin sends no Metadata API request for calculated insights. Any SQL, status and schedule is sent as written; Salesforce decides.

**Plugin evidence (API 68, one org):**

- Retrieve wrote three existing insights as JSON plus SQL; a repeated retrieve reported `unchanged`. The SQL file held `>=` and quoted strings unescaped.
- Deploy created one insight as a draft (`--draft`) and one as active. SQL and label updates of the draft kept it `DRAFT`; `sf data360 publish` made it `ACTIVE`; an update of the `ACTIVE` insight succeeded; a repeated deploy reported `unchanged`; delete removed it, read back as HTTP 404.
- Earlier, a delete ended `CI_DELETION_UNCONFIRMED` while removal was still running, so completion within the read budget is not reliable every time.

**Native API 68 Connect routes:**

- Create is one POST to `/ssot/calculated-insights`; updates and publication are PATCH requests on the item route; delete is a DELETE on the item route.
- `lastRunStatus` stayed null in the runs above, so `ACTIVE` is not computation evidence.
- On consecutive API 68 reads, the returned fields' derived `dataSource` changed, although formulas were stable. Do not use that attribution as a dependency identifier.
- Before sending an expression PATCH, read the current expression and settings. If they already match, skip the unnecessary PATCH yourself. This is comparison guidance, not an automatic no-op or identical-repeat guarantee from the API.

**API 65 expression check:** We tried replacing `APPROX_COUNT_DISTINCT` with `COUNT` on API 65, keeping the same measure alias. Salesforce rejected that change because it changed how the existing measure can be aggregated. Separate reads confirmed that the original SQL and field definitions were unchanged. This does not mean that every SQL edit will fail. The change was not tried on API 68.

**Deletion routes:**

- Delete reads the selected insight by name first and requires the same name and data space in the answer.
- The plugin does not prove the original creator owns the insight. Check the owner before you run the delete.
- After a write, confirm absence with reads. Do not replay DELETE.

**Standard CLI:** `sf org list metadata --metadata-type MktCalcInsightObjectDef` lists the definitions, and `sf project retrieve start` saved one by its metadata name at API 68.0 (CLI 2.151.7). **Standard CLI create, update and delete (API 65.0, CLI 2.151.7, one org, 2026-11-16):** On one new probe definition, `sf project deploy start` created it, then changed its label, then its SQL (one added `IS NOT NULL` condition); each deploy reported `Succeeded` with `changed` `true`, and a retrieve after each matched the file. An identical repeat reported `changed` `false`. The `--post-destructive-changes` deploy deleted it, and the list held the same three definitions as before. The Connect item read answered `ITEM_NOT_FOUND` throughout: a deployed name is reserved without a live insight.

**Metadata API create, update and delete (API 68.0, one org, 2026-11-16):** `createMetadata`, `updateMetadata` (a label change in one run, an SQL change in another) and `deleteMetadata` on new probe definitions each answered `success` `true`. After each call, `readMetadata` and `listMetadata` confirmed the result, and the Connect item read answered `ITEM_NOT_FOUND` every time: no live insight was created and no job started. After the delete the definition was gone from both views, and the list held the same three definitions as before the run.

**Definition of a live draft insight (one org, 2026-11-16):** A draft created with the Connect POST has a `MktCalcInsightObjectDef` with the same name (without `__cio`), SQL and label, so `readMetadata`, `listMetadata` and the standard CLI retrieve read it. Writes to it are refused, and the draft stays unchanged: `updateMetadata` and a CLI deploy of a new label failed with "Cannot update a MktCalcInsightObjectDef when DefinitionStatus is in use."; `deleteMetadata` and a CLI destructive deploy failed with `DEPENDENCY_EXISTS`. A Connect PATCH of `displayName` with `"draft": true` changed the label, and the definition's `masterLabel` followed. The Connect DELETE answered HTTP 204; the next read answered `ITEM_NOT_FOUND` and the definition was gone from `listMetadata`. The draft was never published, scheduled or run.

**Outside these probes:** populated-data calculations, storage or credit cleanup, released-package qualification, cross-org deployment of retrieved files, scheduled-processing behavior and successful calculation. These need a run, a schedule, a package or a second org, which this page's probes do not use.

</details>