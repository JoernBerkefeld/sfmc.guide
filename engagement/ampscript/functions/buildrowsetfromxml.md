---
layout: page
title: "BuildRowSetFromXML"
description: "Parses an XML string using an XPath expression and returns a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the third argument, which works the opposite way round from the documented syntax."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/buildrowsetfromxml/
platforms:
  - engagement
syntax: "BuildRowSetFromXML(xmlData, xpathExpression, returnEmptyOnError)"
return_type: rowset
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `xmlData` | string | Yes | The XML payload to parse |
| `xpathExpression` | string | Yes | XPath expression selecting the nodes to turn into rows |
| `returnEmptyOnError` | boolean \| number | Yes | Pass `1` or `true` for an empty rowset when the payload or path cannot be parsed |

## Example

```ampscript
%%[
  VAR @xml, @rows
  SET @xml = '<root><Flight origin="IND">100.00</Flight></root>'
  SET @rows = BuildRowSetFromXML(@xml, "//Flight", 1)
]%%
Rows: %%=v(RowCount(@rows))=%% origin: %%=v(Field(Row(@rows, 1), "origin_att", 0))=%%
```

Renders `Rows: 1 origin: IND`.

Because untrusted input yields an empty rowset rather than a value you can test, guard the read with `RowCount`, and use the three-argument `Field` form for attribute columns that some nodes may not carry:

```ampscript
%%[
  VAR @rows, @row
  SET @rows = BuildRowSetFromXML(@payload, "//Flight", 1)
  IF RowCount(@rows) > 0 THEN
    SET @row = Row(@rows, 1)
]%%
    Price: %%=v(Field(@row, "Value", 0))=%% carrier: %%=v(Field(@row, "carrier_att", 0))=%%
%%[ ENDIF ]%%
```

## Return value

**`rowset`** — one row per node the XPath expression matched.

There is no closed set of sentinel values: an unparsable payload, an empty string, an unset variable, an empty root element and an XPath that matches nothing all produce a rowset of zero rows when the third argument is `1`, so `RowCount` is the only value worth branching on.

## Behaviour

**An XPath selecting sibling elements gives one row per matched element.** `//Flight` over three `Flight` elements produced three rows.

**Each row carries a `Value` column and an `Xml` column.** `Value` holds the element's own text and `Xml` holds its inner markup — for a plain element both read the same (`200.00`), but where the element has a child node `Value` read `500` while `Xml` also carried the child markup.

**Every attribute seen on any matched node becomes a `<name>_att` column.** The second flight read `IND` from `origin_att` and `UAL` from `carrier_att`. Lookup is case-insensitive: `Origin_att` returned the same value as `origin_att`. A node missing an attribute its siblings carry reads empty in that column rather than aborting — use the three-argument `Field` form for it.

**Ordinals run `Value`, then `Xml`, then the attribute columns.** On the second flight, ordinals `1`–`5` gave `200.00`, `200.00`, `IND`, `LAX` and `UAL`.

**An XPath selecting an attribute node gives one row.** `/root/Flight[1]/@origin` produced a single row whose `Value` and ordinal `1` both read `IND`.

**Rowsets are read 1-based.** `Row(rowset, 0)` and `Field(row, 0)` both abort the page, and the two-argument `Field` form on a missing column aborts too — prefer the three-argument form with `0` for anything that may be absent. `RowCount` never aborts and returns `0` for an empty rowset.

**Either capitalisation resolves to the same function.** `BuildRowsetFromXML` with a lowercase `s` produced identical results.

### The third argument is inverted

{% include callout.html type="warning" title="This contradicts the official documentation" content="The Syntax section presents a false third argument as the one that returns an empty rowset and a true one as the one that raises. At runtime it is the other way round." %}

| Call | Result |
|---|---|
| `BuildRowSetFromXML("<root><a>1</a>", "//a", 1)` | rowset with zero rows |
| `BuildRowSetFromXML("<root><a>1</a>", "//a", 0)` | HTTP 422, page aborted |

The boolean literal `true` behaves exactly like the number `1`. Read the argument as *return empty on error*: pass `1` (or `true`) for any payload you do not control, then branch on `RowCount`. The full finding is on [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromxml-error-flag-inverted), and the JSON sibling behaves identically.

{% include test-script.html bundle="ampscript-functions--buildrowsetfromxml" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromxml-error-flag-inverted) — the inverted third argument in full
- [`BuildRowsetFromJSON`](/engagement/ampscript/functions/buildrowsetfromjson/) — the same shape for JSON payloads, with the same inverted flag
- [`BuildRowSetFromString`](/engagement/ampscript/functions/buildrowsetfromstring/) — splits a delimited string into a rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-xml.html) · [ampscript.guide](https://ampscript.guide/buildrowsetfromxml/)
