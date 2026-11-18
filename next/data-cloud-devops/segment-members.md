---
layout: page
title: "Segment members"
description: "API workflows using Salesforce CLI authentication and transport for Segment Members: runtime data, not metadata."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/segment-members/
redirect_from:
  - /next/data-cloud-cli/segment-members/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [api, plugin] }
  create: { status: "no", methods: [] }
  update: { status: "partial", methods: [api, plugin] }
  delete: { status: "no", methods: [] }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

<a id="segment-members-runtime-data-not-metadata"></a>

A **segment member** is a person in a segment. These examples read the members of a segment through the Salesforce CLI's authenticated API request runner.

Membership is runtime data, not metadata. The read examples do not publish or refresh the segment, and they write nothing under `force-app/main/default/`. Only publishing the segment (Update chapter) changes its members.

Member IDs and profile fields are personal data. Keep request files and exports in a private folder, out of Git, shared logs and screenshots.

**Example used in every chapter:** the segment `ActiveCustomers` in the source org (`SOURCE_ALIAS`).

{% include crud-summary.html %}

**Plugin qualification:** `sf data360 segment members export` reads every member of one segment into a CSV or JSON file (Read chapter). Read is rated Yes: members belong to a segment, so one segment is the natural scope, and no member has to be named. The plugin cannot edit single members. `sf data360 publish` publishes one segment, which recomputes its members (Update chapter). Its segment retrieve saves the definition only.

**Evidence scope:** Every route on this page was run live on one owned one-member segment, published once (see Evidence). The read examples use v67 as written; the member and metadata routes also answered at v68 with the same shapes, and the publish ran at v68.

## Read

{% capture read_connect %}
### Read basic membership

Reads the segment, then one page of its members.

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers' --target-org SOURCE_ALIAS --json
```

Keep `marketSegmentId`, `dataSpace`, `segmentMembershipDmo.latestTable` and `segmentOnApiName`. You need them for profile details. Do not guess a table name from the display name.

The response has the shape shown on the Connect API tab of the [Segments](/next/data-cloud-devops/segments/#read) page.

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

The sample shows membership and audit fields, not profile fields. The `totalCount` of `1200` is illustrative. Each request returns one page; `nextPageUrl` appears only while more rows follow.

For the next page, increase `offset` by the number of rows returned, until you reach `totalCount`. Stay on the same org and path. Do not follow a returned URL blindly. Paging this way reads every member of the segment; an offset past the end answers `200` with an empty `data` list.

Members appear only after the segment is published (Update chapter). Before that, the route answers `200` with `totalCount` `0`, even when the segment read already shows a `lastSegmentMemberCount`.

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

`returnedRows` is the page size. `status.rowCount` is the total for the bounded query. Advance `offset` by the rows you accepted. Stop at the total, and reject any match count above one. An `offset` at or past the total answers HTTP 400 `BAD_REQUEST` ("request out of range") on this SQL rows route; the members route answers `200` with no rows instead. Once the query is complete, the status read can show `completionStatus` `Finished` instead of `ResultsProduced`.

This covers two bounded SQL pages, not a full export. The rows still contain two internal columns. Transform them privately if you want named fields.

### Save output deliberately

REST writes to standard output by default. To save the response to a file, use a private path outside the metadata folder. The file holds the plain response body (the same JSON as the `body` above, without the CLI envelope), and the command prints `File saved to <path>`.

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --stream-to-file 'PRIVATE_EXPORT_PATH/members.json'
```

{% endcapture %}
{% capture read_plugin %}
### Export members with the plugin

Writes every member of one segment to a file. The command is read-only: it does not publish the segment and writes nothing under `force-app/` or `data360/`.

```sh
sf data360 segment members export --target-org SOURCE_ALIAS --metadata segment:ActiveCustomers
```

```text
Segment ActiveCustomers: 1000 of 1100 members read.
Segment ActiveCustomers: 1100 of 1100 members read.
Saved 1100 segment members to data/default/Active-Customers-2026-11-17_08-23-13.csv.
```

The counts are illustrative. `-m segment:<value>` takes the segment's API name, its record ID or its display name; the Data Cloud UI shows only the display name and the ID, so copy either. A display name must match exactly, including case, in the default data space. No match stops with `SEGMENT_MEMBERS_NOT_FOUND` before any member is read.

