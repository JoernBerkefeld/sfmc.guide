---
layout: page
title: "Field"
description: "Reads a named column from a rowset row. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that a missing column aborts the page unless the third argument is passed."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/field/
platforms:
  - engagement
  - next
syntax: "Field(row, fieldName[, exceptionIfNotFound])"
return_type: string
min_args: 2
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `row` | row | Yes | A row returned by `Row(rowset, index)` |
| `fieldName` | string | Yes | Name of the column to read |
| `exceptionIfNotFound` | boolean \| number | No | Pass `0` (or `false`) to get an empty string for a missing column instead of aborting; omit or `1`/`true` to abort |

## Example

```ampscript
%%[
  VAR @rows, @row
  SET @rows = LookupRows("AMP_VERIFY_SCRATCH", "Id", "A1")
  SET @row = Row(@rows, 1)
]%%
Name: %%=v(Field(@row, "FirstName"))=%%
```

With row `A1` whose `FirstName` is `Alice`, renders `Name: Alice`.

For a column that may not exist, pass the third argument `0` so a missing column yields an empty string instead of aborting the page:

```ampscript
%%[
  VAR @surcharge
  SET @surcharge = Field(@row, "PerBagSurcharge", 0)
]%%
```

## Return value

**`string`** — the value of the named column in the given row.

The third argument controls the missing-column path, not a default for an existing-but-empty column: an empty cell returns an empty string in every form.

## Behaviour

**Reads a named column from a row.** `Field(Row(rowset, 1), "FirstName")` returned `Alice`. Column names are case-insensitive.

**A missing column aborts in the two-argument form.** `Field(row, "NoSuchColumn")` aborts the CloudPage with HTTP 422 — everything already rendered is discarded.

**The third argument suppresses that abort.** `Field(row, "NoSuchColumn", 0)` returns an empty string instead of aborting. The argument is *exception-if-not-found*, not a default value: it only governs whether a missing column raises, so prefer the three-argument form for any column that may be absent.

{% include test-script.html bundle="ampscript-functions--field" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`Row`](/engagement/ampscript/functions/row/) — returns the row this reads from
- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — produces the rowset
- [`Lookup`](/engagement/ampscript/functions/lookup/) — a single scalar without a rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utility-field.html) · [ampscript.guide](https://ampscript.guide/field/)
