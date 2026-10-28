---
layout: page
title: "Data Model Object (DMO) | Data Cloud with Salesforce CLI"
description: "Salesforce CLI workflows and verified operation limits for Data Model Object (DMO): CustomObject, __dlm."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-model-object/
verification: verified
platforms:
  - next
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-model-object-dmo-customobject-dlm"></a>

**Data Model Object (DMO)** — `CustomObject` with the `__dlm` suffix.

A DMO is the model your data is mapped into, such as a customer or order. It uses the suffix `__dlm`. Salesforce CLI treats its definition as a `CustomObject`, with a separate XML file for each field.

## Retrieve

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

## Create

Creating a DMO by deploying its XML has **not been verified**. Downloading an object does not mean you can recreate it that way.

A native API `65.0` `POST /services/data/v65.0/ssot/data-model-objects` returned HTTP `201` for a newly owned custom DMO in category `Other`, default dataspace, with a Text primary key, two nonprimary Text fields and four generated system/key-qualifier fields. This was an empty object without mappings or relationships. That bounded creation supported the additive update test below; it is not a general XML-deployment or arbitrary-schema creation recipe.

## Update

General DMO XML updates, including schema changes through Metadata API, have **not been verified** either. A separate native API `65.0` fields-only PATCH did add **one nonprimary Text field** to the newly owned, empty custom `Other`/default DMO described above. It was not mapped or related, and its existing fields were not dynamic lookups.

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

## Delete

The deletion route is limited to an **empty custom DMO that you own**, after a fresh dependency check. It can also delete the DMO's sole owned mapping. It does not delete the DLO, and it is not a safe recipe for arbitrary business objects or shared dependencies.

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
