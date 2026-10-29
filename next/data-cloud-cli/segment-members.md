---
layout: page
title: "Segment members"
description: "Salesforce CLI workflows and verified operation limits for Segment Members: runtime data, not metadata."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/segment-members/
verification: verified
operation_tabs: true
platforms:
  - next
---

*Last updated: October 28, 2026, 17:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/). Start with its setup, placeholders and safety guidance before running these examples.

<a id="segment-members-runtime-data-not-metadata"></a>

**Segment members are runtime data, not metadata.**

These **API `67.0`** examples read the people in a segment, rather than its definition. They do not publish or refresh it, and they do not write anything under `force-app/main/default/`.

Member identifiers and profile fields are personal data. Keep request files and exports in a private working directory, restrict access and retention, and avoid Git, shared logs and screenshots.

## Retrieve

{% capture retrieve_api %}
### Read basic membership

First read the segment itself:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers' --target-org SOURCE_ALIAS --json
```

Keep the returned `marketSegmentId`, `dataSpace`, `segmentMembershipDmo.latestTable` and `segmentOnApiName`. You will need them if you want profile details later; do not guess a table name from the display name.

The returned configuration is also called the segment **descriptor**. In a path, `?` starts query parameters and `&` separates them: `limit=1&offset=0` asks for one row starting at the beginning. Keep the quotes around the full path so the shell does not interpret `&` as an instruction.

Now request one member:

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

You get membership and audit information, **not the person's profile fields**. `1200` is just an illustrative count. A CLI invocation retrieves one page; it does not export the whole segment automatically. The documented maximum page size is **1000**.

For further pages, increase the offset by the number of returned rows. Check `offSet`, stable totals and nonempty progress, staying on the same validated org/path. Do not blindly follow a returned URL. Full-population export has not been verified here; if membership changes while you read it, reconcile the result rather than assuming a fixed snapshot.

### Include profile details

The following is an advanced read example, not a requirement for downloading configuration. A **join** combines rows from two tables using related keys; an incorrect key can return the wrong person's details. If you cannot validate the relationship and SQL, stop at basic membership and ask a data specialist to help.

There is **no standard CLI `--include-details` flag**. To get that result, you need to discover the tables, join membership to the detail DMO, and read the query pages. This is orchestration of several API reads, not a plugin implementation.

#### 1. Check the dataspace

**SOQL** (Salesforce Object Query Language) queries core Salesforce records, while Data 360 SQL queries Data Cloud tables. They use different commands and are not interchangeable. The next command uses SOQL only to identify the dataspace record.

Use the dataspace returned by the segment descriptor. For `default`:

```sh
sf data query --target-org SOURCE_ALIAS --api-version 67.0 --query "SELECT Id, DataSpaceApiName FROM DataSpace WHERE DataSpaceApiName = 'default' LIMIT 2" --json
```

```json
{ "status": 0, "result": { "totalSize": 1, "done": true, "records": [{ "DataSpaceApiName": "default" }] } }
```

You need exactly one match. This command uses core **SOQL**; it is not the Data 360 SQL executor used below.

#### 2. Find the tables and join fields

```sh
sf api request rest '/services/data/v67.0/ssot/metadata' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Find the descriptor's exact latest membership table, segment-on detail DMO, primary key and ordered detail fields. Check that the relationship is **N:1**, using its actual source/target attributes (`fromEntityAttribute` / `toEntityAttribute` where returned). Do not assume that every DMO joins on `Id__c`.

For the next example, imagine discovery gave you these facts. This is an explanation of the schema, **not the literal API response**:

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

Stop if the identities, keys, cardinality or field order are missing or ambiguous.

#### 3. Submit a small query

Save `segment-member-query.json`. Replace table/key/field names from discovery, and replace `SEGMENT_ID_15` with the first 15 case-preserved characters of the returned MarketSegment ID, **not its API name**. Quote identifiers and validate/escape values before constructing SQL.

```json
{
  "sql": "SELECT * FROM (SELECT d.\"CustomerKey__c\", d.\"DisplayName__c\", m.\"Id__c\" AS \"membership_key_internal\", COUNT(d.\"CustomerKey__c\") OVER (PARTITION BY m.\"Id__c\") AS \"detail_match_count_internal\" FROM \"CustomerMembership__dlm\" m LEFT JOIN \"UnifiedCustomer__dlm\" d ON m.\"Id__c\" IS NOT DISTINCT FROM d.\"CustomerKey__c\" WHERE m.\"Segment_Id__c\" = 'SEGMENT_ID_15') q ORDER BY \"membership_key_internal\" LIMIT 2",
  "rowLimit": 1
}
```

The query does four things:

