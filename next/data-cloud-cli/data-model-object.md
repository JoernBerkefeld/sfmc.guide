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

**Plugin qualification:** Yes denotes the standalone native DMO definition
workflow inside the verified scope stated here, not unrestricted schema CRUD.

The plugin works through the native DMO route only. Default and `auto` select API
`68.0`; explicit numeric versions from `61.0` are kept as given, and admitting a
version is not a live test of it. The definition is one file,
`data360/dmo/<ApiName>__dlm.dmo-meta.json`.

The plugin keeps no local allowlists. It checks only the shape of the saved file;
category, field data types, labels and descriptions are sent as authored,
Salesforce decides, and its error is reported. Verified at API `68.0`, from the
plugin's source tree against two orgs, on empty, unmapped custom DMOs in the
default data space:

- creation in the categories `Profile`, `Engagement` and `Other`;
- ten field data types: `Number`, `Text`, `Date`, `DateTime`, `Url`, `Phone`,
  `Email`, `Percent`, `Boolean` and `Currency`;
- updates of the object label, the object description, existing field labels and
  added fields of any accepted type;
- a zero-write repeat, retrieval, an unchanged deploy into the second org with
  byte-identical retrieved files, and deletion.

Custom fields are removed only on request, with `--allow-field-removal`, through a
Metadata API destructive change. A mapped field is removed only together with its
mapping pairs. Changing an existing field's data type, moving the primary key,
adding a generated field or a second primary key, and any write or delete on a
namespaced or platform-generated DMO are refused before any write; see the Update
and Delete tabs.

On a standard DMO (for example `ssot__Brand__dlm`) the plugin adds, relabels and
removes custom fields and changes the object label and description. Its standard
fields cannot be changed, its category is ignored, and the object itself is never
created or deleted. Verified at API `68.0` on one standard DMO in two orgs, active
in only one of them. A mapping may target a standard DMO; the first mapping
activates the object permanently, and the plugin announces that with
`MAPPING_ACTIVATES_STANDARD_DMO`. Verified at API `68.0` through the plugin: a
first mapping onto the inactive DMO was created, and the DMO was enabled afterwards.

Retrieve and deploy act on exactly the selected components. Prerequisites are
checked, not pulled in: each must be selected explicitly or already exist in the
target.