```sh
sf data360 segment members export --target-org SOURCE_ALIAS --metadata 'segment:Active Customers'
```

- **Several matches:** in a terminal, the command asks which segment you mean. With `--json` or without a terminal, it stops with `SEGMENT_SELECTION_AMBIGUOUS` and lists the display name, API name and ID of each match; run it again with the API name or ID. Salesforce refuses a duplicate display name when a segment is created or renamed (HTTP 400), so this only matters in unusual org states.
- **Output:** CSV by default (`--column-delimiter` sets the separator, as a name such as `SEMICOLON` or as the character itself, such as `;`), or a JSON array of row objects with `--result-format json`. The file goes to `data/default/<display name>-<timestamp>.csv` below the working directory, or to `--output-file`, which is replaced if it exists. A failed export leaves no file.
- **File name:** the default name uses the display name, because that is the name you recognise. A segment's API name is derived from its first display name and stays the same when the segment is renamed (see Evidence). The display name is made file-safe: whitespace and the characters `< > : " / \ | ? *` become `-`, repeated `-` become one, and trailing dots and `-` as well as leading dots are dropped. For example, `Active Customers: EU/UK` gives `Active-Customers-EU-UK-2026-11-17_11-58-28.csv`. A segment without a display name uses its API name.
- **Paging:** the command reads the members route page by page until it reaches `totalCount`. `--limit` sets the rows per request (default 1000; 2000 worked in the live run). `--offset`, `--fields`, `--filters` and `--order-by` are sent as given. If the member count changes between pages (a publish finished), it stops with `SEGMENT_MEMBERS_CHANGED`.
- **Profile details:** `--include-details` writes every field of the object the segment is built on per member. It joins the latest membership table to that object in one Data 360 SQL query and reads the rows page by page. A member with more than one detail row stops the export (`SEGMENT_MEMBER_DETAILS_AMBIGUOUS`). The CSV header and JSON keys are the field labels by default; `--column-headers api-name` uses the field API names instead. `DATE` and `DATE_TIME` values are written with a space instead of the `T` (`2026-10-16 19:19:51+00:00`). Without `--include-details`, the columns keep the names Salesforce returns.
- **Versions:** `--api-version` is `auto` (68.0), `67.0` or `68.0`.

```sh
sf data360 segment members export --target-org SOURCE_ALIAS --metadata segment:ActiveCustomers --result-format json --output-file 'PRIVATE_EXPORT_PATH/members.json'
sf data360 segment members export --target-org SOURCE_ALIAS --metadata segment:ActiveCustomers --include-details
```

Members exist only after a publish finished (Update chapter); before that the file is empty and the command warns. The file holds personal data: keep it out of Git.
{% endcapture %}
{% include operation-tabs.html id="members-read" label="Read" cli_state="blocked" cli_reason="No Metadata-backed CLI command returns members: there is no Metadata type to retrieve. sf data query can read the membership DMO with SOQL (see Evidence)." split_api=true metadata_state="blocked" metadata_reason="No Metadata API type holds segment members (describeMetadata at API 68.0)." connect_state="available" connect_reason="Reads every member page by page, and profile details through bounded SQL pages." connect_body=read_connect plugin_state="available" plugin_reason="Exports every member of one segment to CSV or JSON with sf data360 segment members export, optionally with profile details." plugin_body=read_plugin %}

## Create

{% include operation-tabs.html id="members-create" label="Create" cli_state="blocked" cli_reason="No CLI command can add a member. sf sobject describe reports the membership DMO as not createable." split_api=true metadata_state="blocked" metadata_reason="No Metadata API type holds segment members (describeMetadata at API 68.0)." connect_state="blocked" connect_reason="The members route answers POST with HTTP 405 METHOD_NOT_ALLOWED (GET and HEAD only). Segment rules decide the audience; publish to recompute it (Update)." %}

## Update

{% capture update_connect %}
### Publish the segment to recompute its members

Single member rows cannot be changed. Publishing recomputes the whole membership from the segment rules. Publish only a segment you own, and get permission first: publishing processes data and can feed activations.

Read the segment first and keep its `marketSegmentId`. The publish route takes that ID, not the API name. The CLI needs a body entry for a POST, so save `segment-publish.json` with an explicit empty raw body:

```json
{ "url": "/services/data/v68.0/ssot/segments/MARKET_SEGMENT_ID/actions/publish", "method": "POST", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-publish.json --target-org SOURCE_ALIAS --include
```

The POST answers HTTP 201 and queues the work:

```json
{ "errors": [{}], "jobId": "<job-id>", "partitionId": "<partition-id>", "publishStatus": "PUBLISHING", "segmentId": "<market-segment-id>", "success": true }
```

The answer does not mean the members are ready. Read the segment until it shows `publishStatus` `SUCCESS` and a `lastPublishedEndDateTime`, then read the members as in the Read chapter. In the live run that took about 15 minutes for a one-member segment. Do not send the POST again while you wait.

**Known failures:**

- A POST without a body fails in the CLI with "No 'mode' found in 'body' entry" before anything is sent. Use the request file shown above.
{% endcapture %}
{% capture update_plugin %}
### Publish the segment with the plugin

Publishes one segment on API68 and waits for the result. The same permission applies as on the Connect API tab. Preview first; the preview reads the segment and publishes nothing.

```sh
sf data360 publish --target-org SOURCE_ALIAS --metadata segment:ActiveCustomers --preview
sf data360 publish --target-org SOURCE_ALIAS --metadata segment:ActiveCustomers
```

`-m segment:Name` publishes the segment as the org holds it. `-d data360/segments/Name.segment.json` (or one of its SQL files) works too, but the org must hold the file's definition, otherwise `SEGMENT_PUBLISH_DEFINITION_MISMATCH`: deploy it first. A file retrieved as-is (verbatim) is refused with `VERBATIM_NOT_DEPLOYABLE`. The command needs no acknowledgement flag.

The plugin reads the segment by name, then sends one POST to `/ssot/segments/{marketSegmentId}/actions/publish` with an empty body. It never sends that POST again. It reads the segment every 30 seconds until `publishStatus` is `SUCCESS` (`published`) or `FAILED` (`SEGMENT_PUBLISH_FAILED`). Salesforce decides whether the segment can be published; a refusal is reported with its text (`SEGMENT_PUBLISH_REJECTED`).

`--wait-timeout` sets the wait in seconds (default 1800). When it runs out, the result is `publishing` with status `processing` and exit 0 (`SEGMENT_PUBLISH_STILL_PROCESSING`): still processing, not failed. Read the segment later; do not publish again. Read the members as in the Read chapter only after `SUCCESS`.
{% endcapture %}
{% include operation-tabs.html id="members-update" label="Update" cli_state="blocked" cli_reason="No standard CLI command can change members or publish a segment; sf data360 publish (sf-plugin-data tab) publishes one. sf sobject describe reports the membership DMO as not updateable." split_api=true metadata_state="blocked" metadata_reason="No Metadata API type holds segment members (describeMetadata at API 68.0)." connect_state="available" connect_reason="Members cannot be edited one by one (PATCH and PUT answer 405). Publishing the segment recomputes the whole membership." connect_body=update_connect plugin_state="available" plugin_reason="Publishes one segment with sf data360 publish and waits for SUCCESS or FAILED." plugin_body=update_plugin %}

## Delete

{% include operation-tabs.html id="members-delete" label="Delete" cli_state="blocked" cli_reason="No CLI command can remove a member. sf sobject describe reports the membership DMO as not deletable." split_api=true metadata_state="blocked" metadata_reason="No Metadata API type holds segment members (describeMetadata at API 68.0)." connect_state="blocked" connect_reason="The members route answers DELETE with HTTP 405 METHOD_NOT_ALLOWED. Change the segment rules and publish instead. Do not delete generated tables." %}

> Official reference: [Segment members API](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/references/mc-connect-segments?meta=getSegmentMembers).

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Deliberate CLI-envelope inspection:** the eight REST commands in the Read chapter keep `--json`, so the HTTP status and body appear under `result.statusCode` and `result.body`. This is a structured-response example, not a requirement for every API call. JSON request bodies alone do not need this output flag.

**Verification scope:** The routes and limits below were tested live. This badge does not verify untested writes or general CRUD support.

**Live run (one org, 2026-11-16, API v67 and v68):** One owned DBT segment with a one-member audience was created, published once and read through every route on this page, then deleted.

