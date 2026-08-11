---
layout: page
title: "ClaimRow"
description: "Claims the next unclaimed row of a data extension for a caller and returns the whole row, flipping its claim flag and recording the claimant. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/claimrow/
platforms:
  - engagement
syntax: "ClaimRow(dataExt, claimColumn, claimantColumn, claimantValue)"
return_type: row
min_args: 4
verification: verified
test_scripts: complete
differs_from_docs: true
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

## Example

```ampscript
%%[
  VAR @row
  SET @row = ClaimRow("Coupons", "IsClaimed", "EmailAddress", emailaddr)
]%%
Your code: %%=Field(@row, "CouponCode")=%%
```

Each **distinct** `claimantValue` claims the next unclaimed row: the first caller receives the first unclaimed row, the second caller the next one, and so on. The claimed row's `claimColumn` flips to `True` and its `claimantColumn` records the claimant. A claimant date column, if present, is auto-populated.

## Return value

**`row`** — the claimed row. Read individual columns with [`Field`](/engagement/ampscript/functions/field/). When the data extension has no unclaimed rows left, an **empty row** is returned (see Behaviour) — guard it with [`Empty`](/engagement/ampscript/functions/empty/). The scalar twin [`ClaimRowValue`](/engagement/ampscript/functions/claimrowvalue/) returns a single column value plus a fallback instead of the whole row.

## Behaviour

**Distinct claimants advance; a repeated claimant does not.** Claiming is keyed on `claimantValue`. Passing a **new** value claims the next unclaimed row and advances. Passing a value that already holds a row returns **that same row** without advancing — per-subscriber idempotency, so a subscriber re-opening an email keeps the same coupon.

**A claimable data extension needs the documented schema.** A text primary key, a claimant text column, a **required** non-nullable Boolean claim column defaulting to `False`, and (optionally) a nullable claimant date column. This schema was created via the API and advanced correctly — no Contact Builder UI wizard was required.

**Exhaustion returns an empty row, not an exception.** The official reference says `ClaimRow` returns an exception when no unclaimed rows remain. At runtime it returns an **empty row** and the page keeps rendering, so `Empty()` on the result is `true` and nothing aborts. Guard with `Empty()` rather than expecting a raised error.

{% include callout.html type="warning" title="Drive advancement across separate renders" content="AMPscript caches data-extension reads within a single render. Prove advancement across **separate HTTP requests**, each passing a distinct claimant — a single render that claims repeatedly reads the cached state and appears not to advance." %}

{% include test-script.html bundle="ampscript-functions--claimrow" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ClaimRowValue`](/engagement/ampscript/functions/claimrowvalue/) — the scalar twin; returns one column value plus a fallback when exhausted
- [`Empty`](/engagement/ampscript/functions/empty/) — guard the exhausted-DE empty row
- [`Field`](/engagement/ampscript/functions/field/) · [`LookupRows`](/engagement/ampscript/functions/lookuprows/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-claim-row.html) · [ampscript.guide](https://ampscript.guide/claimrow/)
