---
layout: page
title: "Data Lake Object (DLO)"
description: "Salesforce CLI workflows and verified operation limits for Data Lake Object (DLO): CustomObject, __dll."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-lake-object/
verification: verified
operation_tabs: true
platforms:
  - next
---

*Last updated: October 28, 2026, 21:58 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-lake-object-dlo-customobject-dll"></a>

**Data Lake Object (DLO)** — `CustomObject` with the `__dll` suffix.

A DLO holds data brought in from a source, before it is mapped into the data model. It uses `__dll`, not `__dlm`. Its XML describes the lake object, not the whole connection that brings data into it. Bringing data in is **ingestion**; a **connector** supplies the connection, a **stream** controls the incoming data flow, and a **transform** reshapes data.

## Retrieve

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata CustomObject:CustomerSource__dll --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes `force-app/main/default/objects/CustomerSource__dll/CustomerSource__dll.object-meta.xml` and the individual files under `objects/CustomerSource__dll/fields/`.

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer Source</label>
  <mktDataLakeAttributes>
    <!-- Retrieved DLO attributes omitted. -->
  </mktDataLakeAttributes>
</CustomObject>
```

The response uses `type: CustomObject` and `fullName: CustomerSource__dll`. Keep the complete attributes and field definitions. Connector credentials and the rest of the ingestion setup are not included in this object export.

{% endcapture %}
{% include operation-tabs.html id="dlo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the lake object and fields, not credentials or the whole ingestion setup." cli_body=retrieve_cli api_state="unknown" api_reason="No API retrieval workflow is supplied here." %}

## Create

Creating a DLO through Metadata API has **not been verified**. Do not remove primary-key or system qualifier fields to make a deployment pass.

We did create a new, owned Ingestion API connection without external credentials, add a one-event schema with two Text fields, and create its stream and DLO. This used the **API 67 `/ssot/mcp/execute` facade through vanilla `sf api request rest`**, with operations `d360_connection_create_ingestion_api`, `d360_connection_schema_put_ingestion_api` and `d360_datastream_create_ingestion_api`—not native CLI DLO commands or native CRUD parity.

Separate connection, schema, stream and DLO reads confirmed `CONNECTED`, then stream/DLO `ACTIVE`. The tested configuration was one event, category `Other`, default dataspace, a Text primary key and `UPSERT`. Salesforce generated the returned stream/DLO names rather than using the proposed names literally. Use those returned identities. Persisted DLO fields had `__c` suffixes while embedded stream mappings used unsuffixed fields; the embedded definition ID was not the persisted DLO ID.

The DLO had six fields: the two source fields and four generated key-qualifier/system fields. The custom key-qualifier designation list was empty, so this does not establish preservation of nonempty custom qualifiers. Initial processing happened automatically, with zero records and no explicit ingestion or refresh request. This is a narrow source-only result, not a portable recipe for every connector or category.

{% include operation-tabs.html id="dlo-create" label="Create" cli_state="unknown" cli_reason="DLO creation through Metadata API has not been verified." api_state="unknown" api_reason="The owned ingestion-chain result is observational, not a supplied portable creation recipe." %}

## Update

We tried adding a Text field directly with `d360_dlo_update`. It failed because this DLO belonged to a stream: Salesforce required field addition through the Data Stream API. The facade returned HTTP `201` and CLI exit `0` with a nested error; an independent read confirmed the original six fields were unchanged.

The successful route was to read the complete owned connection schema, retain both original source fields and add one Text field with `d360_connection_schema_put_ingestion_api`, then invoke `d360_datastream_patch_ingestion_api` with the exact returned stream identity and `syncSchema: true`. These are the same API 67 facade operations called through vanilla `sf api request rest`, not Metadata API updates. The stream entered `PROCESSING`, and separate stream/DLO reads reached `ACTIVE` with seven persisted fields.

The comparison preserved all six original field definitions, including primary-key, generated qualifier and system settings, plus source bindings, original mappings/formulas and refresh configuration. Only the new Text field and its source mapping were added. Custom qualifier lists remained empty. This does not establish arbitrary field removal, type changes, direct DLO updates, nonempty custom qualifier preservation or cross-org replay. Shared connections were not changed.

A separate existing-target check confirmed the same bounded update: exactly one complete connection-schema PUT and one owning-stream schema sync added one Text field. Independent reads reached stream/DLO `ACTIVE` and preserved the full original configuration. Later read-only comparisons confirmed the three source Text fields and all seven persisted fields, including their original key/system settings, mappings and refresh configuration, with no further mutation or processing job. The successful update was **not repeated** to obtain those comparisons.

Persisted DLO reads can also include a last-refresh timestamp and a numeric record count. These are runtime observations, not schema changes or proof of a new ingestion run; in this check the count was zero. Compare the complete configuration separately from those observations and verify `ACTIVE` independently. This remains one existing-target Text-field addition in the source org—not proof of portable creation, completed deletion, populated-data behavior or cross-org deployment.

{% include operation-tabs.html id="dlo-update" label="Update" cli_state="unknown" cli_reason="No Metadata API update workflow is supplied." api_state="unknown" api_reason="Direct DLO field addition failed; owning-connection and stream updates are observations, not a supplied recipe." %}

## Delete

For the new owned ingestion chain, one owning-stream delete with `shouldDeleteDataLakeObject: true` was accepted, but separate stream and DLO reads still showed `DELETING` at the last check. The connection remained `CONNECTED` and its schema in use. This is not completed cleanup or a verified full lifecycle; do not repeat the delete or remove generated objects yourself while it is pending.

There is no verified completed standard delete recipe here. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

{% include operation-tabs.html id="dlo-delete" label="Delete" cli_state="blocked" cli_reason="The definition delete was refused because its still-existing DLO instance referenced it." api_state="unknown" api_reason="The accepted owning-stream delete remained DELETING; no completed API cleanup recipe is verified." %}
