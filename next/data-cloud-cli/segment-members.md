---
layout: page
title: "Segment members"
description: "API workflows using Salesforce CLI authentication and transport for Segment Members: runtime data, not metadata."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/segment-members/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "partial", methods: [api] }
  create: { status: "unknown", methods: [] }
  update: { status: "unknown", methods: [] }
  delete: { status: "unknown", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Read its setup, placeholders and safety guidance first.

<a id="segment-members-runtime-data-not-metadata"></a>

A **segment member** is a person in a segment. These examples read the members of a segment through the Salesforce CLI's authenticated API request runner.

Membership is runtime data, not metadata. These examples do not publish or refresh the segment. They write nothing under `force-app/main/default/`.

Member IDs and profile fields are personal data. Keep request files and exports in a private folder, out of Git, shared logs and screenshots.

**Example used in every chapter:** the segment `ActiveCustomers` in the source org (`SOURCE_ALIAS`).

{% include crud-summary.html %}

**Plugin qualification:** No plugin workflow is tested for segment members.

## Read

{% capture read_connect %}
### Read basic membership

Reads the segment, then one page of its members.

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers' --target-org SOURCE_ALIAS --json
```

Keep `marketSegmentId`, `dataSpace`, `segmentMembershipDmo.latestTable` and `segmentOnApiName`. You need them for profile details. Do not guess a table name from the display name.

The segment response sample is not in this guide yet.

The path is quoted so the shell does not read `&` as an operator. Next, request one member:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --json
```

```json
{
  "status": 0,
  "result": {
    "statusCode": 200,
    "body": {
      "data": [{ "id": "<redacted-member-id>", "deltaType": "<redacted>", "snapshotType": "<redacted>", "timestamp": "<redacted>", "versionStamp": "<redacted>" }],
      "limit": 1,
      "offSet": 0,
      "rowCount": 1,
      "totalCount": 1200,
      "nextPageUrl": "<continuation>"
    }
  }
}
```

The sample shows membership and audit fields, not profile fields. The `totalCount` of `1200` is illustrative. Each request returns one page of up to **1000** rows. It does not export the whole segment.

For the next page, increase `offset` by the number of rows returned. Stay on the same org and path. Do not follow a returned URL blindly.

### Include profile details

This advanced read joins membership rows to a profile table. A join matches rows by key, so a wrong key can return another person's details. If you cannot validate the keys and SQL, stop at basic membership.

There is no standard CLI flag for profile details. The steps below chain several API reads.

#### 1. Check the dataspace

This command uses core SOQL. It identifies the dataspace only. It is not the Data 360 SQL used below.

```sh
sf data query --target-org SOURCE_ALIAS --api-version 67.0 --query "SELECT Id, DataSpaceApiName FROM DataSpace WHERE DataSpaceApiName = 'default' LIMIT 2"
```

**Optional structured output (`--json`) for the SOQL command:**

```json
{ "status": 0, "result": { "totalSize": 1, "done": true, "records": [{ "DataSpaceApiName": "default" }] } }
```

You need exactly one match.

#### 2. Find the tables and join fields

```sh
sf api request rest '/services/data/v67.0/ssot/metadata' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Find the descriptor's latest membership table, its detail table, the key fields and the ordered detail fields. Confirm the relationship is N:1 using the returned source and target attributes. Do not assume every table joins on `Id__c`.

The following is an illustrative schema, not a response:

```json
{
  "membershipTable": "CustomerMembership__dlm",
  "detailTable": "UnifiedCustomer__dlm",
  "membershipKey": "Id__c",
  "detailKey": "CustomerKey__c",
  "detailFieldsInMetadataOrder": ["CustomerKey__c", "DisplayName__c"],
  "relationshipCardinality": "NTOONE"
}
```

Stop if keys, cardinality or field order are missing or unclear.

#### 3. Submit a small query

Save `segment-member-query.json`. Replace the table, key and field names with the ones from step 2. Replace `SEGMENT_ID_15` with the first 15 case-preserved characters of the `marketSegmentId`, not its API name. Validate and escape values before building SQL.

```json
{
  "sql": "SELECT * FROM (SELECT d.\"CustomerKey__c\", d.\"DisplayName__c\", m.\"Id__c\" AS \"membership_key_internal\", COUNT(d.\"CustomerKey__c\") OVER (PARTITION BY m.\"Id__c\") AS \"detail_match_count_internal\" FROM \"CustomerMembership__dlm\" m LEFT JOIN \"UnifiedCustomer__dlm\" d ON m.\"Id__c\" IS NOT DISTINCT FROM d.\"CustomerKey__c\" WHERE m.\"Segment_Id__c\" = 'SEGMENT_ID_15') q ORDER BY \"membership_key_internal\" LIMIT 2",
  "rowLimit": 1
}
```

The query:

1. Selects the detail fields in metadata order. To include all details, list every detail field.
2. Uses a `LEFT JOIN`, so members without a profile stay in the result with empty details.
3. Adds the membership key and a match count. Reject any member with more than one match.
4. Limits the result to two rows, read one row per page.

In PowerShell, pipe the file in with `--body -`:

```powershell
Get-Content -Raw -LiteralPath './segment-member-query.json' | sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body - --json
```

Or pass the file directly:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body '@segment-member-query.json' --json
```

A successful submission returns the first result row and a query ID:

```json
{
  "status": 0,
  "result": {
    "statusCode": 201,
    "body": {
      "data": [[null, null, "<redacted-membership-key>", 0]],
      "metadata": ["<column descriptors abbreviated>"],
      "returnedRows": 1,
      "status": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 }
    }
  }
}
```

This row has empty detail fields, the internal membership key and a zero match count. Its width is the detail-field count plus two. Check the metadata order before you read the values.

#### 4. Read the remaining pages

Use the query ID from the submission. Check the query status first:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 } } }
```

Read row 2 only after you accept row 1 from the submission. Use the same query ID, not a new POST:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=1&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

If the submission returned no rows, wait for a completed status. Then read the first page:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=0&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "data": [[null, null, "<redacted-membership-key>", 0]], "metadata": ["<column descriptors abbreviated>"], "returnedRows": 1 } } }
```

