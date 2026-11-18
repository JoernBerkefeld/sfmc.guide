---
layout: page
title: "Segments"
description: "Salesforce CLI workflows and verified operation limits for Operational segments."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/segments/
redirect_from:
  - /next/data-cloud-cli/segments/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "partial", methods: [cli, api, plugin] }
  update: { status: "partial", methods: [cli, api, plugin] }
  delete: { status: "partial", methods: [cli, api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

A **segment** selects an audience by rules. Publishing prepares it for use. Refreshing recalculates it. Activation sends the audience to a destination.

A **unified DMO** holds the combined customer profiles from identity resolution. Use an existing one, with its real key.

A **UI** segment is built in Salesforce's visual interface. A **DBT** segment is defined with SQL.

**Example used in the chapters:** `ActiveCustomers`, a DBT segment on `UnifiedCustomer__dlm` with an empty audience (`WHERE 1 = 0`). The file-based examples use `OwnedSegment` and `CustomerDefinition` instead.

**Processing:** Creating or changing a live segment can start processing, even with `NoRefresh` and an empty audience. Get permission for that before you write.

<a id="beyond-the-gui"></a>

{% capture beyond_gui %}
- **Create, update and delete SQL (DBT) segments.** Plugin `deploy`/`delete` with the SQL in its own `.sql` file, or the Connect API (`/ssot/segments`). The Data Cloud UI's New Segment wizard offers Standard, Waterfall, Real-Time and Dynamic segments built visually, with no SQL or DBT option.

Evidence: UI wizard opened without saving, and a plugin create, byte-exact retrieve, SQL-only update and delete of a DBT segment, both at API 68.0. The Metadata API also creates a DBT definition, but no live segment.
{% endcapture %}
{% include callout.html type="tip" title="Beyond the Data Cloud GUI" content=beyond_gui %}

{% include crud-summary.html %}

**Plugin qualification:** The `sf-plugin-data` tabs send the authored label, description, segment-on DMO and SQL models (DBT) or criteria (UI) as written, and Salesforce decides. DBT segments with `NO_REFRESH` and `P90D`, and UI segments with `NO_REFRESH`, no parameters and no settings the plugin does not know, can be expressed. Retrieve saves any other segment as-is with a warning (`UNSUPPORTED_SEGMENT_VARIANT`), and deploy does not send that file. This covers Waterfall, Real-Time and Lookalike segments, segments with parameters or exclusion criteria, and refresh schedules other than no refresh (deploying a schedule would publish the segment).

## Read

{% capture read_plugin %}
Saves the segment on API68 as one JSON file plus one SQL file per model. You can use these files for the Create, Update and Delete commands.

```sh
sf data360 retrieve --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --output-dir retrieved
```

The command writes `retrieved/data360/segments/OwnedSegment.segment.json` and, beside it, `OwnedSegment.segment.OwnedSegment.sql`: `<output-dir>/data360/segments/<Name>.segment.json` plus one `<Name>.segment.<model>.sql` for each model. There is no Segment XML. Segments use API 68 only: the default (`auto`) selects it, an explicit `--api-version 68.0` is optional, and any other version is refused with `INVALID_SCOPE`. Only the default data space is accepted. Repeating the command writes nothing and reports `unchanged`; `-x` (`--overwrite`) replaces differing files and removes the SQL file of a model the segment no longer has.

To save every segment of the default data space at once, use `--metadata segment` without a name:

```sh
sf data360 retrieve --target-org SOURCE_ALIAS --metadata segment --output-dir retrieved
```

The plugin lists the segments page by page (up to 200 per page, until the total the list reports) and then reads each one by name, exactly as above. One segment that cannot be read or written gets its own error and does not stop the others. Segments the plugin cannot express (see below) are saved as-is, as with a single segment.

The JSON file lists the models by name only:

```json
{
  "schemaVersion": 1,
  "kind": "segment",
  "identity": { "dataSpace": "default", "apiName": "OwnedSegment" },
  "spec": {
    "displayName": "Owned Segment",
    "description": "Customer segment with an empty initial audience",
    "segmentType": "DBT",
    "segmentOn": { "kind": "dmo", "dataSpace": "default", "apiName": "UnifiedCustomer__dlm" },
    "models": [{ "name": "OwnedSegment" }],
    "publishInterval": "NO_REFRESH",
    "lookbackPeriod": "P90D"
  }
}
```

Each SQL file holds that model's SQL as plain text, with the bytes Salesforce returned:

```sql
SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0
```

The plugin checks only the structure of the files. A model name must start with a letter or digit and hold only letters, digits and underscores, and two model names may not differ only in letter case (`INVALID_SEGMENT_DOCUMENT`). The SQL itself is not checked locally; Salesforce decides. Salesforce requires every column fully qualified as `Table.column`, with the DMO API name as the table: it refuses an unqualified column and a table alias with HTTP 400, and the plugin reports that answer. Only DBT segments with `NO_REFRESH`, `P90D` and no parameters can be expressed; another schedule or lookback is refused with `UNSUPPORTED_SEGMENT_VARIANT`. Runtime IDs are not portable between orgs and are not saved.

A UI segment has no SQL file. Its JSON file holds the criteria as a JSON object in `spec.includeCriteria` (Salesforce returns them as an HTML-encoded string; the plugin decodes them), and any lookback:

```json
{
  "schemaVersion": 1,
  "kind": "segment",
  "identity": { "dataSpace": "default", "apiName": "OwnedUiSegment" },
  "spec": {
    "displayName": "Owned UI Segment",
    "description": "",
    "segmentType": "UI",
    "segmentOn": { "kind": "dmo", "dataSpace": "default", "apiName": "UnifiedCustomer__dlm" },
    "includeCriteria": {
      "type": "TextComparison",
      "subject": { "objectApiName": "UnifiedCustomer__dlm", "fieldApiName": "FirstName__c" },
      "operator": "equal",
      "values": ["Example"]
    },
    "publishInterval": "NO_REFRESH",
    "lookbackPeriod": "P90D"
  }
}
```

The criteria are not checked locally. Salesforce adds keys of its own to the criteria it stores (`selfReference`, `subjectFieldDataType` and similar); retrieve the segment after a create to keep that stored form, and a repeat deploy of it reports `unchanged`. A UI segment with another schedule, parameters or a setting the plugin does not know (for example exclusion criteria) is saved as-is.
{% endcapture %}

{% capture read_cli %}
Saves the segment's XML definition into your project folder. Runtime settings and audience rows are not included.

```sh
sf project retrieve start --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

The file is written to `force-app/main/default/marketSegmentDefinitions/ActiveCustomers.marketSegmentDefinition-meta.xml`. A UI segment, with its criteria omitted, looks like this:

```xml
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Active Customers</masterLabel>
  <segmentOn>UnifiedCustomer__dlm</segmentOn>
  <segmentType>UI</segmentType>
  <!-- Retrieved selection criteria omitted. -->
</MarketSegmentDefinition>
```

The XML leaves out the lookback, schedule, state and data space. It does not publish, count or activate the segment.
{% endcapture %}

{% capture read_connect %}
<a id="read-runtime-state-through-the-cli"></a>

### Native API68 read

Reads the segment's runtime settings with a GET request. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/segments/ActiveCustomers' --target-org TARGET_ALIAS
```

The response wraps the segment in a `segments` array:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

The full entry also holds `includeDbt.models` (name and SQL of each model), the escaped `includeCriteria`, the runtime IDs `marketSegmentId`, `marketSegmentDefinitionId` and `segmentOnId`, and the generated `segmentMembershipDmo` tables. The IDs belong to this org. A missing segment answers HTTP 404:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "Segment not found: ActiveCustomers" }]
```

The lookback is the time window the segment uses. `P90D` means 90 days. Check the returned value rather than assuming it. Check the segment name, SQL, type, data space, segment-on object, lookback and schedule. This request does not write an XML file. For audience rows, see [Segment members](/next/data-cloud-devops/segment-members/#read).

The same route without a name lists the segments of the org. The listing takes `batchSize`, `offset` and `orderByExpression` and reports `totalSize`:

```sh
sf api request rest '/services/data/v68.0/ssot/segments' --target-org TARGET_ALIAS
```
{% endcapture %}
{% capture read_metadata %}
### Metadata API read of the segment definition

Send `readMetadata` to the Metadata SOAP endpoint. Post the envelope to `https://MyDomainName.my.salesforce.com/services/Soap/m/68.0` with the headers `Content-Type: text/xml` and `SOAPAction: ""`. Nothing in the org changes.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>ACCESS_TOKEN</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:readMetadata>
      <met:type>MarketSegmentDefinition</met:type>
      <met:fullNames>ActiveCustomers</met:fullNames>
    </met:readMetadata>
  </soapenv:Body>
