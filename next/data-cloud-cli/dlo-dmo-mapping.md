---
layout: page
title: "DLO-DMO-mapping"
description: "Salesforce CLI workflows and verified operation limits for DLO-to-DMO mapping: ObjectSourceTargetMap."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/dlo-dmo-mapping/
redirect_from:
  - /next/data-cloud-cli/object-source-target-map/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  retrieve: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  create: { status: "yes", methods: [cli, api, plugin], method_statuses: { cli: "yes", api: "yes", plugin: "yes" } }
  update: { status: "partial", methods: [cli, api, plugin], method_statuses: { cli: "partial", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

*Prior documentation record: November 3, 2026, 08:05 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="dlo-to-dmo-mapping-objectsourcetargetmap"></a>

**DLO-to-DMO mapping** — `ObjectSourceTargetMap`.

This is the definition that connects fields in a DLO to fields in a DMO. Both objects must already exist with matching fields, primary keys and key qualifiers.

## Installed API61 mapping create and single addition — 2026-11-04

Fresh empty custom Other/Text fixtures passed installed public mapping create, exact
canonical retrieval, filtered target binding lookup, one additive Text identity pair
and a GET-only unchanged repeat at explicit API61, with `--dataspace` omitted.
Captured native routes retained v61.0 and omitted the dataspace query; mapping write
bodies carried no scope field. Independent reads confirmed ACTIVE mapping settlement,
all prior pairs/selectors, the full DLO and DMO field/key definitions; only the added
Extra__c isMapped flag changed during update. Create/update previews were read-only.

This closes the exercised API61 create/read/single-add omission path, not general
CRUD or inventory pagination. API61 is the lowest live-tested success for these
mapping operations in this record, not a universal introduction claim. API60 GET404
is separate evidence, not POST/PATCH/DELETE rejection proof. API62–67 operation
qualification remains open; their deletion compatibility is still assumed. Desired-state
removal and retarget remain API68-only. No nondefault space, ingestion, populated data
or released-package qualification follows. The fresh sole mapping and both parents
are deliberately retained under the accepted last-mapping limitation; no delete,
parent cascade or terminal cleanup was attempted.

**API family:** The native JSON route
`/services/data/vXX.0/ssot/data-model-object-mappings` (including its item and
field-mapping routes) belongs to the **Data 360 Connect REST API**, not the
SOAP-based Metadata API. Salesforce lists mapping routes separately in the
[Connect REST reference](https://developer.salesforce.com/docs/data/connectapi/references/spec)
and shows the full versioned URL in its
[mapping use case](https://developer.salesforce.com/docs/data/connectapi/guide/dmo-use-case.md).
Native plugin requests to this family use authenticated `sf api request rest`;
that is API access through a CLI runner, not a dedicated out-of-the-box mapping
command. The `sf project` XML examples in the CLI sections below instead use
Metadata API with `ObjectSourceTargetMap`. This attribution alone does not qualify
a native mapping workflow, alter the existing API-tab ratings or establish CRUD
support at an untested version.

{% include crud-summary.html %}

**Partial Plugin coverage — keep installed acceptance separate from implementation:**
earlier bounded installed API68 acceptance passed strict-selection guards, mixed
preview/create, exact canonical retrieval, unchanged redeployment and single-pair
Text/compatible Number additions. New installed API68 canonical JSON reconciliation
passed bounded Text removal, two-pair Text batch addition and both Text field-pair
retarget directions. Installed guarded deletion and last-for-DMO preview/execution
guards passed at API61 and API68. These are empty-fixture results in one org,
not general lifecycle qualification.

**November 4, 2026 bounded cross-org acceptance:** an installed API68/default
workflow retrieved an exact source mapping, changed only its logical DLO/DMO
bindings to compatible target-local empty Other/Text fixtures, then passed create,
canonical retrieve, one additive Text pair and a GET-only unchanged repeat.
Guarded selected deletion removed two authored pairs before deleting that mapping;
independent typed name404 confirmed absence and the other-source ACTIVE survivor
and parent schema/key definitions remained unchanged. Explicit previews were
read-only. Last-for-DMO preview and execution refused with zero writes. Exact owned
source/target final mappings and parents remain under the accepted platform
limitation; no DMO-object deletion, cascade or complete cleanup was tested.
This does not qualify general cross-org schemas, populated objects, inventory
completeness, lower-version portability or the released package.

Retrieve and Create remain Yes within their supplied scopes; Update remains Partial.
Plugin Retrieve Yes qualifies exact `mapping:Name` selection only. Earlier type-only
and bare inventory reads failed with `NATIVE_INVENTORY_UNCONFIRMED` and zero artifacts.
The later mapping type-only acceptance attempt timed out, so it is not a pass;
neither inventory mode is acceptance-qualified by the exact retrieval result.

**Current implementation:** canonical JSON is desired state for bounded API68
field-pair reconciliation: omitted eligible pairs are individually unmapped first,
then additions are sent together in one names-only PATCH. Guarded whole-mapping
deletion admits exact API61–68 pins, with default/`auto` selecting API68. The last
mapping for the target DMO is refused **before any field unmap or other write**.
The retired unconditional `MAPPING_DELETE_SAFETY_HOLD` is no longer the policy.
Delete is Partial for API and Plugin in the supplied-workflow ratings: native evidence is bounded,
not a general-purpose deletion guarantee. Out-of-the-box CLI deletion remains Unknown. This documentation
reconciliation records the completed installed checks, not a new live-org test.

**Native API evidence:** API68 create/GET, qualified batch additions, ordinary
field unmaps and both Text field-pair retarget directions were independently
observed. Unmap-first whole-mapping deletion preserved the bounded fixtures at
API61 and API68. API62–67 deletion compatibility is a **user-accepted assumption**,
covered synthetically, not live proof. API60 read-route rejection and the documented
API61 floor do not prove an API60 DELETE failure: no such DELETE was attempted.
A direct non-last DELETE previously removed DMO fields despite HTTP `204`; neither
HTTP success nor survivor coverage alone guarantees preservation. See Delete for
the guarded sequence and its limits. The deferred `totalSize` inventory issue
remains a known issue; it was not investigated or requalified in this update.

### Optional plugin dataspace

**Documentation update: November 3, 2026; no new live check.** Native commands accept
optional `--dataspace NAME` (alias `--data-space`); use only one spelling. There is
no CLI default. Mapping requests include the `dataspace` query only when explicitly
supplied. Omission keeps the documented default context for local identity checks
without injecting `dataspace=default` into HTTP requests. Requested scope, saved
identity and fresh mapping/parent identities must agree before writes. See the
[shared scope and output guidance](/next/data-cloud-cli/#native-plugin-scope-and-readable-results).
This implementation support does not establish nondefault-space live acceptance,
resolve inventory completeness or broaden the bounded mapping qualifications above.

## Retrieve

{% capture retrieve_cli %}
**Metadata API (XML):** the `sf project` retrieve/deploy examples on this page use
`ObjectSourceTargetMap` definitions, not the native Connect REST JSON route.

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

The response points to `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. Use the actual metadata member name from your org, not a name guessed from the source and target objects.

An independent exact-name standard Metadata API 65 retrieve was reverified on
October 29, 2026 for one retained mapping in one source org. The separately
retrieved XML matched the exported definition byte for byte in a configured
package source directory. This is source-only definition evidence: it does not
establish primary-key or key-qualifier compatibility, prerequisite readiness,
cross-org portability or operational deployment. No target calls, writes or
processing were performed in this check; it does not requalify the bounded
write examples below.

{% endcapture %}
{% capture retrieve_api %}
```sh
sf api request rest /services/data/v68.0/ssot/data-model-object-mappings/ACTUAL_MAPPING_NAME?dataspace=default --target-org SOURCE_ALIAS --method GET --include
```

Use the server-returned mapping name. Independent API68 GET confirmed `ACTIVE`,
exact DLO/DMO bindings and all field pairs; the CLI is an API request runner here.
{% endcapture %}
{% capture retrieve_plugin %}
```sh
sf data360 retrieve -m mapping:CustomerMapping -o SOURCE_ALIAS --api-version 68.0 --output-dir ./project
```

Saves `./project/data360/mapping/CustomerMapping.mapping-meta.json`, a versioned
native JSON definition, not an `ObjectSourceTargetMap` XML fallback. Retrieval
preserves logical source/target bindings and returned field pairs, including
server-generated system/qualifier pairs. Saved mapping names and source selectors
are not target identity: deploy resolves a unique target mapping by its DLO/DMO
bindings and uses the target's server-generated name/selectors. Installed API68
canonical retrieval passed and preserved all six returned pairs/selectors. Deploying
the retrieved file unchanged also passed with zero writes. Select that file with
`--source-dir ./project/data360/mapping/CustomerMapping.mapping-meta.json` **instead
of** `-m`; do not combine both selection modes. `--overwrite` permits replacing
changed local output only.

This passed **exact-selection retrieval**, not inventory discovery. Earlier
`sf data360 retrieve -m mapping` and bare `sf data360 retrieve` attempts failed with
`NATIVE_INVENTORY_UNCONFIRMED`, producing zero artifacts. A later mapping type-only
acceptance attempt timed out, not passed. Inventory retrieval remains unqualified;
do not treat an error or timeout as a successful guard, or infer inventory support
from exact-selection retrieval.
{% endcapture %}
{% include operation-tabs.html id="mapping-retrieve" label="Retrieve" cli_state="available" cli_reason="Retrieve the mapping XML using its actual metadata member name." cli_body=retrieve_cli api_state="available" api_reason="Independent native API68 mapping GET verified." api_body=retrieve_api plugin_state="available" plugin_reason="Exact mapping:Name API68 retrieval and unchanged redeployment passed. Earlier inventory errors and a later type-only timeout are not inventory acceptance." plugin_body=retrieve_plugin %}

## Create

{% capture create_cli %}
Start with a complete retrieved mapping file at `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. For example, one field pair looks like this:

```xml
<ObjectSourceTargetMap xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <fieldSourceTargetMaps>
    <creationType>Custom</creationType>
    <filterApplied>false</filterApplied>
    <filterOperationType>Equal</filterOperationType>
    <isSourceFormula>false</isSourceFormula>
    <sourceField>CustomerSource__dll.Id__c</sourceField>
    <targetField>Customer__dlm.Id__c</targetField>
  </fieldSourceTargetMaps>
  <!-- Other retrieved field pairs omitted. -->
  <masterLabel>Customer Mapping</masterLabel>
  <sourceObjectName>CustomerSource__dll</sourceObjectName>
  <targetObjectName>Customer__dlm</targetObjectName>
</ObjectSourceTargetMap>
```

Keep **all** field pairs in the real file. Once you have checked the existing custom objects and confirmed that this mapping does not already exist:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5
```

**Optional structured output (`--json`) for the deployment:**

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }] } }
```

Read the mapping back and compare the source, target and every runtime field pair. Salesforce can generate system qualifier pairs such as `KQ_Id__c` that were not in the XML; do not add guessed pairs yourself. This example does not cover arbitrary formulas or filters, and it does not guarantee that mapping creation performs no internal processing.

{% endcapture %}
{% capture create_api %}
Native API68 POST to `/services/data/v68.0/ssot/data-model-object-mappings?dataspace=default`
with explicit source/target developer names and names-only `fieldMapping` pairs
returned `201`. A separate GET confirmed the server-generated mapping name,
`ACTIVE`, requested pairs and generated system/qualifier pairs. Both parents
already existed; this is not a complete ingestion or arbitrary formula recipe.
{% endcapture %}

{% capture create_plugin %}
### Plugin create — bounded API68 qualification

From the project containing `data360/mapping/CustomerMapping.mapping-meta.json`:

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

Installed API68/default mixed creation passed with reverse-order selectors;
execution still created DLO → DMO → Mapping. This is a bounded fresh-fixture result,
not arbitrary-schema or cross-org lifecycle qualification. Separate installed
API68 creation against existing compatible parents also passed with nonidentical
field names: `Alpha__c` → `Label__c`, alongside `Id__c` → `Id__c`. One POST returned
`201`; independent GET confirmed `ACTIVE` and all six pairs, including four generated
pairs. Matching source and target field names are not a prerequisite of this result.
Deploy/delete require exact `type:ApiName` selections, not bare types or wildcards.
Mixed deploy orders DLO → DMO → Mapping regardless of selector order and must
independently verify the requested parent definitions before mapping access.
Preview reports planned dependencies without writes; that installed check passed.
The corrected actual run independently confirmed parent definitions before mapping
creation and returned confirmed-created outcomes for all three families: native
DLO POST `201` → DMO POST `201` → mapping POST `201`. Do not
assume a DMO must report `ACTIVE` or be enabled merely because a DLO does.
{% endcapture %}

{% include operation-tabs.html id="mapping-create" label="Create" cli_state="available" cli_reason="Complete mapping between existing custom objects; formulas, filters and processing-free creation are not established." cli_body=create_cli api_state="available" api_reason="Bounded native API68 create with independent ACTIVE readback." api_body=create_api plugin_state="available" plugin_reason="Installed API68 reverse-order mixed create passed with independent parent and mapping readbacks." plugin_body=create_plugin %}

## Update

**Shared restriction (CLI / API / Plugin):** the completed native Connect REST
API68 comparison rejected changing only the DLO, only the DMO, or both through the
field-mapping PATCH route, for both last and non-last mappings. All six requests
returned HTTP `404` for an input/existing-binding mismatch, not an absent original
mapping. This is not a claim that every update is impossible: a separate native
API68 selector-free field-mapping PATCH successfully added a field pair, whereas
the Metadata API example below establishes only a label change. These API results
do not establish experimental coverage of CLI and Plugin retargeting.
{: .mapping-shared-restriction }

{% capture update_cli %}
The verified change is the **label only**. Edit `masterLabel` in the complete file, leaving all pairs and object references alone:

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

Then deploy it:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5
```

The file entry can report `Changed`; sending the same file again can report `Unchanged`. These are separate invocations, and neither proves that Salesforce performed no internal work. Read back the label and pairs. Retargeting, field removal and formula/filter updates have not been verified.

{% endcapture %}
{% capture update_api %}
Native API68 `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}/field-mappings?dataspace=default`
added one names-only field pair without a historical selector. Independent GET
confirmed the addition and preserved prior pairs/selectors. Replaying the same API
addition was idempotent, not proof that the plugin performs zero writes. Attempts
to replace an existing target pair could return `200` while ignoring the request;
adding another target for an existing source was additive, not replacement.

A separate native API68 request added **two independent Text pairs in one PATCH**:
`Beta__c` → `Beta__c` and `Gamma__c` → `Gamma__c`. HTTP `200` was followed by independent
`ACTIVE` readback: six pairs became eight, each new pair appeared exactly once, and
all six prior pair objects and selectors were preserved. Both DLO representations
were unchanged; the DMO schema, keys, identity and other properties were preserved,
allowing the expected per-field `isMapped` flags. This qualifies that two-pair
request, not arbitrary batch sizes or unrestricted replacement. The current plugin
passed the bounded installed Text batch-addition and reconciliation checks below.
{% endcapture %}

{% capture update_plugin %}
### Plugin update — bounded installed API68 desired-state acceptance

Edit `fieldMappings` in the canonical JSON, preserving the DLO/DMO bindings and
all protected pairs. Preview the exact selection before execution:

```sh
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
sf data360 deploy -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

The current implementation resolves fresh target bindings/name and compares exact
logical pair sets; saved selectors are never target IDs. At API68, omitting an
eligible authored pair from `fieldMappings` requests its removal, not just an
addition-only delta. Preview lists ordered unmaps followed by additions. Execution
uses freshly observed field selectors for individual DELETEs, verifies preservation
after each, then sends additions in one selector-free PATCH (`fieldMapping` on the
wire). It requires exact final desired pairs and preserved retained selectors,
parents and inventory. There is no write retry or rollback; a failure after any
write is failed/unknown, and a mixed batch stops at that item.

This is deliberately narrow: removals require qualified custom nonkey identity
Text/Number pairs with uniquely mapped targets. Additions in reconciliation are
custom nonkey Text pairs with no special usage/qualifier or conflicting target.
Both same-source/new-target and new-source/same-target **Text field-pair** retargets
are implemented; they do not change the mapping's DLO/DMO bindings. Native API68
evidence proved those two directions on the same fresh empty fixture in sequence,
not on populated objects or arbitrary schemas. Protected primary-key, qualifier
and system pairs cannot be omitted. The full desired plan and fresh evidence-bound
parent policy must pass before the first write; later drift stops execution.
API61–67 deletion admission does not widen this API68-only reconciliation path.
The existing single compatible addition path, including Number, is preserved.

In simple terms: remove an eligible custom pair from `spec.fieldMappings` and deploy
that complete JSON file to remove the field mapping. The guarded operation removes
the connection, not the DMO field itself, within the bounded scope described here.
Keep the protected key, qualifier and system pairs. For a field-pair retarget,
replace the old pair with the new one; execution removes the old connection before
adding the new one. This does not retarget the source DLO or target DMO.

Omit `--json` for readable output. Each component has its own action line with its
type and API name. After a confirmed mapping update, separate comma-separated
`Deleted field mappings: source -> target, ...` and
`Added field mappings: source -> target, ...` lines show the changed pairs. Empty
lists are omitted; a retarget appears in both. Preview lines say `Planned`;
unchanged or failed updates do not claim completed field changes. `--json` retains
the structured result without these human-readable lines.

Execution finishes with `Deployed: n (x created / y updated / z failed)`; `n` counts
only confirmed created and updated components, not unchanged, blocked or
unattempted items or individual field operations. A failed mapping counts once as failed, not as updated. Preview
does not claim completed deployments. For example:
`Deployed: 2 (1 created / 1 updated / 1 failed)`.

Readable retrieval output lists each successful name, grouped by type, then
`Downloaded mapping: n` after the mapping items. The count includes unchanged
local files retrieved successfully, but excludes failed names. Named, type-only
and bare selection use the same successful-component count, never API `totalSize`.
This display change does not establish mapping inventory completeness or qualify
the unconfirmed inventory workflows described above.

**Historical installed acceptance:** the previous implementation added only
`Beta__c` → `Beta__c` with exactly one selector-free PATCH `200`, preserving
all six previous pairs/selectors. The DLO representation and DMO schema, key and
label were unchanged; the DMO's derived `Beta__c.isMapped: true` flag appeared as
expected, so the entire raw DMO was **not** unchanged across this update.
Unchanged redeployment both before and after the addition passed with zero writes
after fresh reads. Saved source selectors are never replayed as target IDs.

Earlier installed API68 checks refused adding `Beta__c` and `Gamma__c` together
with `UNSUPPORTED_MAPPING_MULTI_PAIR_UPDATE`, zero writes and an unchanged mapping.
That is historical behavior, not the current implementation's batch limit. After
the native two-pair addition, deploying the complete canonical definition was
unchanged with zero writes.

**Completed installed API68 reconciliation:** one canonical JSON change removed
`A__c` → `A__c` and batch-added `D__c` → `D__c` plus `E__c` → `E__c`.
Execution used one observed-selector DELETE `204`, then one names-only PATCH `200`.
Separate changes retargeted `B__c` → `B__c` to `B__c` → `C__c`, then
`D__c` → `D__c` to `F__c` → `D__c`, each with DELETE `204` then PATCH `200`.
These ran sequentially on the same fresh empty fixture, not independent pristine
fixtures. Each preview and unchanged repeat performed zero writes. Independent
GETs verified exact desired pairs, retained selectors, full DLO preservation,
DMO schema/nonflag preservation and only expected mapped-flag changes.
Installed removal coverage here is Text only, not Number removal.

A compatible **Number** pair, `Count__c` → `Count__c`, then passed as a single
plugin addition: one names-only PATCH `200`, independent `ACTIVE` readback from eight
to nine pairs, and preservation of all eight prior pair objects/selectors. Parent
definitions were preserved with only expected DMO `isMapped` flag changes allowed.
Repeating that deployment was unchanged with zero writes. This qualifies one
compatible Number addition, not every data type, Number-based creation or plugin
multi-pair updates.
{% endcapture %}

{% include operation-tabs.html id="mapping-update" label="Update" cli_state="available" cli_reason="Label-only update; retargeting, field removal and formula/filter updates are not verified." cli_body=update_cli api_state="available" api_reason="Native API68 selector-free one-pair and qualified two-independent-Text-pair additions passed; not arbitrary batch sizes, replacement or removal." api_body=update_api plugin_state="available" plugin_reason="Historical installed single-pair Text/Number additions passed. Bounded installed API68 Text removal, two-pair Text batch addition and both Text pair-retarget directions passed; no general reconciliation guarantee." plugin_body=update_plugin %}

### Individual field-pair removal: separate API67 facade evidence

A selector-aware **API67 MCP facade** operation removed ordinary `Alpha__c`, then
`Beta__c` pairs: **7 → 6 → 5 pairs**. Each selector came from the observed target
mapping, not a guessed name or source artifact. Independent API67 GETs after every
attempt confirmed the mapping stayed `ACTIVE`, unchanged bindings and unaffected
pairs/selectors, and preservation of both parents and their key/schema settings.

Deleting primary-key `Id__c` was rejected. Deleting `KQ_Id__c`, `DataSource__c`,
`DataSourceObject__c` and `InternalOrganization__c` was also rejected because they
were system-generated mappings. Those five pairs remained: removing all ordinary
nonkey pairs did **not** produce a zero-pair mapping or remove the relationship.
This is one qualified fixture, not a universal minimum pair count.

The facade returned HTTP `201` envelopes for both successful results and errors;
that is **not the underlying native DELETE status**. Later independent native
API61/API68 experiments returned `204` for observed-selector ordinary Text/Number
unmaps and preserved the bounded parent schemas. Those native experiments, not
this facade envelope, support the guarded implementation. Later installed API68
Text reconciliation and API61/API68 two-Text-pair deletion passed as described below;
they do not establish installed Number-removal coverage.

### Completed API68 binding-retarget comparison

On November 2, 2026, each case first tested the last mapping, then repeated the
attempt only after a separate DLO-to-original-DMO survivor mapping was independently
`ACTIVE`: two distinct DLO mappings then existed for the original DMO.

- **a — DLO only:** alternate source DLO, original target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **b — DMO only:** original source DLO, alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.
- **c — both:** alternate source DLO and alternate target DMO; last mapping HTTP
  `404`, then secondary/non-last mapping HTTP `404`.

All six used `PATCH /services/data/v68.0/ssot/data-model-object-mappings/{originalMappingName}/field-mappings?dataspace=default`,
with the desired source/target developer names and a names-only `Beta__c` →
`Beta__c` field addition. That valid Text field existed on every parent and was not
already mapped. The service rejected the mismatch between the requested bindings
and those resolved from the original mapping name (`Is Valid Interface: false`).
Independent original GETs returned HTTP `200`, `ACTIVE`, with the same name,
source/target selectors and all six field pairs; survivor mappings and all parent
schemas/primary keys were unchanged. Separate target/pair reads found no alternate
binding. No deletion was attempted in this comparison.

This establishes a limitation of that tested API68 route in one org, not universal
unavailability of every Salesforce retarget mechanism or plugin acceptance.
`replaceSource` was not attempted: its semantics were undocumented in the inspected
contract. Do not infer a replacement or last-mapping-deletion workaround from it.

## Delete

**Shared destructive-safety restriction:** deleting the last mapping for a target
DMO remains blocked; see
[Salesforce Help](https://help.salesforce.com/s/articleView?id=001993463&language=en_US&type=1).
A direct non-last DELETE can return HTTP `204` and still remove DMO fields.
A survivor alone is not a preservation guarantee. Never delete a parent or change
object bindings as a workaround. The guarded implementation below is narrower
than direct whole-mapping DELETE; installed acceptance is limited to the empty
fixtures and versions below, not general-purpose deletion.
{: .mapping-shared-restriction }

{% capture delete_api %}
**Partial coverage:** native API61/API68 unmap-first deletion preserved bounded empty
fixtures. Follow the [guarded sequence](#plugin-delete--guarded-unmap-first-implementation)
and its [native evidence and limits](#native-unmap-first-evidence-and-limits).
This is not a standalone direct-DELETE recipe or general preservation guarantee.
{% endcapture %}
{% capture delete_plugin %}
### Delete a whole mapping with the plugin

Use the actual server-returned mapping API name, not a DLO or DMO name. First
preview the exact target; this performs reads only:

```sh
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview
```

After reviewing the ordered plan and the safeguards below, execute by removing
`--preview`:

```sh
sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0
```

**There is no confirmation prompt or extra execution flag.** The second command
changes the org immediately if its guards pass. Bare `mapping` and wildcard
selections are not accepted. This deletes the selected relationship, not a local
JSON file or either parent object. To remove only eligible field pairs while
keeping the mapping, edit `spec.fieldMappings` in the complete JSON and use
[`sf data360 deploy` as described under Update](#update), not `delete`.

Deletion is **Partial**, not unrestricted: API61 and API68 have bounded installed
live acceptance; API62–67 are assumed compatible with synthetic coverage only.
The plugin first unmaps eligible custom pairs, retaining protected key/system
pairs, then deletes the mapping with parent-field preservation checks. The last
mapping for a **DMO** is blocked before any write. Being last for a **DLO** is a
different condition, not a global deletion block; the same-DMO survivor and every
other safeguard must still pass. Read the detailed restrictions below before use.
{% endcapture %}
{% include operation-tabs.html id="mapping-delete" label="Delete" cli_state="unknown" cli_reason="No qualified standalone out-of-the-box CLI deletion workflow is supplied." api_state="available" api_reason="Partial: native API61/API68 unmap-first deletion preserved bounded empty fixtures; no general-purpose deletion guarantee." api_body=delete_api plugin_state="available" plugin_reason="Partial: guarded API61/API68 deletion and zero-write last-DMO guards passed; API62–67 are assumed, not live-qualified." plugin_body=delete_plugin %}

### Plugin delete — guarded unmap-first implementation

Exact `mapping:ApiName` deletion now uses a guarded sequence rather than an
unconditional hold. Exact API61.0–68.0 pins are admitted; default/`auto` selects
68.0. Native API61 and API68 fixtures proved the sequence. API62–67 compatibility
is a user-accepted assumption with synthetic regression coverage, **not live
qualification or an installed CLI pass**. Other versions are rejected for this
path; numeric admission on unrelated read/create paths is not deletion support.

Before any write, the service verifies fresh complete mapping inventory, both
parents, pair classification and an independent ACTIVE survivor targeting the
same DMO. If this is the **last mapping for that DMO, it stops before even the
first individual field DELETE**. Another DMO on the same DLO does not satisfy this
check. Preview performs reads and reports the ordered plan without mutation; it
is not itself deletion acceptance.

For an admitted non-last mapping, ordinary qualified custom nonkey identity
Text/Number pairs with uniquely mapped targets are individually unmapped using
observed target selectors. Each step must preserve field names, types, keys,
other schema properties, DLOs, retained pairs and survivor mappings; only the
specific expected target `isMapped: true` → absent change is allowed. Unknown
classification, special usage/qualifiers, shared authored targets or drift blocks
continuation. Only five metadata-qualified identity pairs may remain: primary
`Id__c`, generated `KQ_Id__c`, `DataSource__c`, `DataSourceObject__c` and
`InternalOrganization__c`. Each must remain covered by the independently verified
survivor; generated pairs are not individually deleted.

After a fresh full comparison, one exact whole-mapping DELETE is followed by typed
absence and strict parent/survivor verification. A bounded read-only settlement
may allow a survivor's transient CREATING status to return to ACTIVE, never changed
pairs or schemas. A post-write failure is failed/unknown and stops the batch:
there is no mutation retry, rollback, raw-delete bypass, parent deletion fallback
or local JSON removal.

**Completed installed API61/API68 deletion:** each fresh selected mapping had five
protected pairs plus the identity Text pairs `A__c` and `B__c`; a distinct-DLO
survivor retained the five protected pairs plus identity Text `E__c`. At each
version, preview performed zero writes, and execution issued exactly three DELETEs
returning `204`: the observed A selector, B selector, then the mapping. Independent
GETs confirmed typed `404 NOT_FOUND` absence, exact survivor-only fixture inventory,
full unchanged DLOs, preserved DMO schema/nonflags and only A/B mapped flags changing
from true to absent. The survivor remained unchanged. Installed last-for-DMO preview
and execution both refused with `MAPPING_LAST_MAPPING_DELETE_BLOCKED` at API61 and
API68, before any unmap, with zero writes and independent unchanged readbacks.
API61 fixtures were provisioned at API68; this is not API61 creation proof.
These checks do not qualify installed Number removal, populated objects, arbitrary
schemas, shared targets, cross-org operation or API62–67 live behavior.

### Native unmap-first evidence and limits

At API61 and API68, fresh owned empty fixtures removed unique ordinary Text and
Number pairs one at a time (`204`), leaving the five protected pairs, then deleted
the selected non-last mapping once (`204`). Typed GET absence, complete inventory,
unchanged DLOs, preserved DMO schema and exact settled survivor equality confirmed
the bounded result. The survivor initially reported CREATING, then returned to
ACTIVE through read-only checks; it was not immediately byte-unchanged. The only
baseline DMO differences were the expected mapped-flag removals during unmaps.
API61 fixtures were provisioned at API68: this is API61 deletion/readback evidence,
not API61 creation proof. Neither fixture qualifies populated objects, arbitrary
pair types, shared targets, cross-org portability or universal preservation.

### Historical API68 whole-mapping DELETE evidence

Native DELETE used
`/services/data/v68.0/ssot/data-model-object-mappings/{serverMappingName}?dataspace=default`.
In the earlier bounded experiment, deleting the last mapping returned HTTP `500`;
a non-last mapping returned HTTP `204` with an empty body, followed by two exact
mapping GET `404` readbacks while both parent objects remained. Earlier installed
API68 acceptance also recorded a non-last DELETE `204`, independent typed `404`
absence, an `ACTIVE` byte-equivalent survivor and byte-equivalent parent definitions.
Those are historical fixture observations, not current support or a preservation
guarantee. They do not establish that CLI, API and Plugin deletion were all
experimentally tested.

A later observed non-last native DELETE HTTP `204` removed the selected mapping
**and the DMO's `Count__c`/`Gamma__c` fields**. The surviving mapping and both DLOs
remained unchanged, but the strict raw parent postcheck failed with
`MAPPING_PARENT_CHANGED`; the command exited nonzero with mutation unknown. This
was actual server-side field loss, not merely derived `isMapped` drift or readback
uncertainty. The command sends no parent DELETE; that does not prevent server-side
effects. This failure motivated the retired blanket hold and the later bounded
unmap-first implementation; it remains a warning against direct deletion.

The earlier comparison depended on the **target DMO's remaining DLO mappings**:
adding a second DMO to the same DLO did **not** unlock deletion of the first
mapping. A second DLO mapped to the same DMO allowed the observed non-last DELETE,
not a guarantee of safe deletion or a bypass for the guarded sequence.

Deleting the qualified empty, owned DMO cascaded its mapping and left the DLO
intact in a separate bounded observation. This is not permission to delete a
business or shared parent as a workaround, and does not establish a plugin cascade
feature.
