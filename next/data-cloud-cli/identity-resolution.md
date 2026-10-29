---
layout: page
title: "Identity Resolution"
description: "Salesforce CLI workflows and verified operation limits for Operational Identity Resolution."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/identity-resolution/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  retrieve: { status: "yes", methods: [api] }
  create: { status: "partial", methods: [api] }
  update: { status: "partial", methods: [api] }
  delete: { status: "partial", methods: [api] }
---

*Last updated: October 29, 2026, 17:27 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="operational-identity-resolution"></a>

**Identity Resolution** combines records believed to represent the same person. Its **ruleset** contains matching rules (which records belong together) and reconciliation rules (which value to keep when records disagree). Here `Fuzzy` allows similar names, `Exact` requires an exact match and `ExactNormalized` compares normalized values. `LastUpdated` prefers the most recently updated values; `MostFrequent` prefers the most common. These choices affect real profiles, not just labels.

These API 67 MCP facade operations manage a live ruleset. A native API 65 GET is also shown, but equivalent native write endpoints and cross-org migration have not been verified. You do not need a custom data plugin or a kit for this route.

Use compatible existing Individual/name/ContactPointEmail fields and an unused ruleset suffix of **at most four characters**. The example uses `cust`; after creation, use the returned `objectApiName` exactly, rather than a display label or a name guessed from the suffix. This example was tested in the default dataspace in the source org. It does not establish that every matching-rule combination or another org will work.

**Create and update enter `PUBLISHING` even with `doesRunAutomatically: false`.** Obtain permission for publication/provisioning. That flag is not draft mode, and publication does not prove that a successful identity-resolution data run occurred.

{% include crud-summary.html %}

## Retrieve

{% capture retrieve_api %}
Read through the native API 65 endpoint, or the API 67 facade where needed:

```sh
sf api request rest '/services/data/v65.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --json
```

For the facade, save `ir-get.json`:

```json
{ "toolName": "d360_ir_get", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHED" }
```

Compare identity, matching rules, reconciliation values and generated references. **Wait for `PUBLISHED` before updating**; an update during `PUBLISHING` can fail inside an otherwise successful response. Both reads print to stdout and leave the ruleset unchanged.

**Using an IR-generated output as a [Data Graph root](/next/data-cloud-cli/data-graphs/#retrieve):** Read the exact ruleset through both the facade and native endpoint. Its returned reconciliation entries identify the unified DMOs (`unifiedDmoName`); correlate the exact returned unified Individual output with the graph's logical root. Do not derive ownership from a suffix, label, graph-node ID or a DMO ID. Independently read the generated outputs through API 65 Connect REST and Metadata API, then compare the root's actual field names, Text types and explicit Id key. A matching object name alone is insufficient.

In the bounded two-org qualification, retained owned `PUBLISHED` rulesets and all twelve returned output/link DMOs were independently correlated in each org. The paired outputs had the same portable API identities but different org-local IDs. The unified Individual roots had the compatible Id, FirstName and LastName Text fields and explicit Id key required for the root-only graphs. This establishes existing-owner/output/schema compatibility, **not cross-org ruleset creation or migration**, a successful IR data run, or permission to reuse source IDs in the target. Resolve the owner and its returned outputs afresh in each org; do not provision or modify missing prerequisites merely to match this example.

The later [existing-owner target Graph update](/next/data-cloud-cli/data-graphs/#update) appended only its LastName projection and independently preserved this target ruleset, all twelve output/link DMOs and the root schema/key with their target-local identities. No IR mutation was attempted. A repeat comparison found both resources unchanged and sent no writes or explicit processing jobs. This is preservation of an existing owner during a dependent Graph update, **not cross-org IR update/create proof** or a successful IR data run.

{% endcapture %}
{% include operation-tabs.html id="ir-retrieve" label="Retrieve" cli_state="unknown" cli_reason="No standard CLI runtime ruleset retrieval workflow is supplied." api_state="available" api_reason="Native API 65 and API 67 facade reads; existing-owner correlation is not cross-org migration proof." api_body=retrieve_api %}

## Create

{% capture create_api %}
Save `ir-create.json`. It matches on first name, last name and normalized email, and starts with a `LastUpdated` reconciliation rule:

```json
{
  "toolName": "d360_ir_create",
  "paramsJson": "{\"input\":{\"configurationType\":\"Individual\",\"dataSpaceName\":\"default\",\"label\":\"Customer Identity\",\"description\":\"Resolve customers using name and normalized email\",\"rulesetId\":\"cust\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"LastUpdated\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-create.json' --json
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHING" }
```

Check nested `body.error` as well as the result: HTTP `201` and CLI exit `0` can still contain an operation error. Salesforce may add reconciliation entities beyond the one sent. Keep the returned identity and exact generated output/link references for later checks.

{% endcapture %}
{% include operation-tabs.html id="ir-create" label="Create" cli_state="unknown" cli_reason="No standard CLI runtime ruleset creation workflow is supplied." api_state="available" api_reason="Bounded API 67 facade creation enters publication; automatic-run false is not draft mode." api_body=create_api %}

## Update

{% capture update_api %}
Let's change the Individual reconciliation rule from `LastUpdated` to **`MostFrequent`**, keeping the matching definition intact. Save `ir-update.json` with the full matching/reconciliation input and label, rather than assuming a sparse update will work:

```json
{
  "toolName": "d360_ir_update",
  "paramsJson": "{\"identityResolution\":\"Individual_cust\",\"input\":{\"label\":\"Customer Identity\",\"description\":\"Prefer the most frequent customer values\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"MostFrequent\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-update.json' --json
```

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "PUBLISHING", "reconciliationRules": { "rules": [{ "entityName": "ssot__Individual__dlm", "ruleType": "mostfrequent" }] } }
```

Read back until publication settles, then check the changed rule and unchanged matches/identity. Do not issue another update while publishing. Broader matching grammar, repeat behavior and successful data runs are not covered by this example.

{% endcapture %}
{% include operation-tabs.html id="ir-update" label="Update" cli_state="unknown" cli_reason="No standard CLI runtime ruleset update workflow is supplied." api_state="available" api_reason="Bounded full-definition reconciliation-rule update after publication settles; successful data runs are not established." api_body=update_api %}

## Delete

{% capture delete_api %}
After checking dependencies and ownership, save `ir-delete.json`:

```json
{ "toolName": "d360_ir_delete", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-delete.json' --json
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
```

The delete can return `{ "success": true }` while a following read still shows:

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "DELETING", "reconciliationRules": [] }
```

Wait for the exact ruleset to become not found, and independently confirm native API 65 GET returns HTTP `404` / `ITEM_NOT_FOUND`. Do not repeat DELETE during removal.

{% endcapture %}
{% include operation-tabs.html id="ir-delete" label="Delete" cli_state="unknown" cli_reason="No standard CLI runtime ruleset deletion workflow is supplied." api_state="available" api_reason="API 67 facade deletion requires terminal facade and native API 65 absence checks." api_body=delete_api %}

Generated outputs can remain readable during `DELETING`. Check their captured references only after ruleset removal. Later unreadability means absent **or inaccessible**, not proof of physical deletion, profile-row removal or universal cleanup. Do not race the ruleset's cleanup by deleting DMOs yourself. Local request files and retrieved templates remain.