</soapenv:Envelope>
```

The record holds `fullName`, `masterLabel` and `segmentType`. For a DBT segment, `includeCriteria` holds the DBT pipeline with its SQL as text. `listMetadata` with the type `MarketSegmentDefinition` returns the full names in the org. A definition can exist without a live segment, so check the Connect API tab before you rely on it.
{% endcapture %}

{% include operation-tabs.html id="segments-read" label="Read" cli_state="available" cli_reason="Saves the XML definition. Runtime settings and audience rows are not included." cli_body=read_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with readMetadata and listMetadata. Returns the definition, not runtime settings or rows." metadata_body=read_metadata connect_state="available" connect_reason="Native API68 read of runtime settings, not an XML file or audience rows." connect_body=read_connect plugin_state="available" plugin_reason="Retrieves every segment (bare -m segment) or one by name, as JSON plus one SQL file per model, using API 68.0." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the segment from the saved files on API68, if it does not exist yet. Preview first; the preview writes nothing.

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --allow-processing
```

The JSON file or any of its SQL files selects the segment, and so does `-m segment:OwnedSegment`. The plugin joins the JSON with exactly one SQL file per model; a missing or extra `OwnedSegment.segment.*` file, or a `sql` key left in the JSON, is refused with `INVALID_SOURCE`. Create and update need `--allow-processing`. The DMO named in `segmentOn` must exist in the target. Do not reuse a source record ID. `--changed-since <git-ref>` can select changed segment files instead of `--source-dir`; a change to the JSON or to any SQL file selects the segment. The plugin always sends the schedule `NoRefresh`.

