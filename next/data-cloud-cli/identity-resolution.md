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
  retrieve: { status: "yes", methods: [api, plugin], method_statuses: { cli: "unknown", api: "yes", plugin: "partial" } }
  create: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  update: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
  delete: { status: "partial", methods: [api, plugin], method_statuses: { cli: "unknown", api: "partial", plugin: "partial" } }
---

*Prior documentation record: October 30, 2026, 15:50 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="operational-identity-resolution"></a>

**Identity Resolution** combines records believed to represent the same person. Its **ruleset** contains matching rules (which records belong together) and reconciliation rules (which value to keep when records disagree). Here `Fuzzy` allows similar names, `Exact` requires an exact match and `ExactNormalized` compares normalized values. `LastUpdated` prefers the most recently updated values; `MostFrequent` prefers the most common. These choices affect real profiles, not just labels.

Start with native **API68**. The optional [sf-plugin-data plugin](https://github.com/JoernBerkefeld/sf-plugin-data#native-identity-resolution-plugin-retrieve-and-deploy) supports bounded full-settings retrieval, CREATE, PATCH and source-backed acknowledged-processing DELETE in the default data space. Direct native API68 GET/POST/PATCH and owned disposable ruleset DELETE have separate evidence; raw API transport is not a resource-specific out-of-the-box CLI command. Earlier API65 reads and API67 facade examples remain below, not an automatic fallback route.

**November 7, 2026 evidence reconciliation:** the committed native implementation supports full matching and reconciliation settings. Installed source-org acceptance separately confirmed CREATE, canonical retrieval and a zero-write unchanged repeat with twelve stable generated output/link bindings. Native PATCH qualification is separate from that latest acceptance, which sent no PATCH. Neither establishes general cross-org migration, released-package acceptance or successful profile computation. Installed public plugin DELETE separately passed bounded API68 acknowledged-processing acceptance: one HTTP204 and the first strictly validated ID/name `DELETING` readback pair returned success promptly. Later `DELETING_OFFCORE` was observed, **not terminal absence**; the already-absent repeat and complete optional preservation/output follow-up remain unverified.

After a timeout or uncertain write, stop and independently inspect the exact owner at API68. Do not replay the write, automatically fall back to API67 or attempt rollback. An acknowledged response alone does not establish settlement.

Use compatible existing Individual/name/ContactPointEmail fields and an unused ruleset suffix of **at most four characters**. The example uses `cust`; after creation, use the returned `objectApiName` exactly, rather than a display label or a name guessed from the suffix. This example was tested in the default dataspace in the source org. It does not establish that every matching-rule combination or another org will work.

**Create and update enter `PUBLISHING` even with `doesRunAutomatically: false`.** Obtain permission for publication/provisioning. That flag is not draft mode, and publication does not prove that a successful identity-resolution data run occurred.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_plugin %}
Use explicit API68 and default space for this qualified Individual profile; default/`auto` also selects native68 for public IR retrieve/deploy:

```sh
sf data360 retrieve --metadata identity-resolution:Individual_cust --target-org SOURCE_ALIAS --api-version 68.0 --data-space default
```

Run from your Salesforce project root. Retrieval saves the canonical file under the configured package, for example `force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json`. It retains labels/description, matching criteria and their blank/case flags, automatic-run/case settings, object reconciliation defaults, ordered source priorities and field overrides. Resolve target-local DMOs, fields and mapped DLO sources; do not replay source record IDs or guess generated output names. Legacy artifacts missing explicit `trustedSources` need fresh native retrieval before deployment.

