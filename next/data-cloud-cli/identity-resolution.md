---
layout: page
title: "Identity Resolution"
description: "API workflows using Salesforce CLI authentication and transport for Identity Resolution, with optional native API68 sf-plugin-data capabilities and verified limits."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/identity-resolution/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [api, plugin], method_statuses: { cli: "unknown", api: "yes", plugin: "partial" } }
  create: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  update: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

This badge does not verify untested writes or general CRUD support.

<a id="operational-identity-resolution"></a>

**Identity Resolution** finds records that likely describe the same person and chooses which values to keep. Its **ruleset** holds matching rules, which group records, and reconciliation rules, which pick values. Matching methods include `Fuzzy`, `Exact` and `ExactNormalized`. Reconciliation rules include `LastUpdated`, which keeps the newest value, and `MostFrequent`, which keeps the most common value.

**Example used in every chapter:** `Individual_cust`, a ruleset for the `Individual` profile.

Use the native API 68.0 route first. The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data#native-identity-resolution-plugin-retrieve-and-deploy) adds retrieve, create, update and delete for the qualified profile.

{% include crud-summary.html %}

**Plugin qualification:** The plugin handles any ruleset the API returns or accepts, in the default data space, at API 68.0. That includes any configuration type, automatic run on or off, case sensitivity, a secondary DMO, filters, trusted sources, and rulesets that are not published yet. The live-tested rulesets are listed under Evidence.

## Read

{% capture read_plugin %}
Saves the ruleset settings to a file in your project. Run this from the Salesforce project root:

```sh
sf data360 retrieve --metadata identity-resolution:Individual_cust --target-org SOURCE_ALIAS --api-version 68.0 --data-space default
```

The file is saved at `force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json`. The sample of that file is not in this guide yet.

**Known failures:**

- A file without `trustedSources` must be retrieved again before you deploy it.
{% endcapture %}
{% capture read_connect %}
### Native API68 read

Reads the ruleset over the native API 68.0 route. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --include
```

Excerpt of a published ruleset:

```json
{ "objectApiName": "Individual_cust", "rulesetId": "cust", "configurationType": "individual", "dataSpaceName": "default", "rulesetStatus": "PUBLISHED", "doesRunAutomatically": false, "secondaryDmo": "ssot__Individual__dlm", "reconciliationRules": [{ "entityName": "ssot__Individual__dlm", "ruleType": "lastupdated", "unifiedDmoName": "UnifiedssotIndividualcust__dlm", "linkDmoName": "UnifiedLinkssotIndividualcust__dlm" }] }
```

The full response also holds `id`, `filters`, `trustedSources`, the match rules and one reconciliation entry for each of the six entities. Enum values read in lower case, such as `individual`, `fuzzy` and `lastupdated`. The response is a server view, not the plugin file or a body you can send back. Compare two reads rather than trusting a write response. Wait for `PUBLISHED` and check all twelve output bindings.

{% endcapture %}
{% include operation-tabs.html id="ir-read" label="Read" cli_state="unknown" cli_reason="No standard CLI runtime ruleset retrieval workflow is supplied." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, listMetadata on IdentityResolution lists names, but readMetadata returns only the name and retrieve returns no file." connect_state="available" connect_reason="Native API68 read by name." connect_body=read_connect plugin_state="available" plugin_reason="Qualified native API68 retrieve of the full settings in the default data space." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the ruleset in the target org from the saved file. Preview first. The preview only reads.

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

Use an unused ruleset suffix of at most four characters, such as `cust`. Use the returned `objectApiName` exactly after creation. Create runs only when the owner is confirmed absent. Creation enters `PUBLISHING` and provisions generated outputs, so `--allow-processing` is required. The sample of the output is not in this guide yet.

Create and update enter `PUBLISHING` even with `doesRunAutomatically: false`. That flag does not stop publication. Get permission for publication before you run it. A ruleset with `doesRunAutomatically: true` can be created too.

Salesforce names a new ruleset `<configurationType>_<rulesetId>`, for example `Individual_cust`. The file name must follow that pattern, or be just `<configurationType>`. The plugin takes the ruleset ID from everything after `<configurationType>_`.

**Return without waiting (`--async`).** By default the deploy waits after the create until Salesforce reports the ruleset `PUBLISHED`, then checks its settings and its generated unified and link DMOs. Add `--async` to return as soon as Salesforce accepts the create:

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing --async
```

