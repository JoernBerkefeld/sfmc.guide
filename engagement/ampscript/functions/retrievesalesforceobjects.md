---
layout: page
title: "RetrieveSalesforceObjects"
description: "Retrieves records from a connected Salesforce Sales or Service Cloud object via Marketing Cloud Connect and returns them as a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that an unknown object name aborts the page and an empty match returns a clean empty rowset."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/retrievesalesforceobjects/
platforms:
  - engagement
  - next
syntax: "RetrieveSalesforceObjects(objectName, fieldsToRetrieve, queryFieldName1, queryFieldOperator1, queryFieldValue1[, queryFieldNameN, queryFieldOperatorN, queryFieldValueN, ...])"
return_type: rowset
min_args: 5
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `objectName` | string | Yes | API name of the Salesforce object to query |
| `fieldsToRetrieve` | string | Yes | Comma-separated list of field API names to return |
| `queryFieldName1` | string | Yes | Field to filter on |
| `queryFieldOperator1` | string | Yes | Comparison operator (`=`, `!=`, `<`, `<=`, `>`, `>=`) |
| `queryFieldValue1` | string \| number | Yes | Value to filter against |
| `queryFieldNameN` | string | No | Further filter field |
| `queryFieldOperatorN` | string | No | Further comparison operator |
| `queryFieldValueN` | string \| number | No | Further filter value |

Filters are supplied as repeating three-argument groups (field, operator, value); there is no upper bound on the number of groups, and multiple groups are joined with `AND`.

## Example

```ampscript
%%[
  VAR @rows, @count
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "Id", "=", "000000000000000AAA")
  SET @count = RowCount(@rows)
]%%
Matches: %%=v(@count)=%%
```

Renders `Matches: 0` when nothing matches the filter — an unmatched query yields an empty rowset rather than an error.

Once a rowset comes back, walk it with `RowCount`, `Row` and `Field`:

```ampscript
%%[
  VAR @rows, @i, @id
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")
  FOR @i = 1 TO RowCount(@rows) DO
    SET @id = Field(Row(@rows, @i), "Id")
  NEXT @i
]%%
```

## Return value

**`rowset`** — the matching records, one row per object, each field addressable by its API name through `Field(Row(@rows, n), "FieldName")`.

There is no closed set of sentinel values: the result is a rowset whose size depends on the query. An unmatched filter returns an empty rowset (`RowCount` of `0`, `Empty` of `true`).

## Behaviour

**A live query round-trips to the connected org.** The function issues a SOAP request through Marketing Cloud Connect. `RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")` returned a populated rowset, and the first row's `Id` field was a non-empty 18-character Salesforce ID.

**An empty match is a rowset, not an error.** A filter that matches no record — `RetrieveSalesforceObjects("Contact", "Id", "Id", "=", "000000000000000AAA")` — returns a rowset whose `RowCount` is `0` and whose `Empty` is `true`, with the page rendering normally.

### An unknown object name aborts the page

{% include callout.html type="warning" title="A SOAP fault becomes a page abort" content="AMPscript has no try/catch, so a fault from the connected org — for example an object API name that does not exist — aborts the whole CloudPage with HTTP 422 and discards everything already rendered. There is no error value to test for." %}

`RetrieveSalesforceObjects("NotARealObject__x", "Id", "Id", "=", "000000000000000AAA")` aborted the page with HTTP 422. Validate object and field API names before the call rather than relying on a graceful failure.

{% include test-script.html bundle="ampscript-functions--retrievesalesforceobjects" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

Requires an active Marketing Cloud Connect integration to a Sales or Service Cloud org on the business unit.

## See also

- [`CreateSalesforceObject`](/engagement/ampscript/functions/createsalesforceobject/) · [`UpdateSingleSalesforceObject`](/engagement/ampscript/functions/updatesinglesalesforceobject/) — write to the same connected org
- [`LongSFID`](/engagement/ampscript/functions/longsfid/) — convert a 15-character ID for matching
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-retrieve-objects.html) · [ampscript.guide](https://ampscript.guide/retrievesalesforceobjects/)
