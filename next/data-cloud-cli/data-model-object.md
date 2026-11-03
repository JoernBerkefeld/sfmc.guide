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
crud:
  retrieve: { status: "yes", methods: [cli, api, plugin] }
  create: { status: "yes", methods: [api, plugin] }
  update: { status: "yes", methods: [api, plugin] }
  delete: { status: "yes", methods: [cli, api, plugin] }
---

*Prior documentation record: November 2, 2026, 19:58 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="data-model-object-dmo-customobject-dlm"></a>

**Data Model Object (DMO)** — `CustomObject` with the `__dlm` suffix.

A DMO is the model your data is mapped into, such as a customer or order. It uses the suffix `__dlm`. Salesforce CLI treats its definition as a `CustomObject`, with a separate XML file for each field.

**API family:** The native JSON route `/services/data/vXX.0/ssot/data-model-objects`
(and its item routes) belongs to the **Data 360 Connect REST API**, independently
listed for DMOs in the
[Salesforce reference](https://developer.salesforce.com/docs/data/connectapi/references/spec).
The native API and plugin examples use this family through authenticated
`sf api request rest`, not the SOAP-based Metadata API. The CLI sections' XML
`sf project` workflows use Metadata API instead. Salesforce CLI is the authenticated
request runner here, not a dedicated out-of-the-box DMO CRUD command; endpoint
attribution does not expand the tested versions or plugin qualification below.

{% include crud-summary.html %}

**Plugin qualification:** Yes denotes the bounded standalone native DMO definition
workflow, not unrestricted schema CRUD. Public retrieve/create/update/delete were
qualified before the mapping integration. Updates cover label changes and additive
nonprimary Text fields, not key changes, field removal, arbitrary schemas,
ingestion or cross-org portability. The native API matrix below remains separate
from public-command qualification. The current implementation selects API `68.0`
for default/`auto` and admits explicit numeric versions `>=61.0` without upgrading
them; admission does not extend live-tested versions. Bounded installed API68
mixed mapping-batch acceptance also passed (see [DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/));
it does not broaden standalone DMO CRUD or its tested versions.

### Optional plugin dataspace and output

**Documentation update: November 3, 2026; no new live check.** Native commands accept
optional `--dataspace NAME`, with `--data-space` as an alias; use only one spelling.
There is no CLI default. DMO create/update includes `dataSpaceName` only when the
flag is supplied, and creating a nondefault DMO without it is refused. Fresh
response identities, the requested scope and the saved definition must agree
before mutation. DMO list, detail and delete URLs gain no extra dataspace filter.
This does not qualify nondefault-space CRUD or widen the existing empty-object,
version and dependency limits. See the
[shared scope and readable-output rules](/next/data-cloud-cli/#native-plugin-scope-and-readable-results)
for per-component actions, successful retrieval counts and deploy totals.
`--json` retains the structured result.

## Native API contracts and completed version comparison

The [Salesforce Data 360 Connect API reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) supplies the documented contract. The completed November 2, 2026 comparison independently tested native DMO CRUD sequentially at API `60.0`–`67.0` on source org `mcnext-sdo` (`00Daj000010xkZNEAY`). **API `61.0`–`67.0` each returned POST `201`, GET `200`, label PATCH `200`, additive-field PATCH `200` and DELETE `204`.** API `61.0` is the lowest live-tested successful version for each operation in this org, not a universal minimum or a plugin guard. API `68.0` DMO CRUD was not tested in this matrix.

API `60.0` returned four HTTP `404` responses (`NOT_FOUND`, `The requested resource does not exist`): POST, GET, PATCH and DELETE. The item operations targeted a verified-existing owned DMO provisioned at API `61.0`; that fallback fixture was also cleaned up via `61.0`. Its provisioning and cleanup are not API `60.0` successes.

Each successful version used its own fresh owned fixture, with no semantic request changes beyond route version, unique name and labels. POST and GET returned direct DMO objects with a `fields` array (not the DLO array wrapper). PATCH returned a direct object containing the **pre-update state**: the old label, or six fields without the added field. Separate same-version GET and Metadata retrieval, not that echo, confirmed persistence.

Creation produced six fields: `Id__c`, `Note__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c` and `KQ_Id__c`. Adding `UpdateNote` produced seven. No DLO source-version field was generated. Label PATCH changed only object XML `label`, `labelOverride` and `masterLabel`; additive PATCH added only `fields/UpdateNote__c.field-meta.xml`, leaving existing object and field XML byte-identical. Primary-index order `1` and key-qualifier attributes survived.

All matrix fixtures, including the API `60.0` fallback, were independently confirmed absent after deletion by Connect GET `404` and explicit Metadata absence. Dependency checks were deliberately scoped: the API `67.0` mapping facade returned the exact-target `Object Source Target Map not found` error, and native relationship GET at `67.0` returned HTTP `204` with no relationships. These are not exhaustive dependency discovery. The default dataspace check used read-only API `68.0`; neither auxiliary version qualifies target-version CRUD.

These results qualify only fresh, empty custom `Other`/default DMOs created without mappings, relationships or ingestion. They do not establish populated-object safety, ingestion/queryable storage, cross-org portability, Metadata deployment, key changes, arbitrary schemas or plugin implementation/acceptance. The historical seven-to-eight-field experiment below is separate; its retained fixture is not part of this matrix's cleanup claim.

### Routes and target identity

Prefix the following routes with `/services/data/v68.0/ssot` when investigating API `68.0`:

- `GET /data-model-objects` lists DMOs.
- `POST /data-model-objects` creates a custom DMO. The reference documents HTTP `200`; the historical API `65.0` trial below observed `201`. Keep those distinct rather than assuming one universal success code.
- `GET /data-model-objects/{dataModelObjectName}` reads one DMO as a direct object, not the DLO array wrapper.
- `PATCH /data-model-objects/{dataModelObjectName}` updates a custom DMO. The reference warns that its HTTP `200` response can contain the **pre-update state**. Use a separate GET to confirm persistence; do not repeat PATCH merely because its response looks old.
- `DELETE /data-model-objects/{dataModelObjectName}` documents HTTP `204`. The matrix below qualifies deletion of its fresh owned empty fixtures only, not permission to delete a business object.

The item-path parameter is documented as the **developer name**, including `__dlm`, not a promise that a source-org record ID works in that path. The input schema has no body `id`. Bind names in the target org instead of replaying source IDs. GET `404` can also mean the caller cannot access the DMO: it is not, by itself, sufficient absence evidence for automatic creation. The reference marks these standalone operations available since API `61.0`; that is documented introduction, not a live-tested minimum version.

Salesforce CLI authentication can be reused without implementing another login flow. This is a read-only request shape, not a result from this research:

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method GET --include
```

### Input, output and generated fields

Creation input uses `name`, `label`, `category`, `dataSpaceName` and `fields`. Field input uses `name`, `label`, `dataType` and `isPrimaryKey`, with properties such as `description` and `isDynamicLookup` where applicable. The documented create example sends an object name without `__dlm` and field names without `__c`; its output adds those suffixes. The exact acceptance of already-suffixed input remains a separate test, not a normalization rule inferred from the example.

**Tested casing:** API `61.0`–`67.0` accepted input category `Other` and returned `OTHER`. The same runs accepted bare object and field input names and returned `__dlm` and `__c` suffixes. This does not qualify all category spellings, already-suffixed inputs or API `68.0`. `Engagement` additionally requires `eventDateTimeFieldName`; `recordModifiedFieldName` is another documented input. `dataSpaceName` defaults to `default` when omitted and is not the DLO property's `dataspaceInfo` spelling.

Responses use field `type` where requests use `dataType`. They can include object `id`, `creationType`, editability/enabled/segmentability observations, field `keyQualifierName` and generated fields such as `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c` and a primary-key qualifier. Preserve that inventory when retrieving; construct separate create/send and update/send representations rather than posting the whole response. Omit source resource IDs, duplicate representations and response-only observations from portable input, but never remove an authored primary-key field just because its name contains `Id`.

The official create response example has `isEnabled: false`. That example alone does not establish failed DMO creation or a universal ingestion prerequisite. Definition existence, queryable record storage, mappings and ingestion are different observations; the SQL caveat in the bounded update evidence below still applies.

The [Salesforce-maintained Data 360 tooling reference](https://github.com/salesforce/sf-pi/blob/main/extensions/sf-data360/references/data-shapes.md) describes PATCH fields as additive. This is documentation, not general field-update acceptance: the live result below establishes only its exact nonprimary Text-field addition. Changing an existing key, removing fields, arbitrary types and mixed edits still need their own evidence. A documented PATCH input may contain object `name`, but the reference explicitly rejects changing the developer name; the URL identifies the target independently of any body property.

### Relationships are separate definitions

DMO field relationships use `GET` and `POST /data-model-objects/{dataModelObjectName}/relationships?dataspace=default`, documented since API `64.0`. The path names either participating DMO. Creation takes a `relationships` array with entries identifying `sourceObjectName`, `targetObjectName`, `sourceFieldName`, `targetFieldName`, `cardinality`, `creationType` and `owner`; the reference example uses `ManyToOne`, `Custom` and `DataCloud`. These are names to resolve in the target, not source record IDs. Existing relationships are documented as skipped on creation. Relationship definitions and DLO-to-DMO mappings are not automatically recreated by POSTing a standalone DMO.

### Remaining comparisons

The completed matrix includes same-version Metadata readbacks of each owned fixture, not an unchanged-source export comparison across API `65.0`–`68.0`. That comparison and a full native DMO CRUD lifecycle at `68.0` remain unverified; the separate API68 generated-qualifier CREATE/additive-PATCH evidence in the Retrieve plugin tab does not complete that matrix. A plugin version guard is not evidence of a server limitation. This documentation update reused retained evidence and ran no extra live tests.

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** `sf project` retrieves the `CustomObject` and `CustomField`
definitions; this is separate from the native Connect REST JSON route.

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
{% capture retrieve_api %}
```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

API `61.0`–`67.0` returned HTTP `200` with a direct object and `fields` array for each owned fixture. Preserve generated fields and key qualifiers; this is a definition read, not a complete ingestion/mapping/relationship export.
{% endcapture %}
{% capture retrieve_plugin %}
```sh
sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS --api-version 65.0 --output-dir ./project --json
```

Saves `./project/data360/dmo/Customer__dlm.dmo-meta.json`, omitting only the
confirmed system-generated `KQ_Id__c` field definition from the saved field inventory.
A key qualifier combines an ID with source context to avoid collisions. Native
CREATE generates this definition and additive PATCH preserves it; save omission
is not field deletion or proof of mapping auto-pair behavior. `Id__c`, other fields,
custom qualifiers and `keyQualifierName` references remain unchanged; raw API
responses remain complete. Separate API68 empirical evidence showed six raw fields
→ five saved after CREATE and seven raw → six saved after PATCH. The DMO API marks
this field `creationType=System` / `usageTag=KeyQualifier`, unlike DLO Metadata's
`usageTag=KEY_QUALIFIER`. This qualifier-policy evidence is not new live plugin
acceptance or a version-range claim. Current default/`auto` is API68; explicit
numeric versions `>=61.0` are admitted, not automatically live-qualified.
Changed saved content requires `--overwrite`; identical content is unchanged.
{% endcapture %}
{% include operation-tabs.html id="dmo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the object XML and individual field definitions, not the complete data setup." cli_body=retrieve_cli api_state="available" api_reason="Independent native definition GET verified at API61–67." api_body=retrieve_api plugin_state="available" plugin_reason="Qualified standalone canonical JSON retrieval; admitted versions are not a live-tested range." plugin_body=retrieve_plugin %}

## Create

{% capture create_api %}
Creating a DMO by deploying its XML has **not been verified**. Downloading an object does not mean you can recreate it that way.

A native API `65.0` `POST /services/data/v65.0/ssot/data-model-objects` returned HTTP `201` for a newly owned custom DMO in category `Other`, default dataspace, with a Text primary key, two nonprimary Text fields and four generated system/key-qualifier fields. This was an empty object without mappings or relationships. That bounded creation supported the additive update test below; it is not a general XML-deployment or arbitrary-schema creation recipe.

The [Salesforce-owned POST example](https://www.postman.com/salesforce-developers/salesforce-developers/request/lxdbfg4/create-data-model-object) documents this route. For the tested API `61.0`–`67.0` variant, save the following as `dmo-create.json`, replacing the name with a fresh owned unique name and independently confirming absence before creation:

```json
{"name":"OWNED_UNIQUE_NAME","label":"DMO CRUD probe","category":"Other","dataSpaceName":"default","fields":[{"name":"Id","label":"Id","dataType":"Text","isPrimaryKey":true,"isDynamicLookup":false},{"name":"Note","label":"Note","dataType":"Text","isPrimaryKey":false,"isDynamicLookup":false}]}
```

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects --target-org SOURCE_ALIAS --method POST --include --body @dmo-create.json --header Content-Type:application/json
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_UNIQUE_NAME__dlm --target-org SOURCE_ALIAS --method GET --include
```

POST returned `201`; independent GET returned `200`, six fields, `isEnabled=false`, `isEditable=true` and `isSegmentable=false`. Responses use field `type`, not input `dataType`. Save the returned inventory, but do not replay response-only IDs or observations as create input. The same request semantics worked through API `67.0`; no ingestion or record-store availability follows.
{% endcapture %}
{% capture create_plugin %}
Run from the project containing `data360/dmo/Customer__dlm.dmo-meta.json`:

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --preview --json
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --json
```

Deploy resolves the exact target developer name. Only confirmed absence permits
POST; authentication, permission or ambiguous lookup failures stop rather than
falling through to creation. The canonical JSON definition is not a Metadata XML
fallback or a raw retrieve-response POST. Independent GET confirms the definition;
creation does not establish ingestion or queryable storage. This qualified scope
is a fresh owned custom `Other` DMO in the default dataspace, not arbitrary schemas.
{% endcapture %}
{% include operation-tabs.html id="dmo-create" label="Create" cli_state="unknown" cli_reason="DMO creation by XML deployment has not been verified." api_state="available" api_reason="Fresh owned empty custom Other/default DMO; native API61–67 only." api_body=create_api plugin_state="available" plugin_reason="Qualified bounded standalone native create, not XML deployment or arbitrary schemas." plugin_body=create_plugin %}

## Update

{% capture update_api %}
General DMO XML updates, including schema changes through Metadata API, have **not been verified** either.

The completed API `61.0`–`67.0` matrix tested label and additive-field updates separately. The [Salesforce-owned PATCH example](https://www.postman.com/salesforce-developers/salesforce-developers/request/rschuxv/update-data-model-object) documents the route. Use the returned owned developer name including `__dlm`. The tested bodies were:

```json
{"label":"DMO CRUD updated"}
```

```json
{"fields":[{"name":"UpdateNote","label":"Update Note","dataType":"Text"}]}
```

Save one body at a time as `dmo-update.json`, then independently read back each operation before the next:

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method PATCH --include --body @dmo-update.json --header Content-Type:application/json
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

Each PATCH returned `200` with the pre-update state. Independent GET and Metadata reads confirmed the new label and then six-to-seven fields, with the XML preservation described above. Do not replay the write just because its response looks old.

### Separate historical API65 field-addition experiment

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
{% capture update_plugin %}
Edit the canonical JSON label or add an ordinary nonprimary Text field, preserving
existing fields and key settings, then use the same deploy selection:

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --preview --json
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --json
```

An existing target selects PATCH, not replacement. The bounded qualification covers
label changes and additive nonprimary Text fields only. Existing-field removal,
key changes, arbitrary type/schema changes and populated-object safety are not
qualified. Independent GET, not PATCH's possibly stale echo, confirms persistence
and preservation, including the generated qualifier omitted from saved input.
Preview is read-only; no-op comparison is not a reason to replay a mutation.
{% endcapture %}
{% include operation-tabs.html id="dmo-update" label="Update" cli_state="unknown" cli_reason="General DMO XML and Metadata API schema updates have not been verified." api_state="available" api_reason="Only the addition-only nonprimary Text-field PATCH on the qualified owned empty DMO." api_body=update_api plugin_state="available" plugin_reason="Qualified label and additive nonprimary Text-field updates only; no schema replacement." plugin_body=update_plugin %}

## Delete

{% capture delete_cli %}
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
{% endcapture %}
{% capture delete_api %}
**Destructive:** only for the exact fresh owned empty fixture after identity/ownership recheck and fresh scoped mapping/relationship checks. No cascade was used. These checks do not establish that arbitrary business DMOs are safe to delete.

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method DELETE --include
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

API `61.0`–`67.0` each returned DELETE `204`; independent final GET `404` and explicit Metadata absence established completion. DELETE's response alone is insufficient. All matrix fixtures were absent afterward; the historical API65 retained fixture is outside this claim. Mapping and relationship inventories used API `67.0`, not every tested lifecycle version.
{% endcapture %}
{% capture delete_plugin %}
**Destructive:** recheck exact identity, ownership and dependencies first. The
qualified standalone case is a fresh owned empty custom DMO, not a business object.

```sh
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS --preview --json
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS --json
```

Deletion executes by default without a separate confirmation prompt. Preview makes
no writes. The plugin targets the full developer name including `__dlm`, verifies
absence independently, and does not cascade or delete the local JSON. Permission
or ambiguous reads stop. This is not permission to delete a parent to bypass a
mapping restriction, nor proof of arbitrary dependency or populated-object safety.
{% endcapture %}
{% include operation-tabs.html id="dmo-delete" label="Delete" cli_state="available" cli_reason="Only an owned empty custom DMO after fresh dependency checks; the DLO remains." cli_body=delete_cli api_state="available" api_reason="Exact owned empty matrix fixtures; native API61–67, no cascade." api_body=delete_api plugin_state="available" plugin_reason="Qualified exact owned empty standalone DMO deletion; no cascade or local-file deletion." plugin_body=delete_plugin %}
