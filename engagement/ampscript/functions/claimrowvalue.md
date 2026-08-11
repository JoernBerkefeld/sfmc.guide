---
layout: page
title: "ClaimRowValue"
description: "Claims the next unclaimed row of a data extension for a caller and returns a single column value, falling back to a supplied default when no unclaimed rows remain. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/claimrowvalue/
platforms:
  - engagement
syntax: "ClaimRowValue(dataExt, returnColumn, claimColumn, fallbackValue, claimantColumn, claimantValue)"
return_type: string
min_args: 6
verification: verified
test_scripts: complete
differs_from_docs: false
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

## Example

```ampscript
%%[
  VAR @code
  SET @code = ClaimRowValue("Coupons", "CouponCode", "IsClaimed", "SOLD OUT", "EmailAddress", emailaddr)
]%%
Your code: %%=v(@code)=%%
```

Each **distinct** `claimantValue` claims the next unclaimed row and returns that row's `returnColumn` value. When every row is already claimed, the call returns `fallbackValue` (`SOLD OUT` above) instead.

## Return value

**`string`** — the `returnColumn` value from the claimed row, or `fallbackValue` when the data extension has no unclaimed rows left. Unlike [`ClaimRow`](/engagement/ampscript/functions/claimrow/), which returns the whole row (and an empty row on exhaustion), `ClaimRowValue` returns a single scalar and the caller-supplied fallback.

## Behaviour

**Distinct claimants advance; a repeated claimant does not.** Claiming is keyed on `claimantValue`. A **new** value claims the next unclaimed row and advances; a value that already holds a row returns **that same row's value** without advancing — per-subscriber idempotency.

**A claimable data extension needs the documented schema.** A text primary key, a claimant text column, a **required** non-nullable Boolean claim column defaulting to `False`, and (optionally) a nullable claimant date column. This schema was created via the API and advanced correctly.

**Exhaustion returns the fallback, matching the docs.** When no unclaimed rows remain, the fourth argument (`fallbackValue`) is returned. Proven on a CloudPage: four distinct claimants advanced through C1..C4, then a fifth distinct claimant received the fallback. This is the exact behaviour the official reference describes.

{% include callout.html type="warning" title="Drive advancement across separate renders" content="AMPscript caches data-extension reads within a single render. Prove advancement across **separate HTTP requests**, each passing a distinct claimant — a single render that claims repeatedly reads the cached state and appears not to advance." %}

{% include test-script.html bundle="ampscript-functions--claimrowvalue" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ClaimRow`](/engagement/ampscript/functions/claimrow/) — the twin that returns the whole row (and an empty row on exhaustion)
- [`Field`](/engagement/ampscript/functions/field/) · [`LookupRows`](/engagement/ampscript/functions/lookuprows/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-claim-row-value.html) · [ampscript.guide](https://ampscript.guide/claimrowvalue/)