The result is `creation-processing` with mutation `acknowledged-processing`, and the command exits 0. `--async` works for Identity Resolution only; a selection without a ruleset is refused with `INVALID_ASYNC_SCOPE`.

- **How it helps:** the command does not wait for publishing, which usually takes one to four minutes after the write, and you can deploy several rulesets in a row and check them later.
- **What it does not save:** the checks before the write run either way and take most of the time. In a live test an `--async` create still took about 9.5 minutes.
- **How it can hurt:** nothing confirms that publishing succeeded, that the settings stuck, or that the generated DMOs exist. Steps that need the published ruleset fail if you run them right away: a Data Graph on the unified DMO needs a `PUBLISHED` owner, and its preview reports `DATA_GRAPH_OWNER_NOT_PUBLISHED`. Deploying the same file again is refused with `IDENTITY_RESOLUTION_NOT_SETTLED` while the ruleset is still publishing. A failed publish looks like a slow one until you run the deploy again.

To check the result, run the same deploy again. `IDENTITY_RESOLUTION_NOT_SETTLED` means it is still publishing; `unchanged` means it settled as written.

**Known failures:**

- A timeout or unknown result stops the batch. Inspect the exact owner in API68. Do not replay the write.
- `IDENTITY_RESOLUTION_NAME_TYPE_MISMATCH`: the file name does not start with its configuration type.
{% endcapture %}
{% capture create_connect %}
### Native API68 create

