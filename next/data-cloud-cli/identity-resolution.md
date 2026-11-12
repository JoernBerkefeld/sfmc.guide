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

**Plugin qualification:** The plugin supports only the qualified `Individual` profile in the default data space, at API 68.0.

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
### Native API68

Reads the ruleset over the native API 68.0 route. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --include
```

The sample of this response is not in this guide yet. The response is a server view, not the plugin file or a body you can send back. Compare two reads rather than trusting a write response. Wait for `PUBLISHED` and check all twelve output bindings.

### API 65 and API 67 routes

These reads are separate routes. They are not a fallback after an uncertain write.

Read through the native API 65 endpoint:

```sh
sf api request rest '/services/data/v65.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --include
```

Read through the API 67 execute route. Save `ir-get.json`:

```json
{ "toolName": "d360_ir_get", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json'
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHED" }
```

Both reads print to stdout and leave the ruleset unchanged.
{% endcapture %}
{% include operation-tabs.html id="ir-read" label="Read" cli_state="unknown" cli_reason="No standard CLI runtime ruleset retrieval workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 read first; API 65 and API 67 reads are separate routes." connect_body=read_connect plugin_state="available" plugin_reason="Qualified native API68 retrieve of the full settings in the default data space." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Creates the ruleset in the target org from the saved file. Preview first. The preview only reads.

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

Use an unused ruleset suffix of at most four characters, such as `cust`. Use the returned `objectApiName` exactly after creation. Create runs only when the owner is confirmed absent. Creation enters `PUBLISHING` and provisions generated outputs, so `--allow-processing` is required. The sample of the output is not in this guide yet.

Create and update enter `PUBLISHING` even with `doesRunAutomatically: false`. That flag does not stop publication. Get permission for publication before you run it.

**Known failures:**

- A timeout or unknown result stops the batch. Inspect the exact owner in API68. Do not replay the write.
{% endcapture %}
{% capture create_connect %}
### Native API68

Creates the ruleset from a complete definition. The body is input-shaped, not the GET response.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions' --target-org TARGET_ALIAS --method POST --body '@ir-native-create.json' --include
```

The sample of this response is not in this guide yet. Build the body from the intended settings: `configurationType: "Individual"`, `dataSpaceName: "default"`, `secondaryDmo: "ssot__Individual__dlm"`, the unused `rulesetId` suffix, the label, the description and the automatic-run and case flags. Include all six reconciliation entities with ordered sources. Omit server IDs, status and generated output names. Check exact absence, capacity, dependencies and publication permission before you submit.

### API 65 and API 67 routes

This example is separate from the native route. It is not a fallback. Save `ir-create.json`. It matches on first name, last name and normalized email, and starts with a `LastUpdated` reconciliation rule:

```json
{
  "toolName": "d360_ir_create",
  "paramsJson": "{\"input\":{\"configurationType\":\"Individual\",\"dataSpaceName\":\"default\",\"label\":\"Customer Identity\",\"description\":\"Resolve customers using name and normalized email\",\"rulesetId\":\"cust\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"LastUpdated\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-create.json' --include
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHING" }
```

Check nested `body.error` inside the response as well as the result. HTTP `201` and CLI exit `0` can still contain an operation error. Keep the returned identity for later checks.
{% endcapture %}
{% include operation-tabs.html id="ir-create" label="Create" cli_state="unknown" cli_reason="No standard CLI runtime ruleset creation workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 full-settings POST; API 65 and API 67 examples are separate. Creation publishes." connect_body=create_connect plugin_state="available" plugin_reason="Qualified native API68 create of an absent Individual owner, with processing acknowledgement." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Retrieves the current ruleset, then changes only the settings you need. Preview first, then apply the change:

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

Run the retrieve first with `--target-org TARGET_ALIAS`. Keep all other settings and the identity unchanged. Source priority order matters, so do not sort it. An empty explicit field-override list resets fields to object inheritance. An unchanged definition returns `unchanged`, writes nothing and needs no processing acknowledgement. The sample of the output is not in this guide yet.

**Known failures:**

- A timeout or unknown result stops the batch. Do not replay the update.
{% endcapture %}
{% capture update_connect %}
### Native API68

Sends the complete intended settings with one PATCH. Run it only after a fresh GET shows the owner is `PUBLISHED`.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method PATCH --body '@ir-native-update.json' --include
```

The sample of this response is not in this guide yet. Send the full matching array and all six reconciliation entities in `ir-native-update.json`. A sparse PATCH is not safe. Leave out GET-only identity, status and output fields. Compare the desired and current settings yourself before you write. Wait for `PUBLISHED` and all twelve output bindings. Do not replay the write, automatically fall back to API67 or attempt rollback.

### API 65 and API 67 routes

Change the Individual reconciliation rule from `LastUpdated` to **`MostFrequent`**, keeping the matching definition intact. Save `ir-update.json` with the full matching and reconciliation input and label:

```json
{
  "toolName": "d360_ir_update",
  "paramsJson": "{\"identityResolution\":\"Individual_cust\",\"input\":{\"label\":\"Customer Identity\",\"description\":\"Prefer the most frequent customer values\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"MostFrequent\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-update.json'
```

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "PUBLISHING", "reconciliationRules": { "rules": [{ "entityName": "ssot__Individual__dlm", "ruleType": "mostfrequent" }] } }
```

**Wait for `PUBLISHED` before updating**; an update during `PUBLISHING` can fail inside an otherwise successful response. Read back until publication settles. Then check the changed rule and the unchanged matches.

**Known failures:**

- An update sent during `PUBLISHING` can fail inside a successful response.
{% endcapture %}
{% include operation-tabs.html id="ir-update" label="Update" cli_state="unknown" cli_reason="No standard CLI runtime ruleset update workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Native API68 full matching and reconciliation PATCH; API 65 and API 67 examples are separate." connect_body=update_connect plugin_state="available" plugin_reason="Full-settings update with ordered sources and override reset; an equal settled definition is unchanged." plugin_body=update_plugin %}

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

**Known failures:**

- A later read can show `DELETING_OFFCORE`. That is not confirmed deletion.
- A timeout or unknown result stops the batch. Do not replay DELETE. Check the state with read-only calls.
{% endcapture %}
{% capture delete_connect %}
### Native API68 (owned disposable ruleset only)

Deletes one owned, disposable ruleset by its record ID. Get explicit approval for that exact owner first. Read it by ID and by API name, and check its consumers.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method DELETE --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method GET --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_API_NAME' --target-org TARGET_ALIAS --method GET --include
```

Replace both placeholders with the owner's ID and API name. A successful DELETE returns HTTP 204 with no body. The sample of the follow-up GET is not in this guide yet. Poll with read-only GET calls until both exact identities are not found. Do not repeat DELETE. Never delete generated DMOs by hand to race the cleanup.

### API 65 and API 67 routes

This example is separate from native cleanup. It is not a fallback. After you check dependencies and ownership, save `ir-delete.json`:

```json
{ "toolName": "d360_ir_delete", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-delete.json'
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json'
```

The read after the delete can still show:

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "DELETING", "reconciliationRules": [] }
```

Wait until the exact ruleset is not found. Confirm that the native API 65 GET returns HTTP `404` with `ITEM_NOT_FOUND`. Do not repeat DELETE during removal.
{% endcapture %}
{% include operation-tabs.html id="ir-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI runtime ruleset deletion workflow is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Owned native API68 cleanup by ID, confirmed by exact ID and name; API 65 and API 67 examples are separate." connect_body=delete_connect plugin_state="available" plugin_reason="Bounded native API68 source-backed DELETE: acknowledged processing, not terminal absence or physical cleanup." plugin_body=delete_plugin %}

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Latest source-org acceptance.** Native API68 supports full matching and reconciliation settings. The latest source-org acceptance confirmed CREATE, canonical retrieval and a zero-write unchanged repeat. It found twelve stable generated output and link bindings. Native PATCH qualification is separate from that latest acceptance, which sent no PATCH. Neither establishes general cross-org migration, released-package acceptance or successful profile computation.

**Plugin retrieve.** The sample of the retrieved file is not in this guide yet. Retrieval keeps the labels and description, matching criteria with their blank and case flags, automatic-run and case settings, object reconciliation defaults, ordered source priorities and field overrides. Resolve target-local DMOs, fields and mapped DLO sources. Do not replay source record IDs or guess generated output names. The default and `auto` settings select native API68 for public retrieve and deploy. Installed API68 acceptance verified canonical retrieval and all twelve generated output and link bindings.

**Admitted profile.** The admitted Individual profile has `doesRunAutomatically: false`, `isCaseSensitive: true`, empty filters and explicit `trustedSources: []`. It requires all six standard reconciliation entities. Matching uses qualified Fuzzy, Exact and ExactNormalized methods with blank and case flags. Object defaults are LastUpdated, MostFrequent or SourceSequence, or field overrides. Ordered source priorities are meaningful. Nonempty trusted sources and a case-sensitive FirstName criterion are refused. Validation is not live qualification of every combination.

**Create evidence.** Installed API68 source-org acceptance created a full-settings owner. It confirmed `PUBLISHED` with equal settings and twelve output and link bindings. It then retrieved the owner and repeated deployment with zero writes. No explicit run or cross-org mutation was proved. The retained native68 POST returned HTTP 201 and `PUBLISHING`. An independent GET confirmed publication, full supported settings and all twelve generated bindings. The native POST body omits empty filters and trusted sources. Use all six qualified entities, with independently verified target fields and sources. Settlement is bounded. An unconfirmed write is `unknown`, stops the batch and is not retried or rolled back.

**Update evidence.** Separate native PATCH qualification covers matching, defaults, ordered source priorities, field overrides, override reset and inheritance. It was followed by independent full-settings and output preservation checks. The latest installed acceptance verified CREATE, retrieve and no-op, not a mutating PATCH. The low-level API command does not detect semantic no-ops. Compare the settings yourself to avoid an unnecessary write. Stop on `unknown` without a write replay, API 67 fallback or rollback. The native PATCH must not be retried after an uncertain result.

**Delete evidence.** Preview is read-only. Installed acceptance observed 52 reads and zero writes. Execution freshly resolves the target identity, compares the complete supported settings and checks output and dependency proofs. It then sends at most one native ID-based DELETE. No wildcard or batch selection, manual generated-DMO deletion, cascade or explicit computation is supplied. Exhaustive external-consumer exclusion is not proved.

Installed public plugin DELETE passed bounded API68 acknowledged-processing acceptance. It sent one HTTP 204 and two post-delete GETs. The first strictly validated ID and name `DELETING` pair returned success promptly. Both responses passed the unchanged strict transition validator, including its narrowly admitted empty-reconciliation shape. Arbitrary, malformed or partial transitions do not qualify. Later `DELETING_OFFCORE` was observed, **not terminal absence**.

Only strict native `ITEM_NOT_FOUND` HTTP 404 reads for **both exact identities** establish `confirmed-deleted`. Already-absent execution is designed to return unchanged without a write or confirmation after strict absence proof. The latest installed run did not exercise that repeat because absence was unavailable. Optional full preservation/output accessibility checks were incomplete; physical profile/output cleanup is unproven. A transport or readback failure remains unknown. It must not trigger retries, API 67 fallback or rollback.

**Owned cleanup evidence.** Retained cleanup deleted one exact owned disposable owner by record ID, after checking its recorded org, ID, name and dependencies. It returned HTTP 204. Independent reads by both exact ID and API name then confirmed absence. The collection count decreased by one. Twelve outputs were missing **or inaccessible** afterward and no DMOs were manually deleted. Physical profile-row cleanup remains unproven. HTTP 204 or temporary `DELETING` is not terminal proof. Generated outputs can remain readable during `DELETING`. Later unreadability means absent **or inaccessible**, not proof of physical deletion. Local request files and retrieved templates remain on disk.

**Data Graph root check.** Read the exact ruleset through both the API 67 route and the native endpoint. Its reconciliation entries identify the unified DMOs (`unifiedDmoName`). Correlate the returned unified Individual output with the graph's logical root. Do not derive ownership from a suffix, label, graph-node ID or DMO ID. Read the generated outputs through API 65 Connect REST and Metadata API. Compare the root's field names, Text types and explicit Id key. A matching object name alone is insufficient.

**Two-org qualification.** Retained owned `PUBLISHED` rulesets and all twelve output and link DMOs were correlated in each org. The paired outputs had the same portable API identities but different org-local IDs. The unified Individual roots had compatible Id, FirstName and LastName Text fields and an explicit Id key. This establishes owner, output and schema compatibility. It does not establish cross-org ruleset creation or migration, a successful IR data run, or permission to reuse source IDs. Resolve the owner and its outputs in each org.

**Later Graph update.** The existing-owner target Graph update appended only its LastName projection. It preserved the target ruleset, all twelve output and link DMOs, and the root schema and key. No IR mutation was attempted. A repeat comparison found both resources unchanged. This is preservation during a dependent Graph update. It is not cross-org IR update or create proof, or a successful IR data run.

**Example scope.** This example was tested in the default dataspace in the source org. It does not establish that every matching-rule combination or another org will work. The JSON in the API 65 and API 67 sections are decoded operation-result excerpts, not complete raw server responses or CLI envelopes. `--include` prints HTTP status and headers separately from the server body. Salesforce may add reconciliation entities beyond the ones you send. Keep the returned identity and generated output references for later checks.

**Not verified:** general cross-org migration or creation, released-package acceptance, successful profile computation or IR data runs, other matching-rule combinations, other orgs, arbitrary editing, a mutating native PATCH in the latest acceptance, the already-absent DELETE repeat, physical profile-row cleanup, the complete optional preservation and output follow-up, and exhaustive external-consumer exclusion.

</details>