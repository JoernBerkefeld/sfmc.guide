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
  read: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "partial", methods: [cli, api, plugin] }
  update: { status: "partial", methods: [cli, api, plugin] }
  delete: { status: "partial", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

A **segment** selects an audience by rules. Publishing prepares it for use. Refreshing recalculates it. Activation sends the audience to a destination.

A **unified DMO** holds the combined customer profiles from identity resolution. Use an existing one, with its real key.

A **UI** segment is built in Salesforce's visual interface. A **DBT** segment is defined with SQL.

**Example used in the chapters:** `ActiveCustomers`, a DBT segment on `UnifiedCustomer__dlm` with an empty audience (`WHERE 1 = 0`). The file-based examples use `OwnedSegment` and `CustomerDefinition` instead.

**Processing:** Creating or changing a live segment can start processing, even with `NoRefresh` and an empty audience. Get permission for that before you write.

{% include crud-summary.html %}

**Plugin qualification:** The `sf-plugin-data` tabs cover the bounded cases tested for one owned segment, not every segment.

## Read

{% capture read_plugin %}
Saves the segment as one JSON file. You can use that file for the Create, Update and Delete commands.

```sh
sf data360 retrieve --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --api-version 68.0 --output-dir retrieved
```

The file is written to `data360/segments/OwnedSegment.segment.json`. It has no companion Segment XML. The default is API68 (version 68.0). Repeating the command saves the same bytes and reports the file as unchanged.

Runtime IDs are not portable between orgs. A sample of the saved file is not in this guide yet.
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

Reads the segment's runtime settings with a GET request. Nothing in the org changes.

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS
```

The response wraps the segment in a `segments` array:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

The lookback is the time window the segment uses. `P90D` means 90 days. Check the returned value rather than assuming it. Check the segment name, SQL, type, data space, segment-on object, lookback and schedule. This request does not write an XML file. For audience rows, see [Segment members](/next/data-cloud-cli/segment-members/#read).
{% endcapture %}
{% include operation-tabs.html id="segments-read" label="Read" cli_state="available" cli_reason="Saves the XML definition. Runtime settings and audience rows are not included." cli_body=read_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Reads runtime settings, not an XML file or audience rows." connect_body=read_connect plugin_state="available" plugin_reason="Saves one JSON file for a single DBT segment (see Evidence)." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the segment from a saved JSON file on API68, if it does not exist yet. Preview first; the preview writes nothing.

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --allow-processing
```

Use the exact file from the Read chapter in a project you own. Do not reuse a source record ID. Create the dependencies in the target org first.

The output acknowledges queued configuration, not completed computation. A sample of the full output is not in this guide yet.

**Known failures:**

- A segment name that already exists is refused.
- If the result is unclear, do not send it again. Read the segment first.
{% endcapture %}

{% capture create_connect %}
Creates a live DBT segment with a POST request. Salesforce queues the work, so the segment starts in `PROCESSING`.

Save `segment-create.json`, using your own unified DMO, key and model name:

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
sf api request rest '/services/data/v65.0/ssot/segments' --method POST --body '@segment-create.json' --target-org TARGET_ALIAS
```

The response looks like this:

```json
{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "includeDbt": { "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }] } }
```

The request nests the models as `includeDbt.models.models`. The response returns `includeDbt.models` as an array. Do not send the response back as input. `P90D` is the lookback this example returned, not a required value.

Check the segment with a read after the create. Wait for processing to settle before you change it.
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
{% include operation-tabs.html id="segments-create" label="Create" cli_state="available" cli_reason="Saves a DBT segment definition as XML. It does not prove that a live segment exists." cli_body=create_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Creates a live DBT segment. It can start processing." connect_body=create_connect plugin_state="available" plugin_reason="Creates a missing segment from saved JSON, then reads it back (see Evidence)." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Changes the description in the saved JSON file on API68, then deploys it. Preview the exact file before you run the deploy.

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --allow-processing
```

Change only the description. Keep the other settings and bindings as they were saved. Running the same deploy again, after the segment settles, writes nothing.

A sample of the output is not in this guide yet.
{% endcapture %}

{% capture update_connect %}
Changes the label and description with one PATCH request. Send the full definition, not only the changed fields.

Save `segment-update.json`. The schedule fields are left out on purpose, so the existing schedule stays:

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
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method PATCH --body '@segment-update.json' --target-org TARGET_ALIAS
```

The response shows the segment while it processes:

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

Read the segment again until it is `ACTIVE`. Then compare the new label and description with the values you sent. Check that the other values did not change. Do not send an unclear update again. Read the segment first.

Only the label and description were tested with this request. A predicate change has its own narrow scope (see Evidence).
{% endcapture %}

{% capture update_cli %}
Changes only `masterLabel` in the owned DBT XML file, then deploys it. Keep the criteria, model, SQL and type as they are.

Change `masterLabel` to `Customer Definition Updated`:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

The deploy reports the label change. An identical repeat can report `Unchanged`. The deploy job still runs in that case.

A sample of the output is not in this guide yet.
{% endcapture %}
{% include operation-tabs.html id="segments-update" label="Update" cli_state="available" cli_reason="Changes only the DBT label in the XML file. Unchanged does not mean that nothing was written." cli_body=update_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Changes the label and description with one full-definition PATCH." connect_body=update_connect plugin_state="available" plugin_reason="Changes the description in the saved file and deploys it (see Evidence)." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes one owned segment on API68, after a preview and an explicit confirmation. The preview reads only. Check that the file matches the segment you intend to delete.

```sh
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --confirm-delete
```

The segment's identity and configuration must match the saved file. Local files stay on your computer after deletion. A sample of the output is not in this guide yet.
{% endcapture %}

{% capture delete_connect %}
Deletes the live segment with a DELETE request, then checks that it is gone. Delete only segments you own.

Save `segment-delete.json`:

```json
{ "url": "/services/data/v65.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --include
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --include
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0
```

The DELETE returns no body when it succeeds. Confirm with the GET that the segment is not found, and with the list command that its definition is gone. A check result for the GET looks like this:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "<segment not found>" }]
```

Do not delete shared unified DMOs or membership tables as extra cleanup. Local files stay on your computer.
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

Check that the deletion completed, and that `CustomerDefinition` is absent from the list. This removes the definition only. The XML file stays on your computer.

A sample of the output is not in this guide yet.
{% endcapture %}
{% include operation-tabs.html id="segments-delete" label="Delete" cli_state="available" cli_reason="Needs a deletion manifest that your integration supplies." cli_body=delete_cli split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Deletes the owned live segment, then checks that it is gone." connect_body=delete_connect plugin_state="available" plugin_reason="Deletes one owned segment after a preview and confirmation (see Evidence)." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

The first command had already stopped with an unknown outcome: later API settlement does not retroactively make that command successful. Do not replay an update with an unknown outcome; reconcile it with reads.


`--include` prints HTTP status and headers alongside the server body. DELETE can return HTTP `204` without a body. Confirm that GET returns HTTP `404` / `ITEM_NOT_FOUND` and the exact metadata member is absent.

**Verification scope:** Live-org reads and the bounded operations described above were tested. This badge does not verify untested writes or general CRUD support. API 65 Metadata and native workflows in the chapters remain separate evidence from the API 68 plugin workflow.

**Live receipts:** Live results come from installed receipts. They bind distinct worktree tarballs. They do not cover the final offline guard refinement or a released package.

**Native JSON API 68 plugin, Read:** Installed source and default acceptance saved one portable JSON file. Repeating retrieval was byte-stable and reported unchanged. Same-version DMO detail and Metadata reads validated the selected PROFILE model and the text primary field. This is not a Segment XML retrieval. Qualification is limited to one selected single-model DBT segment with an empty audience, `NO_REFRESH` and `P90D`. Runtime and private IDs are not portable source identities. Neither this read nor the later writes prove general SQL, UI criteria, cross-org deployment or a released artifact.

**Native JSON API 68 plugin, Create:** Installed API 68 and default acceptance observed a zero-write preview. It then observed one POST 201 with `PROCESSING`. An independent full GET 200 confirmed the configuration, the private identities and the generated membership references. A later GET observed `COUNTING`. The output `created segment ... (server is still processing)` acknowledges queued configuration, not completed computation. `--allow-processing` acknowledges possible server work, even for empty-result SQL and `NO_REFRESH`. Only authoritative exact native absence permits one CREATE. An existing target takes the bounded UPDATE path. Lookup errors stop the command rather than falling through. A separate native duplicate-name experiment returned HTTP 409. It is not installed duplicate-create acceptance. Conflict or uncertain writes must not trigger PATCH, upsert, retry, fallback or rollback. Reconcile uncertain outcomes with reads. This is not lower-version JSON CREATE, populated-audience or cross-org qualification.

**Native JSON API 68 plugin, Update:** Installed API 68 and default acceptance demonstrated one description-only PATCH. It had a positive PROCESSING acknowledgement. An independent full GET confirmed the desired definition and every setting that was not edited. `updated segment ... (server is still processing)` means queued configuration acceptance, not finished computation. Complete reads of the desired definition during `COUNTING` do not prove audience correctness. A settled, identical deploy without `--allow-processing` was a zero-configuration-write no-op.

**Native JSON API 68 plugin, Delete:** Installed API 68 and default acceptance proved a zero-write preview and an unconfirmed rejection. It then sent exactly one DELETE204. An internal independent exact GET404 followed, and a separate external exact GET404 confirmed the result. HTTP 204 alone is not terminal absence. No shared membership DMO was deleted. Generated-resource, physical storage and credit cleanup remain unproven. The later conservative fresh-predispatch processing guard is offline-qualified only, not separately installed or live-tested. Preserved DELETING and new PROCESSING acknowledgement branches are synthetic-only. The installed deletion reached terminal 404 and did not exercise those branches. Pre-existing PROCESSING is not proof of deletion progress. Unknown outcomes stop without replay, retry, fallback or rollback. No lower-version JSON DELETE, exhaustive external-consumer exclusion or general cross-org qualification is claimed. Local files remain after deletion.

**Installed UPDATE outcomes:** Installed UPDATE attempts that returned `SEGMENT_UPDATE_UNCONFIRMED` were later followed by ACTIVE preservation reads. Those command outcomes stay failed or unknown. Later success does not change them. Do not replay an uncertain write. Reconcile it with reads.

**Label and description update (API 65):** In one owned DBT update, separate reads observed `PROCESSING`, then `COUNTING`, then `ACTIVE`, without intervention. `COUNTING` was neither final success nor proof of failure. The `ACTIVE` read came about nine minutes after the observed `COUNTING` read. The exact transition time between those checks is unknown. Independent runtime and standard XML retrieval then confirmed the new label and description, the original model, SQL and type, the identities, the data space, the segment-on object, the schedule and lookback, and the generated membership references. The description is runtime-only. The XML label agreed with the runtime label. The first command had already stopped with an unknown outcome, and later settlement does not make that command successful. This result does not establish arbitrary preservation of omitted fields, general SQL or UI criteria updates, or schedule and lookback editing.

A separate source-only existing-owner check correlated the runtime segment and its Metadata definition as one stable pair. Comparing with the unchanged desired definition found nothing more to apply. Read and compare both views before you PATCH. This is bounded stable-owner and readback evidence, not a guarantee that an identical API PATCH is mutation-free, and not proof that the definition can be deployed to another org unchanged.

**Qualified predicate change (source-only, API 65):** One separate source-only native API 65 update was verified. It changed an existing owned, ACTIVE, single-model DBT segment in the default data space. The selected field was bound to the same PROFILE object's primary key. Starting from `WHERE 1 = 0`, the only SQL change appended `AND <same selected object.field> IS NOT NULL`:

```sql
SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0 AND UnifiedCustomer__dlm.CustomerKey__c IS NOT NULL
```

The object and field above are placeholders. Use the existing selected object and its verified primary field. Keep the model name, label, description, segment-on object and full definition from the label update. Change only the SQL. Omit the schedule fields as shown above. Get permission for possible processing before the PATCH. The false predicate and `NO_REFRESH` do not guarantee that no processing happens.

After **one PATCH**, independent runtime GET returned **ACTIVE** with the exact desired SQL. A separate standard Metadata retrieval confirmed that same SQL in the definition. The label, owner identities, generated membership references, `NO_REFRESH`, `P90D` and the PROFILE primary-field binding were preserved. This is not audience membership or successful computation. It does not qualify the reverse change, another predicate or field, simultaneous SQL and label changes, arbitrary SQL, UI criteria, CREATE or cross-org replay. A separate source-only existing-owner check kept the same runtime and metadata identity pair. An unchanged comparison repeat kept that pair and the full configuration. Read and compare the current definition before you write. This result does not prove that an identical PATCH is mutation-free.

**Route-specific SQL limits:** Salesforce's [native DBT validation guide](https://developer.salesforce.com/docs/data/connectapi/guide/features_cdp_dbt_validations.md) documents WHERE-only single-column subqueries and an optional key-qualifier join condition. The separately discovered MCP segment-create description disallows subqueries and compound join conditions. The discovery contract's API version was not supplied. Do not transfer these rules between the native API 65 examples, the org-local API 67 route and hosted MCP. Treat neither description as qualification of broader SQL edits.

**API 65 runtime route:** The API 65 runtime route creates a live segment. Unlike saving XML alone, it can begin processing immediately. `NoRefresh` can move a segment from `PROCESSING` to `ACTIVE`. Empty-result SQL does not prevent scanning or processing. The XML writes cover source-only API 65 DBT Metadata definition CRUD. Retrieving UI criteria does not establish writes to UI definitions. Saving XML alone need not create a usable live segment.

**CLI scope:** The UI retrieval example in the Read chapter shows the XML shape only; its criteria are omitted. Unchanged is not zero writes: a deployment job still runs and package metadata can change. Require independent inventory absence of `CustomerDefinition` as well, after the deletion.

**Not verified:** Cross-org replay of XML definitions. Deployment of XML definitions without processing. UI criteria writes. General SQL beyond the predicate change above. Send destinations, membership export and cross-org migration. Lower-version JSON CRUD. A released package.

**Error codes:** `ITEM_NOT_FOUND` is returned by the GET after a successful delete. A successful XML deploy can still leave the runtime GET returning `ITEM_NOT_FOUND`.

</details>