**Not verified:** data-bearing DMOs, standard DMOs in active use,
non-default data spaces, relationships, SQL or flex DMOs, an installed released
package, and this breadth at any API version other than `68.0`. The API rules
behind this scope are listed under
[Create and update rules](#api-68-create-and-update-breadth).

Deploying DMOs in one batch with DLOs and mappings is described on the
[DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/) page; its verification
does not broaden standalone DMO CRUD or its tested versions.

### Optional plugin dataspace and output

Native commands accept optional `--dataspace NAME`, with `--data-space` as an
alias; use only one spelling. There is no CLI default. DMO create/update includes
`dataSpaceName` only when the flag is supplied, and creating a nondefault DMO
without it is refused. Fresh response identities, the requested scope and the
saved definition must agree before mutation. DMO list, detail and delete URLs gain
no extra dataspace filter. Nondefault-space CRUD is not verified, and the flag does
not widen the empty-object, version and dependency limits. See the
[shared scope and readable-output rules](/next/data-cloud-cli/#native-plugin-scope-and-readable-results)
for per-component actions, successful retrieval counts and deploy totals.
`--json` retains the structured result.

## Native API contracts and version behavior

The [Salesforce Data 360 Connect API reference](https://developer.salesforce.com/docs/data/connectapi/references/spec) supplies the documented contract. The behavior below is observed on empty, unmapped custom DMOs in the default data space, created without relationships or ingestion.

- **API `61.0`–`68.0`: POST returns `201`, GET `200`, PATCH `200` and DELETE `204`.** API `61.0` is the lowest version observed to work, in one org; it is not a universal minimum or a plugin guard.
- **API `60.0` returns HTTP `404` for all four** (`NOT_FOUND`, `The requested resource does not exist`), including for a DMO that exists.
- **Response shape.** POST and GET return a direct DMO object with a `fields` array, not the DLO array wrapper.
- **PATCH response.** PATCH returns a direct object showing the state before the change: the old label, or the field list without the added field. A separate GET, not that response, confirms persistence.
- **Generated fields.** Creating a DMO with a Text primary key `Id` and one further field `Note` produces six fields: `Id__c`, `Note__c`, `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c` and `KQ_Id__c`. Adding one field gives seven. No DLO-style source-version field is generated.
- **Metadata view of an update (API `61.0`–`67.0`).** A label PATCH changes only the object XML `label`, `labelOverride` and `masterLabel`. A field-adding PATCH adds only the new field's `field-meta.xml` and leaves existing object and field XML byte-identical. Primary-index order `1` and key-qualifier attributes are kept.
- **After DELETE.** GET returns `404`, and Metadata retrieval no longer finds the object (Metadata checked at API `61.0`–`67.0`).

These observations do not establish populated-object safety, ingestion or queryable storage, cross-org portability of raw responses, Metadata deployment or key changes. An unchanged-source export comparison across API versions is not verified.

<a id="api-68-create-and-update-breadth"></a>

### Create and update rules (API 68)

Observed at API `68.0` on empty, unmapped custom DMOs in the default data space.
None of this is verified for mapped or data-bearing DMOs, other data spaces,
relationships or other API versions.

**Create**

- **Categories.** Only `Profile`, `Engagement` and `Other` can be created (POST
  `201`). `Segment_Membership` is refused as reserved for internal calls, and the
  remaining ten category values of the input schema are refused with HTTP `400`.
  Input spelling is case-insensitive (`other` and `PROFILE` are accepted); reads
  return upper case.
- **Engagement.** No event date key is needed. A body containing
  `eventDateTimeFieldName` is refused with HTTP `400` as an unrecognized field,
  whether it names an existing or a missing field. The same body without that key
  returns `201`, even with no DateTime field at all.
- **Field data types.** `Number`, `Text`, `Date`, `DateTime`, `Url`, `Phone`,
  `Email`, `Percent`, `Boolean` and `Currency` are created and read back with the
  same type name. `ArrayOfFloats` and `ArrayOfTexts` are refused with HTTP `400`
  although the input schema lists them.
- **Currency.** A `Currency` field adds a generated system field,
  `cdp_sys_record_currency__c`.
- **Labels.** Object and field labels are limited to 40 characters; longer labels
  return HTTP `400`.
- **Primary key.** Exactly one is required. A body with none or with two is
  refused. The key can have any accepted type, for example Number.
- **Key qualifiers.** The qualifier field (`KQ_<key>__c`) and the
  `keyQualifierName` reference are generated. Supplying `keyQualifierName` is
  refused.
- **Names.** Object and field names must be sent bare. Names already ending in
  `__dlm` or `__c` are refused with HTTP `400`.
- **Unknown keys.** Input keys outside the input schema, for example a field
  `length` or an invented object key, are refused with HTTP `400`.
- **Descriptions.** The object `description` round-trips. A field `description`
  and `isDynamicLookup: true` are accepted, but no read returns them. A field
  description sent this way does not appear in the Data Model UI either, so treat
  it as not stored; whether `isDynamicLookup` is stored is not verified.

**Update**

- PATCH changes the object label, sets and clears (empty string) the object
  description, changes existing field labels and adds fields (Number, DateTime and
  Boolean verified). Each request returns HTTP `200`.
- The PATCH response shows the state before the change on every request. A
  separate GET is needed; the first read, about nine seconds after the write,
  already shows the change.
- A PATCH that leaves out existing fields keeps them. Omission is not removal.
- **Category cannot be updated.** The request is refused with HTTP `400`.
- **Silently ignored.** Changing an existing field's data type, or marking another
  field as primary key, returns HTTP `200`, but reads still show the original type
  and key after 60 seconds of polling.
- **Field removal is not part of this API.** Field item paths return `404` and PUT
  on the object returns `405`. A custom field can be removed in the Data Model UI,
  and through the Metadata API with a destructive change for the `CustomField`
  member `<ObjectName>__dlm.<FieldName>__c` (observed at API `65.0` and `68.0` on
  empty custom DMOs; the object and its other fields stay unchanged). Salesforce
  also removes a mapped field without objection and silently drops exactly that
  field's pairs, also when two mappings hold one (API `68.0`); the mappings stay
  active and every other pair keeps its selector. Removal of
  fields that hold data or are referenced elsewhere is not verified.

### Routes and target identity

Prefix the following routes with `/services/data/v68.0/ssot` when working at API `68.0`:

- `GET /data-model-objects` lists DMOs.
- `POST /data-model-objects` creates a custom DMO. The reference documents HTTP `200`; API `61.0`–`68.0` return `201`.
- `GET /data-model-objects/{dataModelObjectName}` reads one DMO as a direct object, not the DLO array wrapper.
- `PATCH /data-model-objects/{dataModelObjectName}` updates a custom DMO. The reference warns that its HTTP `200` response can contain the **pre-update state**. Use a separate GET to confirm persistence; do not repeat PATCH merely because its response looks old.
- `DELETE /data-model-objects/{dataModelObjectName}` returns HTTP `204`. This is verified for empty owned custom DMOs only and is not permission to delete a business object.

The item-path parameter is documented as the **developer name**, including `__dlm`, not a promise that a source-org record ID works in that path. The input schema has no body `id`. Bind names in the target org instead of replaying source IDs. GET `404` can also mean the caller cannot access the DMO: it is not, by itself, sufficient absence evidence for automatic creation. The reference marks these standalone operations available since API `61.0`.

Salesforce CLI authentication can be reused without implementing another login flow. A read-only request looks like this:

```sh
sf api request rest /services/data/v68.0/ssot/data-model-objects/Customer__dlm --target-org SOURCE_ALIAS --method GET --include
```

### Input, output and generated fields

Creation input uses `name`, `label`, `category`, `dataSpaceName` and `fields`. Field input uses `name`, `label`, `dataType` and `isPrimaryKey`, with properties such as `description` and `isDynamicLookup` where applicable. Send the object name without `__dlm` and field names without `__c`; the output adds those suffixes.

Category input `Other` is returned as `OTHER` (API `61.0`–`68.0`). `eventDateTimeFieldName` is not an accepted input at API `68.0`; an Engagement DMO is created without it. `recordModifiedFieldName` is a documented input that is not verified. `dataSpaceName` defaults to `default` when omitted and is not the DLO property's `dataspaceInfo` spelling.

Responses use field `type` where requests use `dataType`. They can include object `id`, `creationType`, editability/enabled/segmentability observations, field `keyQualifierName` and generated fields such as `DataSource__c`, `DataSourceObject__c`, `InternalOrganization__c` and a primary-key qualifier. Preserve that inventory when retrieving; construct separate create/send and update/send representations rather than posting the whole response. Omit source resource IDs, duplicate representations and response-only observations from portable input, but never remove an authored primary-key field just because its name contains `Id`.

The official create response example has `isEnabled: false`. That example alone does not establish failed DMO creation or a universal ingestion prerequisite. Definition existence, queryable record storage, mappings and ingestion are different observations; the SQL caveat in the Update API tab still applies.

The [Salesforce-maintained Data 360 tooling reference](https://github.com/salesforce/sf-pi/blob/main/extensions/sf-data360/references/data-shapes.md) describes PATCH fields as additive. Observed behavior matches for added fields and goes further for labels: PATCH adds a Text field (API `61.0`–`68.0`) and Number, DateTime and Boolean fields (API `68.0`), and changes the label of an existing field (API `68.0`). Mixed edits in one request are not verified directly against the API. A documented PATCH input may contain object `name`, but the reference explicitly rejects changing the developer name; the URL identifies the target independently of any body property.

### Relationships are separate definitions

DMO field relationships use `GET` and `POST /data-model-objects/{dataModelObjectName}/relationships?dataspace=default`, documented since API `64.0`. The path names either participating DMO. Creation takes a `relationships` array with entries identifying `sourceObjectName`, `targetObjectName`, `sourceFieldName`, `targetFieldName`, `cardinality`, `creationType` and `owner`; the reference example uses `ManyToOne`, `Custom` and `DataCloud`. These are names to resolve in the target, not source record IDs. Existing relationships are documented as skipped on creation. Relationship definitions and DLO-to-DMO mappings are not automatically recreated by POSTing a standalone DMO. For a DMO without relationships, the relationship GET returns HTTP `204` (API `67.0`).

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** `sf project` retrieves the `CustomObject` and `CustomField`
definitions; this is separate from the native Connect REST JSON route.

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
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

API `61.0`–`68.0` return HTTP `200` with a direct object and `fields` array. Preserve generated fields and key qualifiers; this is a definition read, not a complete ingestion/mapping/relationship export.
{% endcapture %}
{% capture retrieve_plugin %}
```sh
sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS --output-dir ./project
```

Saves `./project/data360/dmo/Customer__dlm.dmo-meta.json` with the authored fields
only. Generated fields are left out: every field read as `creationType=System`, the
system fields `DataSource__c`, `DataSourceObject__c` and `InternalOrganization__c`,
and key qualifiers such as `KQ_Id__c`. A key qualifier combines an ID with source
context to avoid collisions. The primary key `Id__c` always stays, and so do the
standard fields of a standard DMO, which a deploy compares when they are listed.
Native CREATE generates the left-out fields and deploy keeps them from the org, so
their omission is not field deletion or proof of mapping auto-pair behavior, and a
retrieved file deploys back `unchanged`. Custom qualifiers and `keyQualifierName`
references in kept fields stay as read; raw API responses remain complete. The DMO
API marks the qualifier `creationType=System` / `usageTag=KeyQualifier`, unlike DLO
Metadata's `usageTag=KEY_QUALIFIER`. Observed at API68 through the plugin in one
org: a retrieved custom DMO held only its authored fields and deployed back
`unchanged`. Current default/`auto` is API68; explicit
numeric versions `>=61.0` are kept as given, not automatically live-qualified.
Changed saved content requires `--overwrite`; identical content is unchanged.

Values that only reads return (`creationType`, `isDistinct`, `usageTag` and
`keyQualifierName`) stay in the saved file and are never sent back. Source record
IDs and runtime observations are not saved. Standard, namespaced and
platform-generated DMOs can all be retrieved. Namespaced and platform-generated
DMOs are for inspection only; a standard DMO takes the bounded writes described in
the Update tab and is never deleted. Verified at API68: files retrieved from a source org and
from a second org after an unchanged deploy are byte-identical for one Profile,
one Engagement and one Other DMO.
{% endcapture %}
{% include operation-tabs.html id="dmo-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the object XML and individual field definitions, not the complete data setup." cli_body=retrieve_cli api_state="available" api_reason="Native definition GET, verified at API61–68." api_body=retrieve_api plugin_state="available" plugin_reason="Canonical JSON retrieval, verified at API68 on empty custom DMOs and one standard DMO; namespaced and generated DMOs are retrieve-only; pins from API61 are kept but not each live-tested." plugin_body=retrieve_plugin %}

## Create

{% capture create_api %}
Creating a DMO by deploying its XML has **not been verified**. Downloading an object does not mean you can recreate it that way.

The [Salesforce-owned POST example](https://www.postman.com/salesforce-developers/salesforce-developers/request/lxdbfg4/create-data-model-object) documents the native route. Save the following as `dmo-create.json`, replacing the name with a fresh owned unique name and independently confirming absence before creation:

```json
{"name":"OWNED_UNIQUE_NAME","label":"DMO CRUD probe","category":"Other","dataSpaceName":"default","fields":[{"name":"Id","label":"Id","dataType":"Text","isPrimaryKey":true,"isDynamicLookup":false},{"name":"Note","label":"Note","dataType":"Text","isPrimaryKey":false,"isDynamicLookup":false}]}
```

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects --target-org SOURCE_ALIAS --method POST --include --body @dmo-create.json --header Content-Type:application/json
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_UNIQUE_NAME__dlm --target-org SOURCE_ALIAS --method GET --include
```

POST returns `201` at API `61.0`–`68.0`. The separate GET returns `200` and six fields; at API `61.0`–`67.0` it shows `isEnabled=false`, `isEditable=true` and `isSegmentable=false`. Responses use field `type`, not input `dataType`. Save the returned inventory, but do not replay response-only IDs or observations as create input. Creation does not establish ingestion or record-store availability.

At API `68.0` the route creates `Profile`, `Engagement` and `Other` DMOs with ten
field data types and enforces the input rules listed under
[Create and update rules](#api-68-create-and-update-breadth): bare names, labels of
at most 40 characters, exactly one primary key, no array types and no keys outside
the input schema. Do not add `eventDateTimeFieldName` to an Engagement body; it is
refused.
{% endcapture %}
{% capture create_plugin %}
Run from the project containing `data360/dmo/Customer__dlm.dmo-meta.json`:

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --preview
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS
```

Deploy resolves the exact target developer name. Only confirmed absence permits
POST; authentication, permission or ambiguous lookup failures stop rather than
falling through to creation. The canonical JSON definition is not a Metadata XML
fallback or a raw retrieve-response POST.

The plugin validates only the file's shape: an API name ending in `__dlm`, the data
space, a label, a category, an optional description and at least one field with a
unique name ending in `__c`, a label, a `dataType` and a boolean `isPrimaryKey`.
There is no local allowlist beyond that. The category, field data types, labels and
descriptions are sent as written, without generated fields and without read-only
values. Salesforce decides, and its error is reported; an array-typed field, for
example, surfaces as `DMO_HTTP_ERROR`. A new name with a double underscore before
`__dlm` (a namespaced name) is refused with `UNSUPPORTED_DMO_TARGET` before any
write.

After the POST the plugin confirms the definition with separate reads and never
repeats the write. Creation does not establish ingestion or queryable storage.

**Verified at API68**, in two orgs: one `Profile`, one `Engagement` and one `Other`
DMO in the default data space, each with a Text primary key, nine further fields
covering the other accepted data types, and descriptions. Each is reported as
created and confirmed, and a repeated deploy reports unchanged without a write. A
field `description` or `isDynamicLookup` is sent, but Salesforce never returns it,
so the plugin cannot confirm it. Non-default data spaces, other API versions for
this breadth and an installed released package are not verified.
{% endcapture %}
{% include operation-tabs.html id="dmo-create" label="Create" cli_state="unknown" cli_reason="DMO creation by XML deployment has not been verified." api_state="available" api_reason="Empty unmapped custom DMO in the default data space: Other with Text fields at API61–68; Profile, Engagement and Other with ten field data types at API68." api_body=create_api plugin_state="available" plugin_reason="Native create without local allowlists; verified at API68 for Profile, Engagement and Other with ten field data types in the default data space only. Not XML deployment." plugin_body=create_plugin %}

## Update

{% capture update_api %}
General DMO XML updates, including schema changes through Metadata API, have **not been verified** either.

The [Salesforce-owned PATCH example](https://www.postman.com/salesforce-developers/salesforce-developers/request/rschuxv/update-data-model-object) documents the native route. Use the owned developer name including `__dlm`. Send one change per request. A label change and an added Text field work at API `61.0`–`68.0`:

```json
{"label":"DMO CRUD updated"}
```

```json
{"fields":[{"name":"UpdateNote","label":"Update Note","dataType":"Text"}]}
```

At API `68.0`, PATCH also sets and clears the object description, adds Number,
DateTime and Boolean fields, and changes the label of an existing field. For a
field label, send that field with its existing `dataType` and `isPrimaryKey` and
the new `label`:

```json
{"fields":[{"name":"Note","label":"Note renamed","dataType":"Text","isPrimaryKey":false}]}
```

Save one body at a time as `dmo-update.json`, then read back each operation before the next:

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method PATCH --include --body @dmo-update.json --header Content-Type:application/json
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

Each PATCH returns `200` with the state before the change. **Do not treat the mutation echo as confirmation or replay the write.** A separate GET shows the result. The delay varies: the first read about nine seconds after the write shows the change at API `68.0`, while at API `65.0` an added field is visible about 28 seconds after the write. Poll instead of assuming a fixed delay.

Three requests do not do what they appear to do at API `68.0`. A category change is
refused with HTTP `400`. A changed `dataType` on an existing field, or
`isPrimaryKey: true` on another field, returns `200` and is then silently ignored.
This API has no request that removes a field; the Metadata API does. Details are under
[Create and update rules](#api-68-create-and-update-breadth).

An added field leaves everything else alone: apart from the new field, the entire runtime object and entire Metadata object stay equal to their state before the PATCH, including primary-key and key-qualifier settings, system fields and object properties (API `65.0`). In Metadata the added Text field has length `60`, `required=false` and `isDynamicLookup=false`. At API `65.0` a new field name sent with the `__c` suffix is accepted; send bare names, which every verified version accepts.

Populated, mapped or related DMOs, non-default data spaces, the API `68.0` rules at other API versions, and nullable/default semantics are **not verified**.

An existing DMO needs a separate, authoritative eligibility check before applying these empty-object results. Disabled or unmapped flags, ownership and schema presence do **not** prove zero records. A native SQL query against an existing DMO can return SQLSTATE `42P01` (table does not exist), even when runtime and Metadata reads find its configuration; an explicit default-data-space query can fail the same way. That error is **not** an empty result or proof that no record store exists. There is no verified authoritative zero-record or record-store-absence check for that nonqueryable variant, so do not use these examples as a general update recipe for existing objects. Even a successful fresh zero-row query is a point-in-time observation, not an atomic guarantee against concurrent ingestion before PATCH.

{% endcapture %}
{% capture update_plugin %}
Edit the canonical JSON, keeping every existing custom field with its data type and
key setting, then use the same deploy selection:

```sh
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS --preview
sf data360 deploy -m dmo:Customer__dlm -o TARGET_ALIAS
```

An existing target that differs is updated with one PATCH, not replaced. An update
can:

- change the object label;
- set or clear the object description. Leaving `spec.description` out means the
  description is not managed and the target value stays as it is; an explicit empty
  string clears it;
- change the labels of existing fields;
- add fields of any data type Salesforce accepts.

An equal definition returns `outcome: "unchanged"` and
`mutation: "not-attempted"`; comparison sends no POST or PATCH. Field order does
not trigger a write, and leaving out generated fields, as retrieve does, is not
field removal: a definition may leave out generated and system fields.
Preservation and unsupported-addition checks still run first.

**Refused before any write:**

| Situation | Code |
| --- | --- |
| Changing an existing field's data type or moving the primary key. Salesforce would answer `200` and ignore it. | `UNSUPPORTED_DMO_FIELD_CHANGE` |
| Leaving out a custom field that exists in the target, without `--allow-field-removal`. | `UNSUPPORTED_DMO_FIELD_CHANGE` |
| Leaving out the target's primary-key field, with or without the flag. The primary key is never removed. | `UNSUPPORTED_DMO_FIELD_CHANGE` |
| Removing a field that is currently mapped, with the flag, unless every mapping that holds its pair is deployed by the same command without that pair. | `DMO_FIELD_REMOVAL_MAPPED` |
| Adding a generated field or a second primary key. | `UNSUPPORTED_DMO_FIELD_ADDITION` |
| On a standard DMO: a standard or system field in the file that differs from the target. | `UNSUPPORTED_DMO_FIELD_CHANGE` |
| On a standard DMO: a new field that is not a plain custom field, for example `ssot__New__c`. | `UNSUPPORTED_DMO_FIELD_ADDITION` |
| Any write to a namespaced or platform-generated DMO. | `UNSUPPORTED_DMO_TARGET` |

**Standard DMOs.** A standard DMO such as `ssot__Brand__dlm` is updated with the
same command, within these bounds:

- custom fields can be added, relabelled and removed (removal as described below);
- the object label and the object description can be changed;
- standard and system fields are never sent. They may be left out of the file; one
  that is listed must match the target. Salesforce itself rejects edits of `ssot__`
  fields;
- the category is ignored: it is neither sent nor compared. Salesforce changes it
  from `UNASSIGNED` to `OTHER` when the object is first mapped;
- a file retrieved in one org deploys as unchanged to another org, even when the
  object is active in only one of them.

**Mappings onto a standard DMO.** A DLO-to-DMO mapping may target a standard DMO.
The first mapping activates the object permanently: it becomes enabled, its
category changes to `OTHER`, and Salesforce adds the key qualifier field `KQ_Id__c`
and references it from the standard primary key. Deleting the mapping does not undo
this. The plugin announces it in the preview and on the created mapping with
`MAPPING_ACTIVATES_STANDARD_DMO`; the notice changes neither the outcome nor the
exit status. Details are on the
[DLO-to-DMO mapping](/next/data-cloud-cli/dlo-dmo-mapping/) page.

**Removing fields.** A custom field that exists in the target but not in the file
is removed only with `--allow-field-removal`:

```sh
sf data360 deploy -o TARGET_ALIAS -m dmo:Customer__dlm --allow-field-removal --preview
sf data360 deploy -o TARGET_ALIAS -m dmo:Customer__dlm --allow-field-removal
```

Preview lists the fields that would be removed (`removeFields`,
`DMO_FIELD_REMOVAL_PLANNED`) and writes nothing. Execution sends the PATCH for
other changes first, if there are any, then one Metadata API destructive change for
all listed `CustomField` members, then reads the object to confirm the fields are
gone. Nothing is retried. Generated and system fields are never removed. If
Salesforce does not confirm the removal, the command fails with
`DMO_FIELD_REMOVAL_FAILED` and Salesforce's message.

**Removing a mapped field.** When Salesforce removes a field through the Metadata
API, it drops that field's mapping pairs itself, from every mapping that holds
one; the mappings stay active and keep all their other pairs. A mapped field is
therefore never removed silently: the deploy must also name every mapping that
holds a pair for it. The refusal (`DMO_FIELD_REMOVAL_MAPPED`) names those mappings
and prints the commands to use. There are three ways to do it:

- **Edit the files and deploy them together.** Remove the pair from every mapping
  file that has one and the field from the DMO file, then run one command. Every
  mapping that holds the pair must be part of the command and no longer list it;
  otherwise the whole command is refused before any write. Keep all other authored
  pairs in the mapping files; the generated pairs may be listed or left out (retrieve
  leaves them out).

  ```sh
  sf data360 retrieve -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --overwrite
  sf data360 deploy -o TARGET_ALIAS -m mapping:Customer_Mapping -m dmo:Customer__dlm --allow-field-removal
  ```

  For a field mapped by several mappings, add one `-m mapping:<Name>` per mapping.
  The DMO deploys in its usual place, before the mappings: the PATCH for other
  changes, then one destructive change that removes the field, and Salesforce drops
  its pairs with it. The DMO's result lists `removedFields` and `droppedPairs`. The
  mapping files deploy afterwards and find those pairs already gone; a file whose
  only change was dropping them reports `unchanged`. With one mapping file this
  takes about 29 seconds.

- **Delete the field directly**, without editing files; see the Delete tab. It also
  handles a field mapped by several mappings and takes about 28 seconds for a field
  mapped by two.

- **Deploy twice.** First the mapping files without the pair, then the DMO file
  without the field with `--allow-field-removal`. The result is the same as with
  the single deploy.

Before the destructive change the plugin reads the DMO and all its mappings again.
After it, the plugin polls separate reads, up to six at five-second intervals,
until the field is gone and every mapping equals its state before the write minus
exactly the removed field's pairs, still active. Any other change to a pair, field, DMO
property, mapping or mapping status stops the command with
`DMO_FIELD_REMOVAL_SIDE_EFFECT`. If the reads do not settle in time, the command
fails with `DMO_PERSISTENCE_UNCONFIRMED` (field still readable) or
`MAPPING_UNMAP_PERSISTENCE_UNCONFIRMED` (a pair still listed). Nothing is retried
or rolled back.

Any authored pair can be removed from a mapping file, including a pair onto a
standard field of a standard DMO, for example `Name__c` to `ssot__Name__c`. The
generated pairs and the primary-key pair stay.

A changed category is not blocked locally; it is sent, and Salesforce rejects it.
A change to only a field's `description` or `isDynamicLookup` is reported as
unchanged, because Salesforce does not return those values and the plugin cannot
see a difference. A field description is accepted by Salesforce but not stored: no
read returns it and the Data Model UI does not show it.

After the PATCH the plugin polls separate reads, up to six at five-second
intervals, and never repeats the write. PATCH's own response shows the old state
and is not used as confirmation. If the reads do not confirm the definition, the
command fails with `DMO_PERSISTENCE_UNCONFIRMED`; inspect the target before trying
again. Preview is read-only; no-op comparison is not a reason to replay a mutation.

**Verified at API68** on empty custom DMOs in the default data space:
object label, object description including clearing, one existing field label and
two added fields, reported as updated and confirmed and then unchanged on repeat;
the Salesforce category rejection; the local refusal of a data-type change; and
field removal with `--allow-field-removal` in both orgs, alone and together with a
label change, including an unmapped field on a mapped DMO, the refusal of a
mapped field, and the removal of a mapped field in one command together with its
mapping, also for a field shared by two mappings, with unchanged on repeat. On one
standard DMO in two orgs, active in only one of them: a custom field added,
relabelled and removed with `--allow-field-removal`, the object description set and
cleared, a changed standard field refused, and a file retrieved in one org
deploying unchanged to the other. Data-bearing DMOs, standard DMOs in active use,
a mapped custom field of a standard DMO, fields referenced by other components,
non-default data spaces and other API versions for this breadth are not verified.
{% endcapture %}
{% include operation-tabs.html id="dmo-update" label="Update" cli_state="unknown" cli_reason="General DMO XML and Metadata API schema updates have not been verified." api_state="available" api_reason="Empty unmapped custom DMO only: label and added Text field at API61–68; at API68 also description, existing field labels and added fields of other types. No type change, key move or category change; field removal only through the Metadata API." api_body=update_api plugin_state="available" plugin_reason="Object label and description, existing field labels and added fields; verified at API68 on empty custom DMOs and, for custom fields and the description, on one standard DMO. Custom fields are removed only with --allow-field-removal; type or key changes are refused before any write." plugin_body=update_plugin %}

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
sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5
```

**Optional structured output (`--json`):** a completed deletion can look like this:

```json
{ "status": 0, "result": { "done": true, "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "CustomObject", "fullName": "Customer__dlm", "deleted": true, "success": true }] } } }
```

Check afterward that the exact DMO and its owned mapping are gone and the DLO remains. Downstream insights, segments, identity resolution and activations can block deletion; no single dependency list is guaranteed to show everything. Local object, field and mapping XML remain. `sf project delete source` is not an interchangeable verified alternative and would also remove local files.
{% endcapture %}
{% capture delete_api %}
**Destructive:** only for an exact owned empty custom DMO, after rechecking identity and ownership and running fresh mapping and relationship checks. Those checks do not establish that arbitrary business DMOs are safe to delete.

```sh
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method DELETE --include
sf api request rest /services/data/v61.0/ssot/data-model-objects/OWNED_DMO_API_NAME --target-org SOURCE_ALIAS --method GET --include
```

API `61.0`–`68.0` return DELETE `204`. A following GET returns `404`, and Metadata retrieval no longer finds the object (Metadata checked at API `61.0`–`67.0`); DELETE's response alone is insufficient. Verified on empty, unmapped custom DMOs only; cascade behavior and DMOs with dependencies are not verified here.
{% endcapture %}
{% capture delete_plugin %}
**Destructive:** recheck exact identity, ownership and dependencies yourself
first. The plugin has no dependency preflight. The verified standalone case is an
owned empty custom DMO, not a business object.

```sh
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS --preview
sf data360 delete -m dmo:Customer__dlm -o TARGET_ALIAS
```

Deletion executes by default without a separate confirmation prompt. Preview makes
no writes. The plugin targets the full developer name including `__dlm`, verifies
absence independently, and does not cascade. After a confirmed deletion it removes
the local `data360/dmo/<Name>.dmo-meta.json` and lists it in `removedLocalFiles`;
`--keep-local-files` keeps it, preview lists it as `localFiles`, and a failed
removal keeps the org result and exits nonzero with `LOCAL_FILE_REMOVAL_FAILED`.
Salesforce itself may remove the DMO's mapping together with the DMO; the local
files of such mappings are not removed, because they are not part of the command.
Observed at API68 through the plugin: a DMO plus DLO delete removed both local files
(28 seconds). Permission
or ambiguous reads stop. This is not permission to delete a parent to bypass a
mapping restriction, nor proof of arbitrary dependency or populated-object safety.
The last mapping of a custom DMO cannot be deleted on its own
(`MAPPING_LAST_MAPPING_DELETE_BLOCKED`); deleting the DMO removes
its mapping. The last mapping of a standard DMO can be deleted; the DMO stays
enabled.

**Delete single fields.** `--field` removes named custom fields from one DMO
instead of deleting the DMO:

```sh
sf data360 delete -m dmo:Customer__dlm --field Note__c -o TARGET_ALIAS --preview
sf data360 delete -m dmo:Customer__dlm --field Note__c -o TARGET_ALIAS --confirm-delete
```

The command removes the fields with one Metadata API destructive change. Salesforce
drops each field's pairs from every mapping that holds one; the mappings stay
active and keep their other pairs. Before the write, every pair onto the field must
be found on an active mapping, and a fresh read right before the write must still
show exactly the planned pairs (`MAPPING_UNMAP_PLAN_CHANGED` otherwise, nothing
written). After the write the plugin polls the DMO and its mappings, up to six
reads five seconds apart, with the same checks and diagnostics as a deploy with
`--allow-field-removal` (see the Update tab). It then refreshes the DMO and mapping
files that already exist in the project (`--output-dir`, default current
directory). It does not create files. The result lists `removedFields` and
`unmappedPairs`, the pairs Salesforce dropped. `--confirm-delete` is required
because mappings change; preview lists one step per pair that Salesforce drops with
the field, one per field and the files, and writes nothing. The primary key and
generated fields are refused. The destructive change is sent once and never rolled
back. For a field mapped by two mappings the command takes about 28 seconds.
This is the only delete operation that rewrites project files; it removes none, and
the refreshed files have the same lean form retrieve writes. On a standard DMO it
removes custom fields only; standard and system fields are refused. Any field-level
delete on a namespaced or platform-generated DMO is refused.

Delete and delete preview of a whole standard, namespaced or platform-generated
DMO are refused with `UNSUPPORTED_DMO_TARGET` before any DELETE. An already absent
DMO is reported as unchanged. **Verified at API68**, in two orgs: that refusal,
deletion of empty, unmapped custom DMOs with confirmed absence, and unchanged on
repeat; field-level delete of a mapped field with one mapping, including the file
refresh, of a field shared by two mappings (Salesforce dropped the pair from both
with the field), of a custom field on a standard DMO with its file refreshed, and of
unmapped fields in the second org. Deleting data-bearing DMOs or fields is not
verified.
{% endcapture %}
{% include operation-tabs.html id="dmo-delete" label="Delete" cli_state="available" cli_reason="Only an owned empty custom DMO after fresh dependency checks; the DLO remains." cli_body=delete_cli api_state="available" api_reason="Exact owned empty custom DMOs, verified at API61–68; no cascade verified." api_body=delete_api plugin_state="available" plugin_reason="Exact-name deletion of custom DMOs, verified on empty unmapped fixtures at API68; no dependency preflight, no prompt; whole standard and generated DMOs are refused. Single custom fields can be deleted with their mapping pairs, also on a standard DMO." plugin_body=delete_plugin %}