`returnedRows` is the page size. `status.rowCount` is the total for the bounded query. Advance `offset` by the rows you accepted. Stop at the total, and reject any match count above one.

This covers two bounded SQL pages, not a full export. The rows still contain two internal columns. Transform them privately if you want named fields.

### Save output deliberately

REST writes to standard output by default. To save the response to a file, use a private path outside the metadata folder. See the Evidence section before you use this option.

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --stream-to-file 'PRIVATE_EXPORT_PATH/members.json'
```

{% endcapture %}
{% include operation-tabs.html id="members-read" label="Read" cli_state="unknown" cli_reason="No CLI command returns segment members. The API request runner is used instead." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="available" connect_reason="Reads membership and bounded profile pages. Not a full-population export." connect_body=read_connect %}

## Create

{% include operation-tabs.html id="members-create" label="Create" cli_state="unknown" cli_reason="No membership-row creation command is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="Creating membership rows is not tested. Segment rules decide the audience." %}

## Update

{% include operation-tabs.html id="members-update" label="Update" cli_state="unknown" cli_reason="No membership-row update command is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="Updating membership, refreshing and publishing are not tested." %}

## Delete

{% include operation-tabs.html id="members-delete" label="Delete" cli_state="unknown" cli_reason="No membership-row deletion command is supplied." split_api=true metadata_state="unknown" metadata_reason="Not tested for this operation." connect_state="unknown" connect_reason="Deleting membership rows is not tested. Do not delete generated tables instead." %}

> Official reference: [Segment members API](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/references/mc-connect-segments?meta=getSegmentMembers).

<details>
<summary>Evidence: tested scope, versions and error codes</summary>

**Deliberate CLI-envelope inspection:** the eight REST commands in the Read chapter keep `--json`, so the HTTP status and body appear under `result.statusCode` and `result.body`. This is a structured-response example, not a requirement for every API call. JSON request bodies alone do not need this output flag.

**Verification scope:** Live-org reads and the bounded operations described here were tested. The operation limits still apply. This badge does not verify untested writes or general CRUD support.

**Status codes observed:** the member read returns `200`. Query submission returns `201`. Query status and row reads return `200`. The segment read sample is not in the guide yet.

**Page size:** the documented maximum is 1000 rows per request.

**Dataspace query:** the `--json` sample for the SOQL command is from a structured run. The command without `--json` is the one shown in the chapter.

**SQL notes:** double quotes identify table and column names. `IS NOT DISTINCT FROM` treats two nulls as equal, so the match-count check still matters. Have a developer validate names and escape values for this SQL dialect. Do not build SQL by simple text replacement.

**Stop conditions:** stop on errors, expired query IDs, or unfamiliar status or metadata values.

**File output:** `--stream-to-file` is not live-qualified for this member workflow. It writes the API response bytes. Do not add `--include` if you need pure JSON.

**Not verified:**

- A full-population export. If membership changes while you read, reconcile the result instead of assuming a fixed snapshot.
- Creating, updating or deleting membership rows.
- Refreshing or publishing the segment.
- A one-call export that includes profile details.
- File output for members through `--stream-to-file`.
- Plugin workflows for members.

</details>