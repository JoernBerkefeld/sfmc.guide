---
layout: page
title: "RetrieveSalesforceJobSources"
description: "Returns the source records (SourceID, SourceType, IsInclusionSource) that made up the audience of a Salesforce-triggered send, matched by its numeric job ID, as a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that a job ID with no matching sources returns a clean empty rowset rather than an error."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/retrievesalesforcejobsources/
platforms:
  - engagement
syntax: "RetrieveSalesforceJobSources(jobId)"
return_type: rowset
min_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `jobId` | number | Yes | The numeric job ID of the Salesforce-triggered send to retrieve the audience sources of |

## Example

```ampscript
%%[
  VAR @rows, @count
  SET @rows = RetrieveSalesforceJobSources(999999999)
  SET @count = RowCount(@rows)
]%%
Sources: %%=v(@count)=%%
```

Renders `Sources: 0` for a job ID with no matching sources — an unmatched lookup yields an empty rowset rather than an error.

Once a rowset comes back, walk it with `RowCount`, `Row` and `Field`:

```ampscript
%%[
  VAR @rows, @i, @row
  SET @rows = RetrieveSalesforceJobSources(40029164)
  FOR @i = 1 TO RowCount(@rows) DO
    SET @row = Row(@rows, @i)
    Output(Concat(
      "SourceID=", Field(@row, "SourceID"),
      " SourceType=", Field(@row, "SourceType"),
      " IsInclusionSource=", Field(@row, "IsInclusionSource"), "<br>"))
  NEXT @i
]%%
```

## Return value

**`rowset`** — one row per audience source of the referenced send, with the fields `SourceID`, `SourceType` and `IsInclusionSource`, each addressable through `Field(Row(@rows, n), "FieldName")`.

There is no closed set of sentinel values: the result is a rowset whose size depends on the job. A job ID with no matching sources returns an empty rowset (`RowCount` of `0`, `Empty` of `true`).

The function reports nothing about the status of the job itself — it returns source data even for a cancelled job, so do not use it to test whether a send completed.

## Behaviour

**A live lookup round-trips to the connected org.** The function issues a request through Marketing Cloud Connect. `RetrieveSalesforceJobSources(999999999)` and `RetrieveSalesforceJobSources(0)` each returned a valid AMPscript rowset with the page rendering normally.

**An unmatched job ID is a rowset, not an error.** A job ID with no matching sources returns a rowset whose `RowCount` is `0` and whose `Empty` is `true` — it does not abort the page or return an error value.

{% include test-script.html bundle="ampscript-functions--retrievesalesforcejobsources" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

Requires an active Marketing Cloud Connect integration to a Sales or Service Cloud org on the business unit.

## See also

- [`RetrieveSalesforceObjects`](/engagement/ampscript/functions/retrievesalesforceobjects/) — query records from a connected Salesforce object
- [`CreateSalesforceObject`](/engagement/ampscript/functions/createsalesforceobject/) · [`UpdateSingleSalesforceObject`](/engagement/ampscript/functions/updatesinglesalesforceobject/) — write to the same connected org
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-retrieve-job-sources.html) · [ampscript.guide](https://ampscript.guide/retrievesalesforcejobsources/)
