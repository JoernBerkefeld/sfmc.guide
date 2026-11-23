---
layout: page
title: "AMPscript ClaimRowValue (Next)"
description: "AMPscript ClaimRowValue in Marketing Cloud Next: syntax and what has been proven so far. An email containing the call saves; claiming a value has not been tested in Next."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/claimrowvalue/
platforms:
  - next
syntax: "ClaimRowValue(dataExt, returnColumn, claimColumn, fallbackValue, claimantColumn, claimantValue[, additionalColumnNameN, additionalColumnValueN, ...])"
return_type: string
min_args: 6
verification: in-progress
differs_from_docs: false
engagement: untested
mcn_tested: 2026-11-23
engagement_note: "Engagement claims the next unclaimed data extension row and returns one of its columns, the same value to a repeat claimant, and the fallback once all rows are taken. In Next, only saving an email with the call has been tested, so the two cannot be compared yet."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the claimable data extension |
| `returnColumn` | string | Yes | Column whose value is returned from the claimed row |
| `claimColumn` | string | Yes | Boolean column that marks a row as claimed; must be required and default to `False` |
| `fallbackValue` | string | Yes | Value returned when no unclaimed rows remain |
| `claimantColumn` | string | Yes | Column written with the claimant value when a row is claimed |
| `claimantValue` | string | Yes | The value identifying who is claiming — a distinct value claims the next row; a repeated value returns that claimant's existing value |
| `additionalColumnNameN` | string | No | Name of a further column to write on the claimed row (record extra context at claim time). Repeatable as name/value pairs. |
| `additionalColumnValueN` | string | No | Value written to the paired `additionalColumnNameN` column on the claimed row |

## Example

```ampscript
%%[
  SET @r = ClaimRowValue("ProbeDE", "Code", "IsClaimed", "none", "K", "v")
]%%
```

An email containing this six-argument call, placed in a branch that never runs, saved and published. What the call returns or writes in Next has not been tested.

## Return value

**`string`** — the declared return type. No result has been observed in Next yet.

## Behaviour

**Next accepts the six-argument syntax.** An email with `ClaimRowValue("ProbeDE", "Code", "IsClaimed", "none", "K", "v")` inside an `IF 1 == 2` branch saved and published, and the rest of the email rendered.

**Claiming was not tested.** A claim writes to the data source, and there was no claimable data source in the Next org to test against. None of the Engagement results (value returned, repeat claimant, fallback when exhausted, extra columns written, calls with fewer than six arguments) has been checked in Next.

{% include test-script.html bundle="next-ampscript-functions--claimrowvalue" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

{% include platform-compare.html %}

## See also

- [`ClaimRowValue` in Marketing Cloud Engagement](/engagement/ampscript/functions/claimrowvalue/) — how it behaves there
- [`ClaimRow`](/next/ampscript/functions/claimrow/) — the twin that returns the whole row
- [`Field`](/next/ampscript/functions/field/)
- [`LookupRows`](/next/ampscript/functions/lookuprows/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-claim-row-value.html)
