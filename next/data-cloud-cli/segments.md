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
  retrieve: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "partial", methods: [cli, api, plugin] }
  update: { status: "partial", methods: [cli, api, plugin] }
  delete: { status: "partial", methods: [api, plugin] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Native JSON qualification:** the optional `sf-plugin-data` tabs document bounded API68/default retrieval, creation, update and deletion. They are custom plugin/API workflows, not out-of-the-box resource-specific Salesforce CLI support. Installed receipts bind distinct earlier worktree tarballs, not the final offline guard refinement or a released package. Historical API65 Metadata/native workflows below remain separate evidence. This November 8 documentation reconciliation uses November 7 installed live receipts and adds no org calls.

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

A **segment** selects an audience using rules. Publishing prepares it for use; refreshing recalculates it, while activation sends data to a destination. These are distinct from saving the definition. A **unified DMO** contains the combined profiles produced by identity resolution; use an existing one with its actual key.

The examples distinguish `UI` criteria built in Salesforce's visual interface from `DBT`/`Dbt`, a SQL-based pipeline representation. You do not need to install a separate dbt command-line tool for the requests here. **CRUD** simply abbreviates create, read, update and delete.

`MarketSegmentDefinition` is the Metadata API XML definition of the **same segment**, not a separate segment type. Standard metadata commands supply the XML CLI workflow; runtime requests use Salesforce CLI as an authenticated API request runner. Saving XML alone need not create a usable live segment. The XML writes cover **source-only API 65 DBT Metadata definition CRUD**; cross-org replay and deployment without processing have not been verified. Being able to retrieve UI criteria does not establish UI-definition writes.

This API 65 runtime route creates a live segment. Unlike saving XML alone, it can begin processing immediately: **`NoRefresh` can transition `PROCESSING` → `ACTIVE`**. Empty-result SQL does not prevent scanning or processing either. Get permission for those effects before creating or updating a segment.

The example does not set up a send destination, export members or prove cross-org migration.

**Route-specific SQL limits:** Salesforce's [native DBT validation guide](https://developer.salesforce.com/docs/data/connectapi/guide/features_cdp_dbt_validations.md) documents WHERE-only single-column subqueries and an optional key-qualifier join condition. The separately discovered MCP segment-create description is narrower: it disallows subqueries and compound join conditions. The native guide's API version and the discovery provider's underlying API version were not supplied. Do not transfer those rules between native API 65 examples, the API 67 org-local facade and hosted MCP, or treat documentation as live qualification of broader SQL edits.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_plugin %}
### Native JSON API68 retrieval

```sh
sf data360 retrieve --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --api-version 68.0 --output-dir retrieved
```

This optional **sf-plugin-data** workflow saves `data360/segments/OwnedSegment.segment.json`, with no companion Segment XML. Default/`auto` selects API68. Installed source/default acceptance saved one portable JSON; repeating retrieval was byte-stable and reported unchanged. Same-version DMO detail and Metadata reads validate the selected PROFILE model and Text primary field; this is not a Segment XML retrieval.

Qualification is limited to the selected single-model DBT empty-audience definition with `NO_REFRESH`/`P90D`. Runtime/private IDs are not portable source identities. Neither this read nor the later writes prove general SQL, UI criteria, cross-org deployment or a released artifact.
{% endcapture %}

{% capture retrieve_cli %}
### Save the XML definition

For an existing segment:

```sh
sf project retrieve start --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
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
<a id="read-runtime-state-through-the-cli"></a>

### Read runtime state through the API

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS
```

The **lookback** is the time window used by the segment; `P90D` is duration notation for 90 days. Check the returned value rather than assuming every segment uses it.

GET wraps the segment in a `segments` array:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

Check the exact segment, SQL/model, type, dataspace, segment-on object, lookback and schedule. Wait for processing to settle before the next change. REST does not write the XML file for you. For audience rows rather than configuration, see [Segment members](/next/data-cloud-cli/segment-members/#retrieve).

{% endcapture %}
{% include operation-tabs.html id="segments-retrieve" label="Retrieve" cli_state="available" cli_reason="Save the XML definition; runtime settings and audience rows are not included." cli_body=retrieve_cli api_state="available" api_reason="Read runtime configuration, not an XML file or audience export." api_body=retrieve_api plugin_state="available" plugin_reason="Bounded installed native JSON API68/default retrieval and byte-stable repeat; no companion XML." plugin_body=retrieve_plugin %}

## Create

{% capture create_plugin %}
### Native JSON API68 absent-target creation

Use the exact retrieved native JSON in a separately owned, compatible project; preserve its admitted single-model DBT shape and resolve dependencies in the target. Do not replay a source record ID or treat a complete GET response as a create payload.

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --allow-processing
```

Only authoritative exact native absence permits one CREATE; an existing target takes the bounded UPDATE path, and lookup errors stop rather than fall through. Installed API68/default acceptance observed a zero-write preview, one POST201 PROCESSING and independent full GET200 confirming configuration, private identities and generated membership references. A later GET observed COUNTING. The output `created segment ... (server is still processing)` acknowledges queued configuration, **not completed computation**. `--allow-processing` acknowledges possible server work even for empty-result SQL and `NO_REFRESH`.

A separate native duplicate-name experiment returned409; it is not installed duplicate-create acceptance. Conflict or uncertain writes must not trigger PATCH/upsert, retry, fallback or rollback. Reconcile uncertain outcomes with reads. This is not lower-version JSON CREATE, populated-audience or cross-org qualification.
{% endcapture %}

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
sf api request rest '/services/data/v65.0/ssot/segments' --method POST --body '@segment-create.json' --target-org TARGET_ALIAS
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
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

**Optional structured output (`--json`) for the deployment:**

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": true, "changed": true, "success": true }] } } }
```

The second command downloads the definition for comparison. Check the decoded model/SQL, label and type. A successful deploy can still leave runtime GET returning `ITEM_NOT_FOUND`; `--dry-run` would not store anything at all. The project-wide selector above is why this project must contain no unrelated files.

{% endcapture %}
{% include operation-tabs.html id="segments-create" label="Create" cli_state="available" cli_reason="Source-only API 65 DBT definition creation; runtime creation and processing-free deployment are not established." cli_body=create_cli api_state="available" api_reason="Live API 65 DBT creation can begin processing even with NoRefresh." api_body=create_api plugin_state="available" plugin_reason="Installed API68/default absent-target JSON CREATE with independent readback and processing acknowledgement; not finished computation." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
### Native JSON API68 bounded update

Edit only the intended supported setting in the saved JSON, keeping the admitted definition and bindings intact. Preview the exact file before execution:

```sh
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 deploy --target-org SOURCE_ALIAS --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --allow-processing
```

Installed API68/default acceptance demonstrated one description-only PATCH with positive PROCESSING acknowledgement plus independent full GET confirming the desired definition and every nonedited identity/setting. `updated segment ... (server is still processing)` means queued configuration acceptance, not finished computation; complete desired-definition reads during COUNTING do not prove audience correctness. A settled identical deploy without `--allow-processing` was a zero-configuration-write no-op.

Earlier installed UPDATE attempts returned `SEGMENT_UPDATE_UNCONFIRMED` despite later independent ACTIVE preservation reads. Those failed/unknown command outcomes remain historical; later success does not retroactively change them. Do not replay an uncertain write. The separately qualified API65 forward empty-audience selected-primary-key predicate edit below is not general SQL, reverse-edit, schedule/lookback, UI-criteria or cross-org qualification.
{% endcapture %}

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
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method PATCH --body '@segment-update.json' --target-org TARGET_ALIAS
```

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

GET again until `ACTIVE`, then compare the changed label/description and all preserved values. In one owned DBT update, separate reads observed **`PROCESSING` → `COUNTING` → `ACTIVE`** without intervention. `COUNTING` was not final success or proof of failure. The later `ACTIVE` read was about nine minutes after the observed `COUNTING` read; the exact transition time between those checks is unknown.

Independent runtime and standard XML retrieval then confirmed the exact updated label/description, original model/SQL/type, identities, dataspace, segment-on object, schedule/lookback and generated membership references. Description is runtime-only; the XML label agreed with runtime. The first command had already stopped with an unknown outcome: later API settlement does not retroactively make that command successful. Do not replay an update with an unknown outcome; reconcile it with reads. This label/description result does not establish arbitrary omitted-field preservation, general SQL/UI criteria updates or schedule/lookback editing.

A separate source-org existing-owner check correlated the runtime segment and its Metadata definition as one stable pair. Repeating the comparison against the unchanged desired definition found no further change to apply. Read and compare both views before deciding whether to PATCH; skip an already-matching update yourself. This is source-only comparison-before-write evidence, not API idempotency, processing-free deployment or unchanged-source cross-org replay.

Salesforce's [native DBT validation guide](https://developer.salesforce.com/docs/data/connectapi/guide/features_cdp_dbt_validations.md) requires the segment-on primary key and any applicable key qualifiers in the projection. It documents WHERE-only, single-column subqueries and an optional key-qualifier join comparison. Those rules differ from the discovered MCP operation description; the discovery contract's API version was not supplied. Keep native API and facade/hosted-MCP validation rules separate rather than treating either description as universal. These broader SQL forms were not live-qualified by the bounded updates on this page.

### Qualified forward empty-audience predicate change

One separate **source-only native API 65** update was verified on an existing owned **ACTIVE**, single-model DBT segment in the default dataspace. Its selected field was independently bound to the same PROFILE object's primary key. Starting from the existing `WHERE 1 = 0`, the only SQL change appended `AND <same selected object.field> IS NOT NULL`:

```sql
SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0 AND UnifiedCustomer__dlm.CustomerKey__c IS NOT NULL
```

The object and field above are placeholders: use the exact existing selected object and independently verified primary field, not a different field or a newly created segment. Keep the original model name, label, description, segment-on object and complete definition from the label-update request above, changing only its SQL. Continue to omit the schedule fields as described above. Obtain permission for possible processing before PATCH; the false predicate and `NO_REFRESH` do not guarantee processing-free execution.

After **one PATCH**, independent runtime GET returned **ACTIVE** with the exact desired SQL, and separate standard Metadata retrieval confirmed that same SQL in the definition. `NO_REFRESH`, `P90D`, labels, owner identities, generated membership references and the PROFILE primary-field dependency binding were preserved. This establishes that narrow persisted definition edit, **not audience membership or successful computation**. It does not qualify the reverse change, another predicate/field, simultaneous SQL and label changes, arbitrary SQL, UI criteria, CREATE or cross-org replay. Read and compare the current definition before writing; this result does not prove that sending an identical PATCH is mutation-free.

A separate source-only existing-owner check retained the same runtime/metadata identity pair, and an unchanged comparison repeat retained that pair and the complete configuration. This is bounded stable-owner/readback evidence, not a guarantee that an identical API PATCH is mutation-free or that the definition can be deployed to another org unchanged.

{% endcapture %}
{% capture update_cli %}
### Change only the XML definition's label

In the owned DBT file, change only `masterLabel` to `Customer Definition Updated`. Keep the criteria, model, SQL and type intact:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

Check that the deployment reports the label change; optional `--json` output can report `changed: true`. An identical repeat can report `Unchanged`. **Unchanged is not zero writes**: a deployment job still runs and package metadata can change. Broader SQL/criteria edits and live segment updates are not established by this route.

{% endcapture %}
{% include operation-tabs.html id="segments-update" label="Update" cli_state="available" cli_reason="Only the owned DBT XML masterLabel change is qualified; Unchanged is not zero writes." cli_body=update_cli api_state="available" api_reason="Bounded full-definition label/description update or qualified forward empty-audience selected-primary-key predicate addition; reconcile unknown outcomes with reads." api_body=update_api plugin_state="available" plugin_reason="Installed API68/default description UPDATE and zero-write settled no-op; earlier unknown receipts retained." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
### Native JSON API68 guarded definition deletion

Supply both the exact selector and matching saved JSON. Preview performs reads only; execution requires explicit destructive confirmation:

```sh
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --preview
sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --source-dir retrieved/data360/segments/OwnedSegment.segment.json --api-version 68.0 --confirm-delete
```

Fresh identity, full configuration and dependency checks must agree with the selected source. Installed API68/default acceptance proved zero-write preview and unconfirmed rejection, then exactly one DELETE204 followed by internal independent exact GET404 and a separate external exact GET404. HTTP204 alone is not terminal absence. No shared membership DMO was deleted; generated-resource, physical storage and credit cleanup remain unproven.

The **later conservative fresh-predispatch processing guard is offline-qualified only**, not separately installed/live-tested. Preserved DELETING/new PROCESSING acknowledgement branches are synthetic-only; the installed deletion reached terminal404 and did not exercise those branches. Preexisting PROCESSING is not proof of deletion progress. Unknown outcomes stop without replay, retry, fallback or rollback. No lower-version JSON DELETE, exhaustive external-consumer exclusion or general cross-org qualification is claimed. Local files remain after deletion.
{% endcapture %}

{% capture delete_api %}
Do not delete shared unified DMOs or membership tables as extra cleanup. Previously downloaded source files remain local.

### Delete the live segment and check its definition

For the owned segment, save `segment-delete.json`:

```json
{ "url": "/services/data/v65.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --include
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --include
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0
```

`--include` prints HTTP status and headers alongside the server body. DELETE can return HTTP `204` without a body. Confirm that GET returns HTTP `404` / `ITEM_NOT_FOUND` and the exact metadata member is absent. This body excerpt excludes status and headers:

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
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
sf org list metadata --metadata-type MarketSegmentDefinition --target-org SOURCE_ALIAS --api-version 65.0
```

Require a successful completed deletion; optional `--json` output reports `deleted: true`. Require independent inventory absence of `CustomerDefinition` as well. This deletes the definition only; it does not promise runtime or generated-data cleanup. The downloaded XML remains on your computer.

{% endcapture %}
{% include operation-tabs.html id="segments-delete" label="Delete" cli_state="available" cli_reason="Owned definition-only deletion; runtime and generated-data cleanup are not promised." cli_body=delete_cli api_state="available" api_reason="Delete the owned live segment and independently confirm runtime and metadata absence." api_body=delete_api plugin_state="available" plugin_reason="Installed API68/default confirmed exact deletion; later conservative guard offline-only, transitional branches synthetic-only; not physical cleanup." plugin_body=delete_plugin %}