1. Selects two detail fields in metadata order. To include all details, list **every discovered detail field in that order**, rather than using `SELECT *` on the underlying tables.
2. Uses a null-safe `LEFT JOIN`, so members without a matching profile remain in the result with null details.
3. Adds the membership key and match count for validation. Reject more than one detail match per member.
4. Limits the whole result to two rows, requesting one row per page. These limits do not bound how much data the query engine scans.

The outer `SELECT *` only keeps the explicitly ordered inner columns.

Here `m` and `d` are short SQL aliases for the membership and detail tables, not org aliases. `IS NOT DISTINCT FROM` compares keys while treating two nulls as equal; the match-count check still matters. Double quotes identify table/column names, single quotes delimit text values, and `\"` preserves a double quote inside a JSON string. Do not build SQL from untrusted values by simple text replacement; have a developer validate names and escape values for this SQL dialect.

The verified submission form uses **stdin** (standard input): text passed into a program. In PowerShell, `Get-Content -Raw -LiteralPath` reads the whole named file as text, `|` passes it to the next program, and `--body -` tells the CLI to use that incoming text. For example, in PowerShell:

```powershell
Get-Content -Raw -LiteralPath './segment-member-query.json' | sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body - --json
```

The CLI also documents file input for the same body:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body '@segment-member-query.json' --json
```

POST submits a read query, not a segment refresh, but it can consume query resources. A successful submission can use HTTP `201`:

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

This row has two empty detail fields, the internal membership key and a zero match count. With all detail fields selected, row width is **detail-field count + 2**. Check the returned metadata order and width before interpreting the values.

#### 4. Read the remaining pages

Use the fresh `result.body.status.queryId` (or `body.queryId` where returned). If the query is still running, check its status; stop on errors, expiry or an unfamiliar status/schema:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Unlike submission, this response puts status properties directly under `body`:

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 } } }
```

Use `offset=1` only after validating and accepting exactly one submission row. Then ask for the next row using the **same query**, not a new POST:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=1&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Otherwise, if submission contains no rows, wait for recognized status success, then fetch the first bounded page at `offset=0&rowLimit=1`:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=0&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "data": [[null, null, "<redacted-membership-key>", 0]], "metadata": ["<column descriptors abbreviated>"], "returnedRows": 1 } } }
```

`returnedRows` is the page size; `status.rowCount` is the total for the bounded query. Advance offset by the actual number of validated and accepted rows, including any from submission. Require progress, a stable total and consistent metadata order/width; stop at the total and reject match counts above one before exporting.

This example covers **two bounded SQL pages, not an unrestricted full export**. The CLI still returns array rows with the two internal columns. Validate and transform the results privately if you want named fields, normalized dates or output without those internal columns.

### Save output deliberately

**Stdout** (standard output) is the program's normal output, which you usually see in the terminal. A shell redirect such as `> output.json` saves that stream to a file and can overwrite an existing file; it does not turn the response into metadata or fetch extra pages. Shell encoding and error-output handling differ, so do not add redirects casually to these examples.

REST normally writes to stdout. The documented file-output form below is **not live-qualified for this member workflow**:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --stream-to-file 'PRIVATE_EXPORT_PATH/members.json'
```

Choose a real restricted path outside metadata source. This writes API response bytes; do not add `--include` if you need pure JSON. Request files and member/profile output should stay out of Git. Creating, updating or deleting membership rows, refreshing/publishing, and a one-call enriched export are not covered here.

{% endcapture %}
{% include operation-tabs.html id="members-retrieve" label="Retrieve" cli_state="blocked" cli_reason="Members are runtime data, not retrievable metadata; no standard include-details flag exists." api_state="available" api_reason="Bounded membership and profile reads only, not a full-population export." api_body=retrieve_api %}

## Create

Creating membership rows is not qualified here. A segment's rules and processing determine its audience; this page supplies only reads.

{% include operation-tabs.html id="members-create" label="Create" cli_state="unknown" cli_reason="No membership-row creation workflow is supplied." api_state="unknown" api_reason="Membership-row creation is not qualified here." %}

## Update

Updating membership rows, refreshing or publishing through this resource is not qualified here.

{% include operation-tabs.html id="members-update" label="Update" cli_state="unknown" cli_reason="No membership-row update workflow is supplied." api_state="unknown" api_reason="Membership updates, refresh and publication are not qualified here." %}

## Delete

Deleting membership rows is not qualified here. Do not delete generated membership tables as a substitute.

{% include operation-tabs.html id="members-delete" label="Delete" cli_state="unknown" cli_reason="No membership-row deletion workflow is supplied." api_state="unknown" api_reason="Membership-row deletion is not qualified here; do not delete generated tables." %}

> Official reference: [Segment members API](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/references/mc-connect-segments?meta=getSegmentMembers).
