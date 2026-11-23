---
layout: page
title: "AMPscript ClaimRow (Next)"
description: "AMPscript ClaimRow in Marketing Cloud Next: syntax and what has been proven so far. An email containing the call saves; claiming a row has not been tested in Next."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/claimrow/
platforms:
  - next
syntax: "ClaimRow(dataExt, claimColumn, claimantColumn, claimantValue[, additionalColumnNameN, additionalColumnValueN, ...])"
return_type: row
min_args: 4
verification: in-progress
differs_from_docs: false
engagement: untested
mcn_tested: 2026-11-23
engagement_note: "Engagement claims the next unclaimed data extension row, returns it, returns the same row to a repeat claimant and an empty row once all rows are taken. In Next, only saving an email with the call has been tested, so the two cannot be compared yet."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the claimable data extension |
| `claimColumn` | string | Yes | Boolean column that marks a row as claimed; must be required and default to `False` |
| `claimantColumn` | string | Yes | Column written with the claimant value when a row is claimed |
| `claimantValue` | string | Yes | The value identifying who is claiming — a distinct value claims the next row; a repeated value returns that claimant's existing row |
| `additionalColumnNameN` | string | No | Name of a further column to write on the claimed row (record extra context at claim time). Repeatable as name/value pairs. |
| `additionalColumnValueN` | string | No | Value written to the paired `additionalColumnNameN` column on the claimed row |

## Example

```ampscript
%%[
  SET @r = ClaimRow("ProbeDE", "IsClaimed", "K", "v")
]%%
```

An email containing this call, placed in a branch that never runs, saved and published. What the call returns or writes in Next has not been tested.

## Return value

**`row`** — the declared return type. No result has been observed in Next yet.

## Behaviour

**Next accepts the syntax.** An email with `ClaimRow("ProbeDE", "IsClaimed", "K", "v")` inside an `IF 1 == 2` branch saved and published, and the rest of the email rendered.

**Claiming was not tested.** A claim writes to the data source, and there was no claimable data source in the Next org to test against. None of the Engagement results (row returned, claim flag set, repeat claimant, empty row when exhausted, extra columns written) has been checked in Next.

{% include test-script.html bundle="next-ampscript-functions--claimrow" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

{% include platform-compare.html %}

## See also

- [`ClaimRow` in Marketing Cloud Engagement](/engagement/ampscript/functions/claimrow/) — how it behaves there
- [`ClaimRowValue`](/next/ampscript/functions/claimrowvalue/) — the twin that returns one column value
- [`Field`](/next/ampscript/functions/field/)
- [`LookupRows`](/next/ampscript/functions/lookuprows/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-claim-row.html)