Creates the ruleset from a complete definition. The body is input-shaped, not the GET response.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions' --target-org TARGET_ALIAS --method POST --body '@ir-native-create.json' --include
```

Save `ir-native-create.json`. It matches on first name, last name and normalized email, and keeps the newest value for all six reconciliation entities:

```json
{
  "configurationType": "Individual",
  "rulesetId": "cust",
  "dataSpaceName": "default",
  "secondaryDmo": "ssot__Individual__dlm",
  "label": "Customer Identity",
  "description": "Resolve customers using name and normalized email",
  "doesRunAutomatically": false,
  "isCaseSensitive": true,
  "matchRules": [
    {
      "label": "Name and normalized email",
      "criteria": [
        { "entityName": "ssot__Individual__dlm", "fieldName": "ssot__FirstName__c", "matchMethodType": "Fuzzy", "shouldMatchOnBlank": false, "caseSensitiveMatch": false },
        { "entityName": "ssot__Individual__dlm", "fieldName": "ssot__LastName__c", "matchMethodType": "Exact", "shouldMatchOnBlank": false, "caseSensitiveMatch": false },
        { "entityName": "ssot__ContactPointEmail__dlm", "fieldName": "ssot__EmailAddress__c", "matchMethodType": "ExactNormalized", "shouldMatchOnBlank": false, "caseSensitiveMatch": false }
      ]
    }
  ],
  "reconciliationRules": [
    { "entityName": "ssot__Individual__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointEmail__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointPhone__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointAddress__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointApp__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__PartyIdentification__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] }
  ]
}
```

The body carries the configuration type, the unused `rulesetId` suffix, the data space, the secondary DMO, the label, the description, the automatic-run and case flags, the match rules and all six reconciliation entities with ordered `sources` and field overrides in `fields`. It omits server IDs, status and generated output names. Empty `filters` and `trustedSources` are left out. The sample of the response is not in this guide yet. Check exact absence, capacity, dependencies and publication permission before you submit.

Salesforce names the new ruleset `<configurationType>_<rulesetId>`, for example `Individual_cust`. `doesRunAutomatically: true` is accepted. In a live test such a ruleset with one match rule went from `PUBLISHING` to `PUBLISHED` in about 11.5 minutes, and its unified output DMO was then readable.

{% endcapture %}
{% include operation-tabs.html id="ir-create" label="Create" cli_state="unknown" cli_reason="No standard CLI runtime ruleset creation workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="The Metadata API returns no ruleset definition to deploy, and a create through it has not been tested." connect_state="available" connect_reason="Native API68 full-settings POST. Creation publishes." connect_body=create_connect plugin_state="available" plugin_reason="Qualified native API68 create of an absent Individual owner, with processing acknowledgement." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Retrieves the current ruleset, then changes only the settings you need. Preview first, then apply the change:

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

Run the retrieve first with `--target-org TARGET_ALIAS`. Keep all other settings and the identity unchanged. Source priority order matters, so do not sort it. An empty explicit field-override list resets fields to object inheritance. An unchanged definition returns `unchanged`, writes nothing and needs no processing acknowledgement. The sample of the output is not in this guide yet.

If you empty the filters or trusted sources in the file, the plugin sends an empty list and Salesforce decides.

**Known failures:**

- A timeout or unknown result stops the batch. Do not replay the update.
- Changing `configurationType` or the secondary DMO of an existing ruleset is refused as `blocked-changes`, because the update cannot carry that change.
- A ruleset that reads `PUBLISHING` or `DELETING` is refused with `IDENTITY_RESOLUTION_NOT_SETTLED`. Wait for it to settle, then run again.
{% endcapture %}
{% capture update_connect %}
### Native API68 update

Sends the complete intended settings with one PATCH. Run it only after a fresh GET shows the owner is `PUBLISHED`.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method PATCH --body '@ir-native-update.json' --include
```

Save `ir-native-update.json`. It changes the description and the Individual reconciliation rule from `LastUpdated` to `MostFrequent`, and sends everything else unchanged:

```json
{
  "label": "Customer Identity",
  "description": "Prefer the most frequent customer values",
  "doesRunAutomatically": false,
  "isCaseSensitive": true,
  "matchRules": [
    {
      "label": "Name and normalized email",
      "criteria": [
        { "entityName": "ssot__Individual__dlm", "fieldName": "ssot__FirstName__c", "matchMethodType": "Fuzzy", "shouldMatchOnBlank": false, "caseSensitiveMatch": false },
        { "entityName": "ssot__Individual__dlm", "fieldName": "ssot__LastName__c", "matchMethodType": "Exact", "shouldMatchOnBlank": false, "caseSensitiveMatch": false },
        { "entityName": "ssot__ContactPointEmail__dlm", "fieldName": "ssot__EmailAddress__c", "matchMethodType": "ExactNormalized", "shouldMatchOnBlank": false, "caseSensitiveMatch": false }
      ]
    }
  ],
  "reconciliationRules": [
    { "entityName": "ssot__Individual__dlm", "ruleType": "MostFrequent", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointEmail__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointPhone__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointAddress__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__ContactPointApp__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] },
    { "entityName": "ssot__PartyIdentification__dlm", "ruleType": "LastUpdated", "shouldIgnoreEmptyValue": true, "sources": [], "fields": [] }
  ]
}
```

The body leaves out the identity settings (`configurationType`, `rulesetId`, `dataSpaceName`, `secondaryDmo`), which an update cannot change. Send `filters` or `trustedSources` as empty lists only when the current ruleset has entries you want removed. The sample of the response is not in this guide yet. Send the full matching array and all six reconciliation entities. A sparse PATCH is not safe. Leave out GET-only identity, status and output fields. Compare the desired and current settings yourself before you write. Do not PATCH while a fresh GET shows `PUBLISHING` or `DELETING`: you cannot tell your change from the work already running. Wait for `PUBLISHED` and all twelve output bindings. Do not replay the write or attempt rollback.

**Known failures:**

- An update sent while the ruleset is `PUBLISHING` can fail inside an otherwise successful response: the HTTP status and CLI exit code report success, but the change is not applied. This was seen on the API 67 route and not tried on API 68. Read the ruleset back after it reaches `PUBLISHED` and check that your change is there.

{% endcapture %}
{% include operation-tabs.html id="ir-update" label="Update" cli_state="unknown" cli_reason="No standard CLI runtime ruleset update workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="The Metadata API returns no ruleset definition to deploy, and an update through it has not been tested." connect_state="available" connect_reason="Native API68 full matching and reconciliation PATCH." connect_body=update_connect plugin_state="available" plugin_reason="Full-settings update with ordered sources and override reset; an equal settled definition is unchanged." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes the ruleset after checks. Use one exact selector and its saved file. Get approval for the exact target, and check its consumers first. Preview only reads.

```sh
sf data360 delete --metadata identity-resolution:Individual_cust --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 delete --metadata identity-resolution:Individual_cust --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --confirm-delete
```

Output of a successful run:

```text
deleted identity-resolution Individual_cust (server is still processing)
```

The output shows `deletion-processing` and `acknowledged-processing`. That acknowledges ongoing removal. It does not confirm deletion.

A ruleset with automatic run on or off can be deleted. In a live test the deleted ruleset read `DELETING` for about 3.5 minutes, then not found, and its unified output DMO was gone.

**Known failures:**

- A later read can show `DELETING_OFFCORE`. That is not confirmed deletion.
- A ruleset that reads `PUBLISHING` or `DELETING` is refused with `IDENTITY_RESOLUTION_NOT_SETTLED`.
- A timeout or unknown result stops the batch. Do not replay DELETE. Check the state with read-only calls.
{% endcapture %}
{% capture delete_connect %}
### Native API68 delete (owned disposable ruleset only)

Deletes one owned, disposable ruleset by its record ID. Get explicit approval for that exact owner first. Read it by ID and by API name, and check its consumers.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method DELETE --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method GET --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_API_NAME' --target-org TARGET_ALIAS --method GET --include
```

Replace both placeholders with the owner's ID and API name. A successful DELETE returns HTTP 204 with no body. The sample of the follow-up GET is not in this guide yet. Poll with read-only GET calls until both exact identities are not found. Do not repeat DELETE. Never delete generated DMOs by hand to race the cleanup.

A ruleset with `doesRunAutomatically: true` can be deleted too. In a live test it read `DELETING` for about 3.5 minutes, then the reads by ID and by name returned not found, the ruleset was gone from the list, and its unified output DMO answered `ITEM_NOT_FOUND`.

{% endcapture %}
{% include operation-tabs.html id="ir-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI runtime ruleset deletion workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="A delete through the Metadata API has not been tested." connect_state="available" connect_reason="Owned native API68 cleanup by ID, confirmed by exact ID and name." connect_body=delete_connect plugin_state="available" plugin_reason="Bounded native API68 source-backed DELETE: acknowledged processing, not terminal absence or physical cleanup." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Latest source-org acceptance.** Native API68 supports full matching and reconciliation settings. The latest source-org acceptance confirmed CREATE, canonical retrieval and a zero-write unchanged repeat. It found twelve stable generated output and link bindings. Native PATCH qualification is separate from that latest acceptance, which sent no PATCH. Neither establishes general cross-org migration, released-package acceptance or successful profile computation.

**Plugin retrieve.** The sample of the retrieved file is not in this guide yet. Retrieval keeps the labels and description, matching criteria with their blank and case flags, automatic-run and case settings, object reconciliation defaults, ordered source priorities and field overrides. Resolve target-local DMOs, fields and mapped DLO sources. Do not replay source record IDs or guess generated output names. The default and `auto` settings select native API68 for public retrieve and deploy. Installed API68 acceptance verified canonical retrieval and all twelve generated output and link bindings.

**Accepted rulesets.** The plugin keeps no local list of allowed settings. It checks the file's shape and identity, and Salesforce decides the rest. Ordered source priorities are meaningful and are not sorted. A live create of an `Individual` ruleset with automatic run on and one match rule (FirstName Fuzzy, LastName Exact and email) took about 11.5 minutes to reach `PUBLISHED`. Deleting it was accepted, the ruleset read `DELETING` for about 3.5 minutes, and then the ruleset and its unified output DMO were not found. Acceptance of the API does not mean every combination was tested live.

**Create evidence.** Installed API68 source-org acceptance created a full-settings owner. It confirmed `PUBLISHED` with equal settings and twelve output and link bindings. It then retrieved the owner and repeated deployment with zero writes. No explicit run or cross-org mutation was proved. The retained native68 POST returned HTTP 201 and `PUBLISHING`. An independent GET confirmed publication, full supported settings and all twelve generated bindings. The native POST body omits empty filters and trusted sources. Use all six qualified entities, with independently verified target fields and sources. Settlement is bounded. An unconfirmed write is `unknown`, stops the batch and is not retried or rolled back.

**Update evidence.** Separate native PATCH qualification covers matching, defaults, ordered source priorities, field overrides, override reset and inheritance. It was followed by independent full-settings and output preservation checks. The latest installed acceptance verified CREATE, retrieve and no-op, not a mutating PATCH. The low-level API command does not detect semantic no-ops. Compare the settings yourself to avoid an unnecessary write. Stop on `unknown` without a write replay or rollback. The native PATCH must not be retried after an uncertain result.

**Delete evidence.** Preview is read-only. Installed acceptance observed 52 reads and zero writes. Execution freshly resolves the target identity, compares the complete supported settings and checks output and dependency proofs. It then sends at most one native ID-based DELETE. No wildcard or batch selection, manual generated-DMO deletion, cascade or explicit computation is supplied. Exhaustive external-consumer exclusion is not proved.

Installed public plugin DELETE passed bounded API68 acknowledged-processing acceptance. It sent one HTTP 204 and two post-delete GETs. The first strictly validated ID and name `DELETING` pair returned success promptly. Both responses passed the unchanged strict transition validator, including its narrowly admitted empty-reconciliation shape. Arbitrary, malformed or partial transitions do not qualify. Later `DELETING_OFFCORE` was observed, **not terminal absence**.

Only strict native `ITEM_NOT_FOUND` HTTP 404 reads for **both exact identities** establish `confirmed-deleted`. Already-absent execution is designed to return unchanged without a write or confirmation after strict absence proof. The latest installed run did not exercise that repeat because absence was unavailable. Optional full preservation/output accessibility checks were incomplete; physical profile/output cleanup is unproven. A transport or readback failure remains unknown. It must not trigger retries or rollback.

**Owned cleanup evidence.** Retained cleanup deleted one exact owned disposable owner by record ID, after checking its recorded org, ID, name and dependencies. It returned HTTP 204. Independent reads by both exact ID and API name then confirmed absence. The collection count decreased by one. Twelve outputs were missing **or inaccessible** afterward and no DMOs were manually deleted. Physical profile-row cleanup remains unproven. HTTP 204 or temporary `DELETING` is not terminal proof. Generated outputs can remain readable during `DELETING`. Later unreadability means absent **or inaccessible**, not proof of physical deletion. Local request files and retrieved templates remain on disk.

**Data Graph root check.** Read the exact ruleset through the native endpoint. Its reconciliation entries identify the unified DMOs (`unifiedDmoName`). Correlate the returned unified Individual output with the graph's logical root. Do not derive ownership from a suffix, label, graph-node ID or DMO ID. Read the generated output objects and compare the root's field names, Text types and explicit Id key. A matching object name alone is insufficient.

The plugin's graph `--preview` does this lookup for you: it reads the rulesets and names the published owner of a unified root, or reports that none owns it. In a live test, preview of a graph on a new unified root reported the missing root before the ruleset existed, and named the `PUBLISHED` owner afterwards. A graph on that root was then created, updated and deleted. See [Data Graphs](/next/data-cloud-cli/data-graphs/#create).

**Two-org qualification.** Retained owned `PUBLISHED` rulesets and all twelve output and link DMOs were correlated in each org. The paired outputs had the same portable API identities but different org-local IDs. The unified Individual roots had compatible Id, FirstName and LastName Text fields and an explicit Id key. This establishes owner, output and schema compatibility. It does not establish cross-org ruleset creation or migration, a successful IR data run, or permission to reuse source IDs. Resolve the owner and its outputs in each org.

**Example scope.** This example was tested in the default dataspace in the source org. It does not establish that every matching-rule combination or another org will work. `--include` prints HTTP status and headers separately from the server body. Salesforce may add reconciliation entities beyond the ones you send. Keep the returned identity and generated output references for later checks.

**Metadata API (read-only, API 68.0):** `IdentityResolution` is not listed by `describeMetadata`, yet `listMetadata` on `IdentityResolution` returned the names of all seven rulesets in the org. `readMetadata` for one of them returned only its name, and a `retrieve` of that member returned no file. So the Metadata API gives no ruleset settings to read or redeploy; use the native API 68 Connect routes or the plugin. Metadata API create, update and delete were not tried.

**Not verified:** general cross-org migration or creation, released-package acceptance, successful profile computation or IR data runs, other matching-rule combinations, other orgs, arbitrary editing, a mutating native PATCH in the latest acceptance, the already-absent DELETE repeat, physical profile-row cleanup, the complete optional preservation and output follow-up, exhaustive external-consumer exclusion, an update that empties filters or trusted sources, and configuration types other than `Individual`.

</details>