Installed API68 acceptance verified canonical retrieval and all twelve generated unified/link output bindings. That is bounded source-org evidence, not portable IR creation/update or a successful data run.
{% endcapture %}
{% capture retrieve_api %}
### Native API68

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --include
```

Inspect the complete matching/reconciliation settings, exact owner identity and returned unified/link output names. Compare independent reads rather than treating a write response as persistence. Wait for `PUBLISHED` and verify all twelve output bindings before treating the qualified write as complete; publication is not proof of an IR data run. GET output is a server representation, **not** the plugin's portable artifact or a ready-to-send create/update body.

### Earlier API65/API67 reads

These retained observations are separate from the native68 workflow, not fallback after an uncertain write. Read through the native API 65 endpoint, or the API 67 facade:

```sh
sf api request rest '/services/data/v65.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --include
```

For the facade, save `ir-get.json`:

```json
{ "toolName": "d360_ir_get", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json'
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHED" }
```

Compare identity, matching rules, reconciliation values and generated references. **Wait for `PUBLISHED` before updating**; an update during `PUBLISHING` can fail inside an otherwise successful response. Both reads print to stdout and leave the ruleset unchanged.

**Using an IR-generated output as a [Data Graph root](/next/data-cloud-cli/data-graphs/#retrieve):** Read the exact ruleset through both the facade and native endpoint. Its returned reconciliation entries identify the unified DMOs (`unifiedDmoName`); correlate the exact returned unified Individual output with the graph's logical root. Do not derive ownership from a suffix, label, graph-node ID or a DMO ID. Independently read the generated outputs through API 65 Connect REST and Metadata API, then compare the root's actual field names, Text types and explicit Id key. A matching object name alone is insufficient.

In the bounded two-org qualification, retained owned `PUBLISHED` rulesets and all twelve returned output/link DMOs were independently correlated in each org. The paired outputs had the same portable API identities but different org-local IDs. The unified Individual roots had the compatible Id, FirstName and LastName Text fields and explicit Id key required for the root-only graphs. This establishes existing-owner/output/schema compatibility, **not cross-org ruleset creation or migration**, a successful IR data run, or permission to reuse source IDs in the target. Resolve the owner and its returned outputs afresh in each org; do not provision or modify missing prerequisites merely to match this example.

The later [existing-owner target Graph update](/next/data-cloud-cli/data-graphs/#update) appended only its LastName projection and independently preserved this target ruleset, all twelve output/link DMOs and the root schema/key with their target-local identities. No IR mutation was attempted. A repeat comparison found both resources unchanged and sent no writes or explicit processing jobs. This is preservation of an existing owner during a dependent Graph update, **not cross-org IR update/create proof** or a successful IR data run.

{% endcapture %}
{% include operation-tabs.html id="ir-retrieve" label="Retrieve" cli_state="unknown" cli_reason="No standard CLI runtime ruleset retrieval workflow is supplied." api_state="available" api_reason="Native API68 read first; earlier API65/API67 observations remain separate." api_body=retrieve_api plugin_state="available" plugin_reason="Qualified native API68/default Individual full-settings canonical retrieval; not general cross-org migration." plugin_body=retrieve_plugin %}

## Create

{% capture create_plugin %}
Start with the canonical native file from Retrieve and a compatible target. For a new owner, use an independently confirmed unused identity `Individual` or `Individual_` plus one to four alphanumeric characters, updating its portable identity consistently. Do not copy source IDs. Preview and execute from the Salesforce project root:

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

Only independently confirmed exact-owner absence permits one POST; authentication, permission and other lookup failures must stop, not become CREATE. Dependencies are freshly target-bound before writing. Execution requires `--allow-processing` because CREATE publishes and provisions generated outputs even with automatic-run disabled. Preview is read-only.

The admitted Individual profile has `doesRunAutomatically: false`, `isCaseSensitive: true`, empty filters and explicit `trustedSources: []`. It requires all six standard reconciliation entities, qualified Fuzzy/Exact/ExactNormalized matching with blank/case flags, and LastUpdated/MostFrequent/SourceSequence object defaults or field overrides. Ordered source priorities are meaningful. Nonempty trusted sources and a case-sensitive FirstName criterion are unsupported; validation is not live qualification of every possible combination.

Installed API68 source-org acceptance created a full-settings owner, independently confirmed `PUBLISHED` with equal settings and twelve output/link bindings, retrieved it, then repeated deployment with zero writes. No explicit run or cross-org mutation was proved. Settlement is bounded; an unconfirmed write is `unknown`, stops the batch and is not retried or rolled back.
{% endcapture %}
{% capture create_api %}
### Native API68

Native POST takes a complete **input-shaped** definition in `ir-native-create.json`, not the GET response, plugin artifact or API67 facade envelope:

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions' --target-org TARGET_ALIAS --method POST --body '@ir-native-create.json' --include
```

Build the body from the intended qualified settings: `configurationType: "Individual"`, `dataSpaceName: "default"`, `secondaryDmo: "ssot__Individual__dlm"`, the unused `rulesetId` suffix when applicable, label/description, automatic-run and case flags. Native `matchRules` is an array of labeled rules whose `criteria` is an array; native `reconciliationRules` is an array of entity rules with object defaults, ordered `sources: [{ "name": "TARGET_DLO_API_NAME" }]` and explicit `fields` overrides. Criteria retain entity/field names, match method and blank/case flags; overrides retain field name, rule type, ignore-empty setting and ordered sources. Use all six qualified entities and independently verified target fields/sources, rather than inventing a minimal reconciliation list. Omit server IDs/status/generated output names; the qualified serializer retains empty filters/trusted sources in the portable file but does not send them in POST/PATCH.

The retained native68 POST returned HTTP201 and `PUBLISHING`; independent GET confirmed publication, full supported settings and all twelve generated bindings. Check exact absence, capacity, dependencies and publication permission **before** submitting. Do not issue another POST merely because settlement is slow or uncertain.

### Earlier API67 facade CREATE

This is a separate source-only example, not the current native payload or fallback. Save `ir-create.json`. It matches on first name, last name and normalized email, and starts with a `LastUpdated` reconciliation rule:

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

The JSON illustrations here are decoded operation-result excerpts, not the complete raw server response or a CLI envelope. `--include` prints HTTP status and headers separately from the server body. Check nested `body.error` inside the server/facade response as well as the decoded result: HTTP `201` and CLI exit `0` can still contain an operation error. Salesforce may add reconciliation entities beyond the one sent. Keep the returned identity and exact generated output/link references for later checks.

{% endcapture %}
{% include operation-tabs.html id="ir-create" label="Create" cli_state="unknown" cli_reason="No standard CLI runtime ruleset creation workflow is supplied." api_state="available" api_reason="Bounded native API68 full-settings POST and separate earlier API67 facade evidence; creation publishes." api_body=create_api plugin_state="available" plugin_reason="Qualified native68 exact-absent Individual CREATE with processing acknowledgement and independent settlement/output proof." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Freshly retrieve the exact settled target using the Retrieve plugin example with `--target-org TARGET_ALIAS`. Edit only supported intended settings in its canonical file, preserving all other configuration and identity. Preview, then acknowledge publication/processing:

```sh
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 deploy --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --allow-processing
```

An existing owner with a supported difference receives one full-settings PATCH. Matching rules, object reconciliation defaults, ordered source priorities and field overrides are part of that definition; an empty explicit field-override list resets fields to object inheritance. Preserve source priority order—sorting changes meaning. Target-local dependencies and generated bindings are independently verified. A semantically equal settled owner returns `unchanged` without a write and does not need processing acknowledgement.

Separate native PATCH qualification covers matching, defaults, ordered source priorities, field overrides, override reset and inheritance, followed by independent full-settings/output preservation checks. The latest installed acceptance verified CREATE/retrieve/no-op, **not a mutating PATCH**. These are bounded capabilities, not arbitrary editing, general cross-org mutation or successful profile computation. Wait for `PUBLISHED` and all twelve output bindings; stop on `unknown` without write replay, API67 fallback or rollback.
{% endcapture %}
{% capture update_api %}
### Native API68

After fresh GET confirms the exact owner is `PUBLISHED`, prepare `ir-native-update.json` with the complete intended supported settings described in Create: label/description, automatic-run/case flags, the full matching array and all six reconciliation entities with ordered sources and explicit field overrides. Do not send GET-only identity/status/output references or assume a sparse PATCH preserves omitted settings. Native arrays differ from the earlier facade's nested `rules` envelope.

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method PATCH --body '@ir-native-update.json' --include
```

The qualified native full-settings PATCH preserved matching/reconciliation configuration, including source ordering and field-override inheritance/reset behavior, through independent readback. Publication and all twelve exact output bindings must settle before success. Compare the complete desired/current settings yourself to avoid an unnecessary write; the low-level API command does not implement the plugin's semantic no-op detection or guards. Never retry or switch to API67 after an uncertain PATCH; inspect the exact native68 target first.

### Earlier API67 facade UPDATE

Let's change the Individual reconciliation rule from `LastUpdated` to **`MostFrequent`**, keeping the matching definition intact. Save `ir-update.json` with the full matching/reconciliation input and label, rather than assuming a sparse update will work:

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

Read back until publication settles, then check the changed rule and unchanged matches/identity. Do not issue another update while publishing. Broader matching grammar, repeat behavior and successful data runs are not covered by this example.

{% endcapture %}
{% include operation-tabs.html id="ir-update" label="Update" cli_state="unknown" cli_reason="No standard CLI runtime ruleset update workflow is supplied." api_state="available" api_reason="Qualified native68 full matching/reconciliation PATCH; earlier API67 example is separate." api_body=update_api plugin_state="available" plugin_reason="Qualified full-settings PATCH, ordered sources and override reset; equal settled definitions are zero-write unchanged." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Use one exact selector and its matching canonical source file from Retrieve, in the default data space at API68 (default/`auto` also selects68). The file expresses the intended configuration, not deletion permission or an ownership token. Obtain approval for the exact target and inspect known consumers/dependencies before execution.

```sh
sf data360 delete --metadata identity-resolution:Individual_cust --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --preview
sf data360 delete --metadata identity-resolution:Individual_cust --source-dir force-app/main/default/data360/identityResolution/Individual_cust.identityResolution.json --target-org TARGET_ALIAS --api-version 68.0 --data-space default --confirm-delete
```

Preview is read-only; installed acceptance observed 52 reads and zero writes. Execution freshly resolves target-local identity, compares complete supported settings and output/dependency proofs, rechecks the source, then sends at most one native ID-based DELETE. No wildcard/batch selection, manual generated-DMO deletion, cascade or explicit computation is supplied. Exhaustive external-consumer exclusion is not proved.

After HTTP204, the first **strictly validated pair** of exact ID/name `DELETING` responses returns `deletion-processing` / `acknowledged-processing` immediately, with human output `deleted identity-resolution Individual_cust (server is still processing)`. This is successful acknowledgement of ongoing removal, **not confirmed deletion**. Installed acceptance sent exactly one DELETE and two post-delete GETs; both responses passed the unchanged strict transition validator, including its narrowly admitted empty-reconciliation shape. Arbitrary/malformed/partial transitions do not qualify.

Only strict native `ITEM_NOT_FOUND` HTTP404 reads for **both exact identities** establish `confirmed-deleted`. Already-absent execution is designed to return unchanged without a write or confirmation after strict absence proof; the latest installed run did not exercise that repeat because absence was unavailable. Its later read returned `DELETING_OFFCORE`, which is neither the validated `DELETING` pair nor terminal absence. Do not replay DELETE; reconcile read-only. Optional full preservation/output accessibility checks were incomplete; physical profile/output cleanup is unproven. A transport or readback failure remains unknown and must not trigger retries, API67 fallback or rollback.
{% endcapture %}

{% capture delete_api %}
### Native API68 — owned disposable ruleset cleanup only

Retained cleanup deleted one exact owned disposable owner by **record ID**, after checking its recorded org/ID/name ownership and dependencies. It returned HTTP204; independent reads by both exact ID and API name subsequently confirmed absence and the collection count decreased by one. This is bounded historical raw API evidence, separate from the installed plugin's later acknowledged-processing acceptance, and not authorization to delete another ruleset.

Before using this route, obtain explicit deletion approval for that exact owner, freshly read it by ID and name in the intended org, compare the ownership record, and inspect consumers/dependencies. Save its exact generated output/link references for later checks. Replace both placeholders below with that confirmed owner's ID and API name—do not derive identity from a suffix or label:

```sh
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method DELETE --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_ID' --target-org TARGET_ALIAS --method GET --include
sf api request rest '/services/data/v68.0/ssot/identity-resolutions/OWNED_RULESET_API_NAME' --target-org TARGET_ALIAS --method GET --include
```

Poll read-only until both exact identities are not found; HTTP204 or temporary `DELETING` is not terminal proof. Do not repeat DELETE or fall back to API67 on timeout/uncertainty. In the retained cleanup, twelve outputs were missing **or inaccessible** afterward and no DMOs were manually deleted. Physical profile-row cleanup remains unproven. Never manually delete generated DMOs to race owner cleanup.

### Earlier API67 facade DELETE

This earlier bounded example is separate from native68 cleanup, not automatic fallback. After checking dependencies and ownership, save `ir-delete.json`:

```json
{ "toolName": "d360_ir_delete", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-delete.json'
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json'
```

The delete can return `{ "success": true }` while a following read still shows:

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "DELETING", "reconciliationRules": [] }
```

Wait for the exact ruleset to become not found, and independently confirm native API 65 GET returns HTTP `404` / `ITEM_NOT_FOUND`. Do not repeat DELETE during removal.

{% endcapture %}
{% include operation-tabs.html id="ir-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI runtime ruleset deletion workflow is supplied." api_state="available" api_reason="Owned native68 ID-based cleanup with exact ID/name absence; earlier API67 facade evidence remains separate." api_body=delete_api plugin_state="available" plugin_reason="Bounded native68 source-backed DELETE: installed acknowledged-processing acceptance, not terminal absence or physical cleanup." plugin_body=delete_plugin %}

Generated outputs can remain readable during `DELETING`. Check their captured references only after ruleset removal. Later unreadability means absent **or inaccessible**, not proof of physical deletion, profile-row removal or universal cleanup. Do not race the ruleset's cleanup by deleting DMOs yourself. Local request files and retrieved templates remain.