- Before the publish, the member route answered `200` with `totalCount` `0`, although the segment read already showed `lastSegmentMemberCount` `1`. The publish POST answered `201` with `PUBLISHING`; about 15 minutes later the segment showed `publishStatus` `SUCCESS` and `lastPublishedEndDateTime`, and the member route returned the one member (`deltaType` `new`, `snapshotType` `F`). v67 and v68 returned the same shape.
- The metadata route listed the latest membership table with category `Segment_Membership` and an N:1 relationship from its `Id__c` to the unified DMO's key. Both query submissions (`--body -` and `--body '@file'`) answered `201`; the status read `200` with `Finished`; the row read at `offset=0` answered `200` with one row and a match count of `1`; `offset=1` answered `400` ("request out of range") because the bounded result had one row.
- `--stream-to-file` wrote the plain response body to the file.
- POST, PATCH, PUT and DELETE on the member route each answered `405` `METHOD_NOT_ALLOWED` ("Allowed are GET,HEAD").
- `sf sobject describe` reported the membership DMO as queryable but not createable, updateable or deletable. `sf data query` read the member row with SOQL (`SELECT Id__c, Segment_Id__c, Delta_Type__c FROM <latest membership table> WHERE Segment_Id__c = '<first 15 characters of marketSegmentId>'`).
- `describeMetadata` at API 68.0 lists no Metadata type for segment members.
- After the segment DELETE (`204`), the segment and member routes answered `404` `ITEM_NOT_FOUND`, and the membership table held no row for the segment.

**Page size:** an existing 1100-member segment returned 1000 rows at `limit=1000` (with `nextPageUrl`), the remaining 100 at `offset=1000`, none at `offset=2000`, and all 1100 at `limit=2000`. So 1000 is not a hard maximum; follow `totalCount` either way.

**Dataspace query:** the `--json` sample for the SOQL command is from a structured run. The command without `--json` is the one shown in the chapter.

**SQL notes:** double quotes identify table and column names. `IS NOT DISTINCT FROM` treats two nulls as equal, so the match-count check still matters. Have a developer validate names and escape values for this SQL dialect. Do not build SQL by simple text replacement.

**Stop conditions:** stop on errors, expired query IDs, or unfamiliar status or metadata values.

**File output:** `--stream-to-file` writes the API response bytes. Do not add `--include` if you need pure JSON.

**Plugin:** `sf data360 segment members export` read an existing 1100-member segment at API 68 (one org, 2026-11-17): with the default `--limit` 1000 it read two pages and wrote 1100 CSV rows in 6.7 seconds; with `--limit 2000` one page in 3.7 seconds (JSON output); with `--include-details` 1100 rows of 19 columns in 5.8 seconds. Every export held the same member IDs as a direct read of the members route. The same export worked at API 67. `--offset 2000` (past the end) answered `200` with no rows, and an absent segment stopped with `SEGMENT_MEMBERS_NOT_FOUND`. The same segment selected by its display name, its record ID and its API name exported the same 1,100 rows each, in 6 to 7 seconds (one org, 2026-11-17); the display name in lower case was not found. `--column-delimiter ';'` worked, and `--include-details` gave 19 labels or 19 API names over identical rows. A second segment with an existing display name was refused on create and on rename (HTTP 400), so the ambiguity stop could not be run live. A segment created through Connect without `developerName` got an API name derived from its display name (`Peter Parker$` gave `Peter_Parker`: spaces become `_`, special characters are dropped); after a rename to `spider-man` the API name was still `Peter_Parker` (one org, 2026-11-17, API 68). The default file name therefore uses the display name. With `--include-details`, `DATE_TIME` values of the 1100-member segment were written as `2026-10-16 19:19:51+00:00`. The `publish` command publishes one segment at API 68 (one org, 2026-11-17): on an owned zero-member DBT segment, `sf data360 publish -m segment:<Name>` sent one POST, which answered `PUBLISHING`, then read the segment every 30 seconds; it reported `published` when `publishStatus` was `SUCCESS` after 922 seconds (exit 0). The segment was then deleted with the plugin.

**Limits of this evidence:** the paging check read a segment of 1100 members; membership that changes while you read is not covered, so reconcile instead of assuming a fixed snapshot. No route returns members with profile details in one call. Refreshing a segment on a schedule was not tried.

</details>