---
layout: page
title: "AMPscript BuildRowSetFromString (Next)"
description: "Split a delimited string into a rowset with AMPscript BuildRowSetFromString in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the column that reads back as true instead of the segment."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/buildrowsetfromstring/
platforms:
  - next
syntax: "BuildRowSetFromString(sourceData, delimiter)"
return_type: rowset
min_args: 2
max_args: 2
verification: verified
differs_from_docs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Row counts match (`4` for `North**South**East**West`, `3` for `a,b,`, `0` for an empty string). Reading a segment does not: Engagement returns the text (`Field(Row(@rows, 1), 1)` gives `North`, the `Value` column gives `a`), while Next returns the flag of `Field` (its third argument, `true` when omitted) instead of the cell: `true` by position, `false` for `Field(row, \"Value\", 0)`. `Row(@rows, 0)` aborts in Engagement but gives `true` in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceData` | string | Yes | The delimited string to split into rows |
| `delimiter` | string | Yes | The separator to split on, one or more characters long |

Both arguments are needed: an email that passes only the source string cannot be saved.

## Example

```ampscript
%%=RowCount(BuildRowSetFromString("North**South**East**West", "**"))=%%
```

Renders `4`.

Use the row count to tell how many segments a string has; reading the segments back is not reliable in Next (see below).

## Return value

**`rowset`** — one row per segment of the input string.

An empty string and an unset variable both give a rowset of zero rows.

## Behaviour

**The row count matches the segments.** `North**South**East**West` split on `**` gives `4`. A trailing separator adds an empty last row: `a,b,` gives `3`, and the third row reads empty. Input without the separator gives one row, and an empty separator splits nothing: `a,b,c` with `""` gives `1`.

**Reading a segment returns `true`, not the text.** `Field(Row(@rows, 1), 1)` on the `North**South**East**West` rowset gives `true`; row `4` gives `true` too, not `West`. Reading the `Value` column with `Field(row, "Value", 0)` gives `false`: Next returns the flag (the third argument of `Field`, `true` when omitted), not the cell.

**Row 0 does not fail.** `Field(Row(@rows, 0), 1)` gives `true`.

**`Field(row, 0)` gave different results depending on how it was written.** The nested form `Field(Row(BuildRowSetFromString("a,b,c", ","), 1), 0)` breaks the render (HTTP 500). With the row stored in a variable first (`SET @row = Row(@rows, 1)`, then `Field(@row, 0)`), it rendered `true` (see [`Field`](/next/ampscript/functions/field/)).

**Reading a row of a `::` split failed to render.** `RowCount(BuildRowSetFromString("a::b::c", "::"))` on its own gives `3`. An email that rendered that count together with `Field(Row(BuildRowSetFromString("a::b::c", "::"), 2), 1)` made the preview fail (HTTP 500).

**Either capitalisation works.** `BuildRowsetFromString` with a lowercase `s` gives the same row count.

{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromstring" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromstring" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Documented as unavailable in Next, yet accepted.** The reference's availability table says No for Marketing Cloud Next. In a Next email the function split strings with correct row counts (`4` for `North**South**East**West` on `**`). [Card](/next/differs-from-docs/#buildrowsetfromstring-available-in-next)
- **Reading a segment by number gives `true`.** The reference reads the unnamed column with `Field(row, 1)`. In Next that returned `true` instead of the segment text; see [Field returns the flag](/next/differs-from-docs/#field-returns-flag-not-value). [Card](/next/differs-from-docs/#buildrowsetfromstring-ordinal-returns-true)

{% include platform-compare.html %}

## See also

- [`BuildRowSetFromString` in Marketing Cloud Engagement](/engagement/ampscript/functions/buildrowsetfromstring/) — how it behaves there
- [`BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — builds a rowset from JSON
- [`BuildRowSetFromXML`](/next/ampscript/functions/buildrowsetfromxml/) — builds a rowset from XML
- [`Row`](/next/ampscript/functions/row/), [`Field`](/next/ampscript/functions/field/), [`RowCount`](/next/ampscript/functions/rowcount/) — read the rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-string.html)