Every column in the SQL must be fully qualified with the DMO API name, as in `UnifiedCustomer__dlm.CustomerKey__c`. Salesforce refuses an unqualified column and a table alias with HTTP 400; the item is then `failed` with mutation `rejected` (`REQUEST_FAILED`, or `SEGMENT_CREATE_CONFLICT` for HTTP 409), and Salesforce's message is shown. Nothing was written.

The output acknowledges queued configuration, not completed computation. It reads (offline-tested; derived from the command's output code):

```text
created segment OwnedSegment (server is still processing)
Deployed: 1 (1 created / 0 updated / 0 failed)
```

The preview prints `Planned create: segment:OwnedSegment.` and writes nothing.

**Known failures:**

- The plugin creates only when the native read proves the name absent. A segment name that already exists is routed to the update, or reported `unchanged` when nothing differs; it is not refused. The raw POST answers HTTP 409 (see the Connect API tab).
- If the result is unclear (`SEGMENT_CREATE_UNCONFIRMED`), do not send it again. Read the segment first.
- Salesforce's API validates filters more strictly than Segment Builder, so a UI segment built in the canvas (for example with criteria over related objects) can be refused on deploy. The plugin shows Salesforce's error.
{% endcapture %}

{% capture create_connect %}
### Native API68 create

Creates a live DBT segment with one POST. Salesforce queues the work, so the segment starts in `PROCESSING`. Check first that the native read answers `ITEM_NOT_FOUND` for the name.

Save `segment-create.json`, using your own unified DMO, key and model name. This is the body the plugin sends; the schedule is always `NoRefresh`:

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
sf api request rest '/services/data/v68.0/ssot/segments' --method POST --body '@segment-create.json' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/segments/ActiveCustomers' --target-org TARGET_ALIAS
```

The POST answers HTTP 201. The response looks like this:

```json
{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "includeDbt": { "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }] } }
```

The request nests the models as `includeDbt.models.models`. The response returns `includeDbt.models` as an array. Do not send the response back as input. `P90D` is the lookback this example returned, not a required value.

The response does not prove the result. Read the segment by name: the full read must show your definition, the runtime IDs and the generated `segmentMembershipDmo`. It can show `PROCESSING`, then `COUNTING`, then `ACTIVE`. `PROCESSING` or `COUNTING` with the full definition means the configuration is accepted, not that the audience is computed. The plugin reads up to 12 times, one second apart, within 120 seconds. Wait for `ACTIVE` before you change the segment.

**Known failures:**

- A name that already exists answers HTTP 409 with `ENTITY_SAVE_ERROR` ("That developer name's already taken"). The existing segment is not changed. Do not switch to PATCH or send the POST again; read the existing segment.
- If the outcome is unclear, do not send the POST again. Read the segment first.
{% endcapture %}

{% capture create_cli %}
Saves a DBT segment definition as an XML file and deploys it. This does not prove that a live segment exists.

Use a project that contains only this file. The deploy uses the whole folder. Save `force-app/main/default/marketSegmentDefinitions/CustomerDefinition.marketSegmentDefinition-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</includeCriteria>
  <masterLabel>Customer Definition</masterLabel>
  <segmentType>DBT</segmentType>
</MarketSegmentDefinition>
```

The `includeCriteria` value is pipeline XML with escaped text. Keep the escapes (`&lt;` for `<`, `&gt;` for `>`) when you edit it. This form has no `segmentOn` element. Replace the model and the DMO and key together.

A UI definition deploys the same way. Its file has `<segmentType>UI</segmentType>`, a `segmentOn` element with the DMO API name, and the criteria as escaped JSON in `includeCriteria`, for example one text comparison of a field with `"operator":"equal"` and a `values` list.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

The second command downloads the definition so you can compare it. Check the model, SQL, label and type. A successful deploy does not mean a live segment exists. Check that with the API read.

Sample of the deploy result with the optional JSON output:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": true, "changed": true, "success": true }] } } }
```
{% endcapture %}
{% capture create_metadata %}
### Metadata API create of the definition

Send `createMetadata` to the same SOAP endpoint and headers as the Read tab. The record has the elements a read returns. Inside the SOAP body, `includeCriteria` is text, so escape the pipeline XML as in the CLI tab's file.

```xml
<met:createMetadata>
  <met:metadata xsi:type="met:MarketSegmentDefinition" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerDefinition</met:fullName>
    <met:includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</met:includeCriteria>
    <met:masterLabel>Customer Definition</met:masterLabel>
    <met:segmentType>DBT</met:segmentType>
  </met:metadata>
</met:createMetadata>
```

The answer is `success` `true` with the full name. `readMetadata` then returns the same pipeline, label and type, and `listMetadata` shows the name. This saves the definition only: in the live run, the segment read on the Connect API tab kept answering `ITEM_NOT_FOUND`, so no live segment was created and no processing started.

A UI definition is created the same way, with `segmentType` `UI`, a `segmentOn` element and the criteria JSON as `includeCriteria` text. It also created no live segment.
{% endcapture %}
{% include operation-tabs.html id="segments-create" label="Create" cli_state="available" cli_reason="Saves a DBT segment definition as XML. It does not prove that a live segment exists." cli_body=create_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with createMetadata. Saves the DBT definition only; no live segment is created." metadata_body=create_metadata connect_state="available" connect_reason="Native API68 POST creates a live DBT segment. It can start processing." connect_body=create_connect plugin_state="available" plugin_reason="Creates a missing segment from its JSON and SQL files, then reads it back." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Changes the saved files on API68, then deploys them. Preview before you run the deploy.

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --allow-processing
```

Edit the label or description in the JSON file, or the SQL in a model's SQL file. An existing segment is updated with one PATCH of the whole definition, sent as written; Salesforce decides, and a 4xx answer is reported as `rejected`. Keep every column fully qualified with the DMO API name. The schedule and lookback are not sent by the PATCH. Salesforce can refuse an update right after a create with HTTP 403 while the segment is still `PROCESSING` or `COUNTING`. The plugin shows Salesforce's text, for example `ENTITY_SAVE_ERROR: Segment cannot be updated when it is in PROCESSING state`, and reports the update as `rejected`; deploy again once it is `ACTIVE`. Running the same deploy again, after the segment settles, is `unchanged` and writes nothing; it needs no `--allow-processing`.

The output reads (offline-tested; derived from the command's output code):

```text
updated segment OwnedSegment (server is still processing)
Deployed: 1 (0 created / 1 updated / 0 failed)
```

The preview prints `Planned update: segment:OwnedSegment.`. An unclear result ends with `SEGMENT_UPDATE_UNCONFIRMED`; do not replay the update, read the segment first.

Deploy never publishes. To publish the segment, run `sf data360 publish --target-org SOURCE_ALIAS --metadata segment:OwnedSegment` (`--preview` publishes nothing). It sends one POST, never resent, and waits for `SUCCESS` or `FAILED` (`--wait-timeout`, default 1800 seconds; a timeout reports `publishing`, still processing, exit 0). See [Segment members](/next/data-cloud-devops/segment-members/#update).
{% endcapture %}

{% capture update_connect %}
### Native API68 update

Changes the label and description with one PATCH request. Send the full definition, not only the changed fields. Patch only an `ACTIVE` segment.

Save `segment-update.json`. This is the body the plugin sends. The schedule and lookback fields are left out on purpose, so the existing values stay:

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
sf api request rest '/services/data/v68.0/ssot/segments/ActiveCustomers' --method PATCH --body '@segment-update.json' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/segments/ActiveCustomers' --target-org TARGET_ALIAS
```

The PATCH answers HTTP 200 and shows the segment while it processes:

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

The PATCH response leaves out `segmentOnApiName` and `segmentMembershipDmo`. Check those with the full read, not the response. Read the segment again: it can pass through `COUNTING` before `ACTIVE`. Compare the new label and description with the values you sent, and check that the other values and runtime IDs did not change. Do not send an unclear update again. Read the segment first.

The plugin sends this PATCH for any change of the label, description, segment-on DMO or SQL models, with the SQL of the saved model files.
{% endcapture %}

{% capture update_cli %}
Changes the label or the SQL in the owned XML file, then deploys it. Keep the model name and type as they are. The live run changed `masterLabel` in one deploy and the SQL in the next, on DBT and UI definitions without a live segment. Change the label and the SQL in separate deploys if you want to compare each result.

Change `masterLabel` to `Customer Definition Updated`, or edit the SQL inside the escaped `<sql>` element:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

The deploy reports the component with `changed` `true`, and the retrieved file shows the new label or SQL. For a UI definition, the criteria JSON in `includeCriteria` is edited the same way. An identical repeat reports `changed` `false`. The deploy job still runs in that case. None of these deploys creates a live segment: the runtime read kept answering `ITEM_NOT_FOUND`.

**Known failures:**

- On the definition of a live, published segment, a label deploy succeeds and the retrieved file shows the new label, but the live segment keeps its old `displayName`. Change a live segment on the Connect API tab instead.
{% endcapture %}
{% capture update_metadata %}
### Metadata API update of the definition

Send `updateMetadata` with the complete record from the Create tab, with only the changed value edited. The live run changed `masterLabel` to `Customer Definition Updated` and kept the pipeline and type:

```xml
<met:updateMetadata>
  <met:metadata xsi:type="met:MarketSegmentDefinition" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <met:fullName>CustomerDefinition</met:fullName>
    <met:includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</met:includeCriteria>
    <met:masterLabel>Customer Definition Updated</met:masterLabel>
    <met:segmentType>DBT</met:segmentType>
  </met:metadata>
</met:updateMetadata>
```

The answer is `success` `true`. `readMetadata` then shows the new label and the unchanged pipeline. An SQL change inside the pipeline works the same way: the live run changed the label and added `AND <field> IS NOT NULL` in one call, and `readMetadata` returned both. For a UI definition, a new value in the criteria JSON was saved too. These calls change the definition only, not a live segment.

On the definition of a live, published segment, a label change also answers `success` `true` and `readMetadata` shows it, but the runtime read on the Connect API tab keeps the old `displayName`: the two views then disagree. Change a live segment on the Connect API tab instead.
{% endcapture %}
{% include operation-tabs.html id="segments-update" label="Update" cli_state="available" cli_reason="Changes the label, SQL or UI criteria of a definition. On a live segment only the definition changes, not the runtime label. Unchanged does not mean that nothing was written." cli_body=update_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with updateMetadata: label, SQL and UI criteria changes. On a live segment only the definition changes, not the runtime label." metadata_body=update_metadata connect_state="available" connect_reason="Native API68 full-definition PATCH for the label and description." connect_body=update_connect plugin_state="available" plugin_reason="Sends the edited JSON and SQL files as one PATCH; Salesforce decides." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one owned segment on API68, selected by name. The preview reads only. Check in the preview that it names the segment you intend to delete; the delete takes no confirmation flag.

```sh
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --api-version 68.0 --preview
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --api-version 68.0
```

The selector must be exactly `segment:<Name>`. The segment is read from the org by that name before anything is deleted, also by the preview, and must pass fresh identity, definition and segment-on DMO checks; a segment the org does not have reports `unchanged`. Delete runs at API 68 (the default) in the default data space. Unknown outcomes are never replayed.

After the org confirms the deletion (or accepts it and is still deleting), the command removes the segment's files: `data360/segments/OwnedSegment.segment.json` and every `OwnedSegment.segment.*.sql` beside it, in the current project. Pass `--keep-local-files` to keep them. The preview removes nothing and lists each file as `Planned local file removal: <path>`. A failed removal keeps the confirmed org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`. Deletion removes no shared unified DMO or membership table.

The output reads (offline-tested; derived from the command's output code):

```text
Delete: success.
deleted segment OwnedSegment
removed local file <path of the .segment.json file>
removed local file <path of each .sql file>
```

An outcome that cannot be confirmed ends with `SEGMENT_DELETION_UNCONFIRMED`; read the segment instead of deleting again.
{% endcapture %}

{% capture delete_connect %}
### Native API68 delete

Deletes the live segment with a DELETE request, then checks that it is gone. Delete only segments you own.

The plugin sends a DELETE without a body. The Salesforce CLI needs a body entry for DELETE, so save `segment-delete.json` with an explicit empty raw body:

```json
{ "url": "/services/data/v68.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --include
sf api request rest '/services/data/v68.0/ssot/segments/ActiveCustomers' --target-org TARGET_ALIAS --include
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0
```

The DELETE answers HTTP 204 without a body. That alone does not prove absence. Confirm with the GET that the segment answers HTTP 404, and with the list command that its definition is gone:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "Segment not found: ActiveCustomers" }]
```

If the GET still returns the segment, read it again; do not send another DELETE. Do not delete shared unified DMOs or membership tables as extra cleanup. This request writes no local files.

**Known failures:**

- A DELETE without a body can fail in the CLI with a missing `mode` error. Use the whole-request file shown above.
{% endcapture %}

{% capture delete_cli %}
Deletes a definition-only segment with a deletion manifest that your integration supplies. Use it only on an owned definition.

Use the empty `manifest/package.xml` and this `manifest/destructiveChangesPost.xml`:

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
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf org list metadata --metadata-type MarketSegmentDefinition --target-org SOURCE_ALIAS --api-version 65.0
```

Check that the deletion completed, and that `CustomerDefinition` is absent from the list. This removes the definition only. The XML file stays on your computer. One manifest can name DBT and UI definitions together.

**Known failures:**

- The definition of a live segment cannot be deleted this way: the deploy fails with "This market segment definition is referenced elsewhere in Salesforce" and names the segment. Delete a live segment on the Connect API tab; that removes its definition too.
{% endcapture %}
{% capture delete_metadata %}
### Metadata API delete of the definition

Send `deleteMetadata` with the type and the definition name. Use it only on an owned definition.

```xml
<met:deleteMetadata>
  <met:type>MarketSegmentDefinition</met:type>
  <met:fullNames>CustomerDefinition</met:fullNames>
</met:deleteMetadata>
```

The answer is `success` `true`. Confirm with reads: `readMetadata` returns an empty record and `listMetadata` no longer shows the name. The definition of a live segment is refused: `success` `false` with `DEPENDENCY_EXISTS` ("referenced elsewhere in Salesforce"), and the segment stays `ACTIVE`. For a live segment, use the Connect API tab; its DELETE removes the definition too.
{% endcapture %}
{% include operation-tabs.html id="segments-delete" label="Delete" cli_state="available" cli_reason="Deletes an owned definition without a live segment with a destructive deploy. The definition of a live segment is refused." cli_body=delete_cli split_api=true metadata_state="available" metadata_reason="Tested at API 68.0 with deleteMetadata on a definition without a live segment. The definition of a live segment is refused (DEPENDENCY_EXISTS)." metadata_body=delete_metadata connect_state="available" connect_reason="Native API68 DELETE of an owned live segment, then checks that it is gone." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one owned segment selected by name, after a preview (see Evidence)." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

Do not replay an update with an unknown outcome; reconcile it with reads.

`--include` prints HTTP status and headers alongside the server body. DELETE can return HTTP `204` without a body. Confirm that GET returns HTTP `404` / `ITEM_NOT_FOUND` and the exact metadata member is absent.

**Verification scope:** Live-org reads and the bounded operations described above were tested. This badge does not verify untested writes or general CRUD support. API 65 Metadata (XML) workflows in the CLI tabs remain separate evidence from the native API 68 Connect and plugin workflows.

**Native API 68 plugin (one org):** Created segments from the JSON and SQL files, retrieved them back with the SQL file byte-equal, reported a repeat retrieve `unchanged`, updated one by an SQL-only edit, and deleted them, which also removed the local JSON and SQL files; a follow-up GET answered `ITEM_NOT_FOUND`. Salesforce refused an unqualified column ("Expected a fully qualified column name") and a table alias ("Need api name of DMO") with HTTP 400; the same SQL with fully qualified columns created, updated and round-tripped. A segment whose description is empty is returned without `description`; the plugin reads that as an empty description. `created segment ... (server is still processing)` acknowledges queued configuration, not completed computation, and `--allow-processing` acknowledges possible server work even for empty-result SQL and `NO_REFRESH`. A delete confirmed by GET 404 removed no shared membership DMO; generated-resource, physical storage and credit cleanup remain unproven. Unknown outcomes stop without replay, retry, fallback or rollback.

**Update outcomes:** An update can end `SEGMENT_UPDATE_UNCONFIRMED` while later reads show the segment `ACTIVE` with the change preserved. The command outcome stays unknown; later success does not change it. Do not replay an uncertain write. Reconcile it with reads.

**Rejected payloads (API 65, source-only):** Five tested variants were rejected. They are observed results, not universal API constraints:

- A POST with the array directly at `includeDbt.models` (instead of `includeDbt.models.models`) was rejected as an unexpected array.
- A label and description PATCH without `segmentType` was rejected with a `segmentType` requirement.
- Adding only `segmentType: Dbt` to that sparse PATCH still failed a validation of referenced columns. The accepted PATCH is the full definition shown on the Connect API tab.
- A full-definition PATCH that resends `NoRefresh` without schedule information was rejected because the schedule information was not cleared. The plugin leaves the schedule fields out of the PATCH and sends `NoRefresh` only on create.
- A schedule information body with the frequency `None` was rejected during subtype parsing.

**Label and description update (API 65):** In one owned DBT update, separate reads observed `PROCESSING`, then `COUNTING`, then `ACTIVE`, without intervention. `COUNTING` was neither final success nor proof of failure. The `ACTIVE` read came about nine minutes after the observed `COUNTING` read. The exact transition time between those checks is unknown. Independent runtime and standard XML retrieval then confirmed the new label and description, the original model, SQL and type, the identities, the data space, the segment-on object, the schedule and lookback, and the generated membership references. The description is runtime-only. The XML label agreed with the runtime label. The first command had already stopped with an unknown outcome, and later settlement does not make that command successful. This result does not establish arbitrary preservation of omitted fields, general SQL or UI criteria updates, or schedule and lookback editing.

A separate source-only existing-owner check correlated the runtime segment and its Metadata definition as one stable pair. Comparing with the unchanged desired definition found nothing more to apply. Read and compare both views before you PATCH. This is bounded stable-owner and readback evidence, not a guarantee that an identical API PATCH is mutation-free, and not proof that the definition can be deployed to another org unchanged.

**Qualified predicate change (source-only, API 65):** One separate source-only native API 65 update was verified. It changed an existing owned, ACTIVE, single-model DBT segment in the default data space. The selected field was bound to the same PROFILE object's primary key. Starting from `WHERE 1 = 0`, the only SQL change appended `AND <same selected object.field> IS NOT NULL`:

```sql
SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0 AND UnifiedCustomer__dlm.CustomerKey__c IS NOT NULL
```

The object and field above are placeholders. Use the existing selected object and its verified primary field. Keep the model name, label, description, segment-on object and full definition from the label update. Change only the SQL. Omit the schedule fields as shown above. Get permission for possible processing before the PATCH. The false predicate and `NO_REFRESH` do not guarantee that no processing happens.

After **one PATCH**, independent runtime GET returned **ACTIVE** with the exact desired SQL. A separate standard Metadata retrieval confirmed that same SQL in the definition. The label, owner identities, generated membership references, `NO_REFRESH`, `P90D` and the PROFILE primary-field binding were preserved. This is not audience membership or successful computation. It does not qualify the reverse change, another predicate or field, simultaneous SQL and label changes, arbitrary SQL, UI criteria, CREATE or cross-org replay. A separate source-only existing-owner check kept the same runtime and metadata identity pair. An unchanged comparison repeat kept that pair and the full configuration. Read and compare the current definition before you write. This result does not prove that an identical PATCH is mutation-free.

**Route-specific SQL limits:** Salesforce's [native DBT validation guide](https://developer.salesforce.com/docs/data/connectapi/guide/features_cdp_dbt_validations.md) documents WHERE-only single-column subqueries and an optional key-qualifier join condition. The separately discovered MCP segment-create description disallows subqueries and compound join conditions. The discovery contract's API version was not supplied. Do not transfer these rules between the native examples on this page, the org-local API 67 MCP route and hosted MCP. Treat neither description as qualification of broader SQL edits.

**Runtime and XML routes:** The native runtime POST creates a live segment. Unlike saving XML alone, it can begin processing immediately, even with `NoRefresh` and empty-result SQL. The XML create and delete are verification-database rows at API 65, and so are the label and SQL updates. The standard CLI and the Metadata API also wrote UI definitions (create, criteria change, delete) without creating a live segment; the plugin's UI segment round trip below writes a live one, for one simple criterion. Saving XML alone need not create a usable live segment.

**CLI scope:** The UI retrieval example in the Read chapter shows the XML shape only; its criteria are omitted. Unchanged is not zero writes: a deployment job still runs and package metadata can change. Require independent inventory absence of `CustomerDefinition` as well, after the deletion.

**Standard CLI at API 68.0:** `sf org list metadata --metadata-type MarketSegmentDefinition` lists the definitions, and `sf project retrieve start` saved one by name (CLI 2.151.7). The create and delete XML workflows above were run at API 65.0: the deploy reported success, a retrieve matched the file, and after the destructive deploy the list no longer showed the definition.

**Standard CLI create, update and delete (API 65.0, CLI 2.151.7, one org, 2026-11-16):** One deploy created a new DBT definition and a new UI definition. A second deploy changed both labels, a third the DBT SQL (one added `IS NOT NULL` condition) and the UI criteria value; each reported `changed` `true`, and a retrieve after each matched the files. An identical fourth deploy reported `changed` `false`. One `--post-destructive-changes` deploy deleted both, and the list held the same definitions as before. The Connect segment read answered `ITEM_NOT_FOUND` after every step: no live segment, processing, publication or activation followed.

**Metadata API create, update and delete (API 68.0, one org, 2026-11-16):** `createMetadata`, `updateMetadata` (label only) and `deleteMetadata` on one new single-model DBT probe definition each answered `success` `true`. After each call, `readMetadata` and `listMetadata` confirmed the result, and the Connect segment read answered `ITEM_NOT_FOUND` every time: no live segment, publication or activation followed. After the delete the definition was gone from both views, and the list held the same five definitions as before the run. A second run repeated this with a label-and-SQL change on a new DBT definition and with a new UI definition (create, criteria value change, delete); every call answered `success` `true` and no live segment followed.

**Definition of a live segment (one org, 2026-11-16):** A DBT segment created with the Connect POST and published once has a `MarketSegmentDefinition` of the same name, which `readMetadata` and `listMetadata` return. `updateMetadata` and a standard CLI deploy (API 65.0) of a new label each succeeded and changed the definition, but the Connect read kept the old `displayName` and `lastModifiedDate`. `deleteMetadata` and a CLI `--post-destructive-changes` deploy were both refused with `DEPENDENCY_EXISTS`, and the segment stayed `ACTIVE`. The Connect DELETE then answered `204`; the segment read answered `ITEM_NOT_FOUND` and the definition was gone from `listMetadata`.

**UI segment (native API 68 plugin, one org):** Created a UI segment from a hand-written JSON file with one text comparison (`operator` `equal`, a `values` list), retrieved it with the criteria Salesforce normalized, reported a repeat deploy `unchanged`, updated the criteria value and the lookback (`P90D` to `P30D`), and deleted it by name; a follow-up GET answered `ITEM_NOT_FOUND`. The plugin writes UI segments with `segmentCreationFlow` `Headless`, which the API requires. The first update attempt, about a minute after the create while the segment was still `PROCESSING`, was refused with HTTP 403 `ENTITY_SAVE_ERROR` and nothing was written; the same deploy succeeded once the segment was `ACTIVE`. A later run (2026-11-16) showed Salesforce's text: a raw PATCH right after the create answered "Segment cannot be updated when it is in PROCESSING state", and a plugin update a few seconds after a create reported "... when it is in COUNTING state" as `rejected`; a read showed the segment unchanged.

**Publish and members:** One owned one-member segment was published once with the Connect API and its members read, and one owned zero-member segment was published with `sf data360 publish` (`SUCCESS` after 922 seconds, API 68, 2026-11-17); see [Segment members](/next/data-cloud-devops/segment-members/#update).

**Outside these probes:** Cross-org replay of XML definitions and cross-org migration need a second org. UI criteria with several filters or related objects, UI exclusion criteria and UI refresh schedules, send destinations and activations, and a released package were not tried: these probes run no schedule, activation or package.

**Error codes:** `ITEM_NOT_FOUND` is returned by the GET after a successful delete. A successful XML deploy can still leave the runtime GET returning `ITEM_NOT_FOUND`.

</details>