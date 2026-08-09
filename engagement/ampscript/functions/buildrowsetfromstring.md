---
layout: page
title: "BuildRowSetFromString"
description: "Splits a delimited string into a single-column rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the unnamed column and the empty separator that splits nothing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/buildrowsetfromstring/
platforms:
  - engagement
syntax: "BuildRowSetFromString(sourceData, delimiter)"
return_type: rowset
min_args: 2
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceData` | string | Yes | The delimited string to split into rows |
| `delimiter` | string | Yes | The separator to split on, one or more characters long |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = BuildRowSetFromString("North**South**East**West", "**")
]%%
Rows: %%=v(RowCount(@rows))=%% first: %%=v(Field(Row(@rows, 1), 1))=%%
```

Renders `Rows: 4 first: North`.

Because an empty or unset input produces a rowset with no rows rather than a value you can test, guard the read with `RowCount` before touching a row:

```ampscript
%%[
  VAR @rows, @i
  SET @rows = BuildRowSetFromString(@csv, ",")
  FOR @i = 1 TO RowCount(@rows) DO
]%%
  <li>%%=v(Field(Row(@rows, @i), 1))=%%</li>
%%[ NEXT @i ]%%
```

## Return value

**`rowset`** — one row per segment of the input string, in source order.

There is no closed set of sentinel values: an empty source string and an unset variable both produce a rowset of zero rows, so `RowCount` is the only value worth branching on.

## Behaviour

**Each segment becomes one row, in source order.** Splitting a four-region string on a two-character separator produced four rows whose first and fourth rows read `North` and `West`. A different two-character separator behaves the same way: `a::b::c` split on `::` gave three rows whose second row read `b`.

**The single column has no name, but answers to `Value`.** Read it by ordinal `1`; reading the first row of `a,b,c` as `Value` with the three-argument `Field` form also returned `a`.

**A trailing separator adds a final empty row.** The input `a,b,` gave three rows, the last of which read empty — it is not trimmed away.

**Input without the separator yields exactly one row.** `NoDelimiterHere` split on a comma gave one row holding the whole input.

**An empty separator splits nothing.** `a,b,c` with an empty separator gave a single row rather than one row per character. Both edge cases are catalogued on [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromstring-edge-separators).

**Rowsets are read 1-based.** `Row(rowset, 0)` and `Field(row, 0)` both abort the page. `RowCount` never aborts and returns `0` for an empty rowset.

**Either capitalisation resolves to the same function.** `BuildRowsetFromString` with a lowercase `s` produced identical results.

{% include test-script.html bundle="ampscript-functions--buildrowsetfromstring" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromstring-edge-separators) — the separator edge cases in full
- [`BuildRowsetFromJSON`](/engagement/ampscript/functions/buildrowsetfromjson/) · [`BuildRowSetFromXML`](/engagement/ampscript/functions/buildrowsetfromxml/) — the same rowset shape for structured payloads
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-string.html) · [ampscript.guide](https://ampscript.guide/buildrowsetfromstring/)
