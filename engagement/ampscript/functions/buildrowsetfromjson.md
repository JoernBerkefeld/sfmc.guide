---
layout: page
title: "BuildRowsetFromJSON"
description: "Parses a JSON string and returns a rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the third argument, which works the opposite way round from the documented syntax."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/buildrowsetfromjson/
platforms:
  - engagement
  - next
syntax: "BuildRowsetFromJSON(jsonData, jsonPathExpression, returnEmptyOnError)"
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
| `jsonData` | string | Yes | The JSON payload to parse |
| `jsonPathExpression` | string | Yes | JSONPath expression selecting the nodes to turn into rows |
| `returnEmptyOnError` | boolean \| number | Yes | Pass `1` or `true` for an empty rowset when the payload or path cannot be parsed |

## Example

```ampscript
%%[
  VAR @json, @rows
  SET @json = '{"Flights":[{"Origin":"IND","Dest":"NYC","Price":100.0},{"Origin":"IND","Dest":"LAX","Price":200.0},{"Origin":"IND","Dest":"SEA","Price":500.0}]}'
  SET @rows = BuildRowsetFromJSON(@json, "$.Flights[*]", 1)
]%%
Rows: %%=v(RowCount(@rows))=%% first: %%=v(Field(Row(@rows, 1), "Dest"))=%%
```

Renders `Rows: 3 first: NYC`.

Because untrusted input yields an empty rowset rather than a value you can test, guard the read with `RowCount` and use the three-argument `Field` form for columns that may be absent:

```ampscript
%%[
  VAR @rows, @row
  SET @rows = BuildRowsetFromJSON(@payload, "$.Flights[*]", 1)
  IF RowCount(@rows) > 0 THEN
    SET @row = Row(@rows, 1)
]%%
    Surcharge: %%=v(Field(@row, "PerBagSurcharge", 0))=%%
%%[ ENDIF ]%%
```

## Return value

**`rowset`** — one row per node the JSONPath expression matched.

There is no closed set of sentinel values: an unparsable payload, an empty string, an unset variable, an empty array and a path that matches nothing all produce a rowset of zero rows when the third argument is `1`, so `RowCount` is the only value worth branching on.

## Behaviour

**A path selecting an array of objects gives one row per element, with the object keys as named columns.** Selecting `$.Flights[*]` over a three-element array produced three rows, and the first row's `Origin`, `Dest` and `Price` columns read back as `IND`, `NYC` and `100`.

**Column names are case-insensitive, and columns are also addressable by 1-based ordinal.** Reading `dest` returned the same value as `Dest`, and ordinals `1` and `2` on the first row gave `IND` and `NYC`. A column that only some elements carry reads normally on the elements that have it.

**A trailing decimal zero is dropped.** The JSON literals `100.0` and `200.0` rendered as `100` and `200`.

**A path selecting scalars gives a single column named `Value`.** `$.Flights[*].Price` produced three rows whose second row read `200` both as `Value` and as ordinal `1`. A wildcard path over a single object gives one row per key, and a nested scalar array gives one row per element — both read by ordinal `1`.

**Structured values render empty rather than as a placeholder label.** Selecting the keys of an object whose values are themselves an object and an array gave three rows in which both structured cells were empty. The finding is catalogued on [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromjson-nested-values-empty).

**Rowsets are read 1-based.** `Row(rowset, 0)` and `Field(row, 0)` both abort the page. `Field(row, "<missing column>")` aborts too, while the three-argument form `Field(row, "<missing column>", 0)` renders an empty string — prefer that form for anything that may be absent. `RowCount` never aborts and returns `0` for an empty rowset.

**Either capitalisation resolves to the same function.** `BuildRowSetFromJSON` with a capital `S` produced identical results.

### The third argument is inverted

{% include callout.html type="warning" title="This contradicts the official documentation" content="The Syntax section presents a false third argument as the one that returns an empty rowset and a true one as the one that raises. At runtime it is the other way round." %}

| Call | Result |
|---|---|
| `BuildRowsetFromJSON("{ not json ", "$.Flights[*]", 1)` | rowset with zero rows |
| `BuildRowsetFromJSON("{ not json ", "$.Flights[*]", 0)` | HTTP 422, page aborted |

The boolean literal `true` behaves exactly like the number `1`. Read the argument as *return empty on error*: pass `1` (or `true`) for any payload you do not control, then branch on `RowCount`. The same page's Errors section already describes the runtime ordering, so the reference contradicts itself. The full finding is on [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromjson-error-flag-inverted), and the XML sibling behaves identically.

{% include test-script.html bundle="ampscript-functions--buildrowsetfromjson" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [Differs from official docs](/engagement/differs-from-docs/#buildrowsetfromjson-error-flag-inverted) — the inverted third argument in full
- [`BuildRowSetFromXML`](/engagement/ampscript/functions/buildrowsetfromxml/) — the same shape for XML payloads, with the same inverted flag
- [`BuildRowSetFromString`](/engagement/ampscript/functions/buildrowsetfromstring/) — splits a delimited string into a rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-json.html) · [ampscript.guide](https://ampscript.guide/buildrowsetfromjson/)
