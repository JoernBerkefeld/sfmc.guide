---
layout: page
title: "AMPscript BuildRowsetFromJSON (Next)"
description: "Turn a JSON string into a rowset with AMPscript BuildRowsetFromJSON in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including case-sensitive column names, ordinal reads and kept decimals."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/buildrowsetfromjson/
platforms:
  - next
syntax: "BuildRowsetFromJSON(jsonData, jsonPathExpression, returnEmptyOnError)"
return_type: rowset
min_args: 3
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Row counts and exact-case named columns match (`Origin` gives `IND` on both). Engagement drops a trailing decimal zero (`100.0` gives `100`; Next keeps `100.0`), matches column names case-insensitively (`dest` gives `SEA`; Next gives an empty string) and reads columns by ordinal (`IND`; Next gives `true` or an empty string). On the invalid payload `{ not json ` the flag works the reverse way: Engagement aborts with a falsy third argument, where Next renders on, and returns `0` rows with a truthy one, where Next fails the render."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `jsonData` | string | Yes | The JSON payload to parse |
| `jsonPathExpression` | string | Yes | JSONPath expression selecting the nodes to turn into rows |
| `returnEmptyOnError` | string \| boolean \| number | Yes | Error flag. `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` are all accepted; with valid JSON every one of them returns the same rows |

All three arguments are needed: an email that calls the function with only two cannot be saved.

## Example

```ampscript
%%[
  VAR @json, @rows
  SET @json = '{"Flights":[{"Origin":"IND","Dest":"NYC","Price":100.0},{"Origin":"IND","Dest":"LAX","Price":200.0},{"Origin":"IND","Dest":"SEA","Price":500.0,"PerBagSurcharge":25}]}'
  SET @rows = BuildRowsetFromJSON(@json, "$.Flights[*]", 1)
]%%
Rows: %%=RowCount(@rows)=%% last: %%=Field(Row(@rows, 3), "Dest")=%% surcharge: %%=Field(Row(@rows, 3), "PerBagSurcharge", 0)=%%
```

Renders `Rows: 3 last: SEA surcharge: 25`.

## Return value

**`rowset`** — one row per node the JSONPath expression matched.

A path that matches nothing, an empty array (`"[]"` with `$[*]`) and the text `not json` all give a rowset of zero rows, so branch on `RowCount`.

## Behaviour

**An array of objects gives one row per element.** `$.Flights[*]` over three flights gives three rows. Read columns by the exact key: the first row's `Origin` and `Dest` give `IND` and `NYC`. A key that only the third flight carries (`PerBagSurcharge`) reads `25` there.

**Column names are case-sensitive.** Reading `dest` instead of `Dest` gives an empty string.

**Numbers keep their decimals.** A `Price` of `100.0` reads back as `100.0`.

**Reading by position does not return the value.** `Field(row, 1)` and `Field(row, 2)` on the first flight give empty strings. On rows built from scalars (`$.Flights[*].Price`, `$.*` over a flat object, `$.Shapes[*]` over a string array) the row count is right, but `Field(row, 1)` gives `true` and `Field(row, "Value", 0)` gives `false`. Read objects by key name.

**A missing column renders empty.** Both `Field(row, "NoSuchColumn", 0)` and the two-argument `Field(row, "NoSuchColumn")` render an empty string; neither fails the email.

**On the payload `{ not json ` the flag works the reverse way from Engagement.** With the flag `0` the email renders on, where Engagement aborts. An email that used the truthy flags `true`, `"true"` and `"1"` together on that payload failed to render (HTTP 500), where Engagement returns zero rows; which of the three spellings fails was not isolated. On the payload `not json`, the flag `1` gave zero rows.

**Some inputs break the render.** An empty string and an unset variable as the payload both made the preview fail. Test `@json` for content before you call the function.

**Either capitalisation works.** `BuildRowSetFromJSON` with a capital `S` gives the same three rows.

{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromjson" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromjson" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Decimals keep their `.0`.** The reference's flights example shows the prices `100.0`, `200.0` and `500.0` as `100`, `200` and `500` in the rowset. Next returned `100.0`. [Card](/next/differs-from-docs/#buildrowsetfromjson-decimal-kept)
- **Reading by column number or through `Value` does not return the data.** The reference's code example reads the columns by number, and a path to plain values is said to give a `Value` column. In Next, numbered reads on object rows gave empty strings, and on scalar rows `Field(row, 1)` gave `true` and `Field(row, "Value", 0)` gave `false`; see [Field returns the flag](/next/differs-from-docs/#field-returns-flag-not-value). [Card](/next/differs-from-docs/#buildrowsetfromjson-ordinal-and-value-reads)
- **The error flag does not match the reference on invalid JSON.** The Errors section says `0` raises an exception and `1` gives an empty rowset. In Next, `0` rendered on without failing, `1` on `not json` gave `0` rows, and an email using `true`, `"true"` and `"1"` on `{ not json ` failed to render (the failing spelling was not isolated). [Card](/next/differs-from-docs/#buildrowsetfromjson-invalid-json-flag)
- **An empty or unset payload breaks the render.** The reference promises an empty rowset for unparseable input with the flag `1`. In Next, an unset variable made the preview fail (HTTP 500), and with an empty string the preview never showed a new rendered version. [Card](/next/differs-from-docs/#buildrowsetfromjson-empty-payload-fails)

{% include platform-compare.html %}

## See also

- [`BuildRowsetFromJSON` in Marketing Cloud Engagement](/engagement/ampscript/functions/buildrowsetfromjson/) — how it behaves there
- [`BuildRowSetFromXML`](/next/ampscript/functions/buildrowsetfromxml/) — the XML counterpart
- [`BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/) — splits a delimited string into a rowset
- [`Row`](/next/ampscript/functions/row/), [`Field`](/next/ampscript/functions/field/), [`RowCount`](/next/ampscript/functions/rowcount/) — read the rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-json.html)
