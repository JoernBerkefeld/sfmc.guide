---
layout: page
title: "Data Model Object (DMO)"
description: "Salesforce CLI workflows and verified operation limits for Data Model Object (DMO): CustomObject, __dlm."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-model-object/
verification: verified
operation_tabs: true
platforms:
  - next
---

*Last updated: October 28, 2026, 19:23 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-model-object-dmo-customobject-dlm"></a>

**Data Model Object (DMO)** — `CustomObject` with the `__dlm` suffix.

A DMO is the model your data is mapped into, such as a customer or order. It uses the suffix `__dlm`. Salesforce CLI treats its definition as a `CustomObject`, with a separate XML file for each field.

## Retrieve

{% capture retrieve_cli %}
```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Look for these files:

- `force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml`
- `force-app/main/default/objects/Customer__dlm/fields/Id__c.field-meta.xml`
- Further files in `fields/` for the other fields, including system fields and lookups.

The object file contains information such as the label and dataspace:

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer</label>
  <mktDataModelAttributes>
    <creationType>Custom</creationType>
    <dataSpaceName>default</dataSpaceName>
    <!-- Other retrieved attributes omitted. -->
  </mktDataModelAttributes>
</CustomObject>
```

Keep the field files too. In particular, preserve the primary-key and key-qualifier attributes rather than trying to reconstruct them from field names. This export is not a complete set of mappings, relationships or ingestion settings. An `isEnabled` flag alone does not tell you whether processing is active.

{% endcapture %}
{% include operation-tabs.html id="dmo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the object XML and individual field definitions, not the complete data setup." cli_body=retrieve_cli api_state="unknown" api_reason="No API retrieval workflow is supplied here." %}

## Create

Creating a DMO by deploying its XML has **not been verified**. Downloading an object does not mean you can recreate it that way.

A native API `65.0` `POST /services/data/v65.0/ssot/data-model-objects` returned HTTP `201` for a newly owned custom DMO in category `Other`, default dataspace, with a Text primary key, two nonprimary Text fields and four generated system/key-qualifier fields. This was an empty object without mappings or relationships. That bounded creation supported the additive update test below; it is not a general XML-deployment or arbitrary-schema creation recipe.

{% include operation-tabs.html id="dmo-create" label="Create" cli_state="unknown" cli_reason="DMO creation by XML deployment has not been verified." api_state="unknown" api_reason="A bounded native API creation was observed, but no creation recipe is supplied." %}

## Update

General DMO XML updates, including schema changes through Metadata API, have **not been verified** either.

{% capture update_api %}
A separate native API `65.0` fields-only PATCH did add **one nonprimary Text field** to the newly owned, empty custom `Other`/default DMO described above. It was not mapped or related, and its existing fields were not dynamic lookups.

Save this addition-only body as `dmo-add-field.json` beside `force-app`, omitting all existing fields and object properties:

```json
{"fields":[{"name":"AddedValue__c","label":"Added value","dataType":"Text"}]}
```

Use the exact API name returned for your owned DMO, not a guessed name:

```sh
sf api request rest /services/data/v65.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method PATCH --include --body @dmo-add-field.json
sf api request rest /services/data/v65.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

The PATCH returned HTTP `200`, but its response still showed the old seven fields. **Do not treat the mutation echo as confirmation or replay the write.** Independent runtime GET observed eight fields about 28 seconds later and retained them at about 70 seconds; separate API 65 Metadata `CustomObject` reads independently confirmed the addition in both rounds. These timings are observations, not a settlement guarantee.

Removing only `AddedValue__c` from each readback made the entire runtime object and entire Metadata object equal to baseline, comparing fields by exact identity and without excluding unfamiliar properties. All old field properties, primary-key and key-qualifier settings, system fields, object properties and the empty relationship inventory were preserved. The new Metadata field was Text, length `60`, `required=false`, `isDynamicLookup=false`, with no primary designation.

This qualifies only that addition-only, nonprimary Text variant. Do not add primary/dynamic flags, descriptions, category changes or mixed edits to this request. Populated, mapped or related DMOs, other types/categories/dataspaces/API versions, arbitrary schema changes and universal nullable/default semantics remain **unverified**. The test object was retained; no deletion or processing/ingestion claim follows from this update.

An existing DMO needs a separate, authoritative eligibility check before applying this empty-object-only result. Disabled or unmapped flags, ownership and schema presence do **not** prove zero records. A native SQL query against an existing DMO can return SQLSTATE `42P01` (table does not exist), even when runtime and Metadata reads find its configuration; an explicit default-data-space query can fail the same way. That error is **not** an empty result or proof that no record store exists. No authoritative zero-record or record-store-absence check was established for that nonqueryable variant, so do not use this example as a general update recipe for existing objects. Even a successful fresh zero-row query would be a point-in-time observation, not an atomic guarantee against concurrent ingestion before PATCH.

{% endcapture %}
{% include operation-tabs.html id="dmo-update" label="Update" cli_state="unknown" cli_reason="General DMO XML and Metadata API schema updates have not been verified." api_state="available" api_reason="Only the addition-only nonprimary Text-field PATCH on the qualified owned empty DMO." api_body=update_api %}

## Delete

The deletion route is limited to an **empty custom DMO that you own**, after a fresh dependency check. It can also delete the DMO's sole owned mapping. It does not delete the DLO, and it is not a safe recipe for arbitrary business objects or shared dependencies.

{% capture delete_cli %}
The integration supplies an empty `package.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

Its `destructiveChangesPost.xml` selects only the intended DMO:

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

With those files and checks in place:

```sh
sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

A completed deletion can look like this:

```json
{ "status": 0, "result": { "done": true, "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "CustomObject", "fullName": "Customer__dlm", "deleted": true, "success": true }] } } }
```

Check afterward that the exact DMO and its owned mapping are gone and the DLO remains. Downstream insights, segments, identity resolution and activations can block deletion; no single dependency list is guaranteed to show everything. Local object, field and mapping XML remain. `sf project delete source` is not an interchangeable verified alternative and would also remove local files.
{% endcapture %}
{% include operation-tabs.html id="dmo-delete" label="Delete" cli_state="available" cli_reason="Only an owned empty custom DMO after fresh dependency checks; the DLO remains." cli_body=delete_cli api_state="unknown" api_reason="No API deletion workflow is supplied here." %}
