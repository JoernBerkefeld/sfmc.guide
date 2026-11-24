---
layout: page
title: "AMPscript BuildRowSetFromXML (Next)"
description: "Turn an XML string into a rowset with AMPscript BuildRowSetFromXML in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including why the XML has to be built with Char() or come from data."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/buildrowsetfromxml/
platforms:
  - next
syntax: "BuildRowSetFromXML(xmlData, xpathExpression, returnEmptyOnError)"
return_type: rowset
min_args: 3
max_args: 3
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Row counts match: `//Flight` over three `Flight` elements gives `3` rows on both, and empty, malformed and non-matching input give `0`. Engagement reads the `Value`, `Xml` and `<name>_att` columns with `Field` (`200.00`, `IND`); Next returns the flag (third argument of `Field`, `true` when omitted) instead of the cell. On malformed XML the flag `\"1\"` gives `0` rows on Engagement but makes the Next preview fail. In a Next email the save strips tags from XML written as a string literal, so the markup has to be built with `Char()` or come from data."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `xmlData` | string | Yes | The XML payload to parse. Build it with `Char()` or take it from data: tags written inside a string literal are stripped when the email is saved |
| `xpathExpression` | string | Yes | XPath expression selecting the nodes to turn into rows |
| `returnEmptyOnError` | string \| boolean \| number | Yes | Error flag. On valid XML all eight spellings (`true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"`) work. On malformed XML `1`, `true` and `"true"` give an empty rowset, while `0` and `"1"` make the render fail |

All three arguments are needed: an email that calls the function with only two cannot be saved.

## Example

```ampscript
%%[
  VAR @xml, @rows
  SET @xml = Concat(Char(60), "root", Char(62), Char(60), "row", Char(62), "1", Char(60), "/row", Char(62), Char(60), "row", Char(62), "2", Char(60), "/row", Char(62), Char(60), "/root", Char(62))
  SET @rows = BuildRowSetFromXML(@xml, "//row", 1)
]%%
%%=RowCount(@rows)=%%
```

Renders `2`: the document `<root><row>1</row><row>2</row></root>` has two `row` elements.

**Getting XML into the function.** Saving a Next email strips anything that looks like a tag out of AMPscript string literals, so XML typed into the call as `'<root>…</root>'` arrives as plain text. Use one of these instead:

- Build the markup with `Char(60)` for `<`, `Char(62)` for `>` and `Char(34)` for a double quote around attribute values, as above.
- Take the XML from data, for example a field value, so it is not part of the saved email.

## Return value

**`rowset`** — one row per node the XPath selects. Empty, malformed (with `1`, `true` or `"true"`) or non-matching input gives a rowset of zero rows. The row count matches Engagement; reading cells with `Field` does not return node content in Next (see Behaviour).

## Behaviour

**The save strips tags from string literals.** An email holding `BuildRowSetFromXML('<root><row>1</row><row>2</row></root>', "//row", 1)` is stored as `BuildRowSetFromXML('12', "//row", 1)`, so the function never sees the XML. Build the markup with `Char()` or pass XML that comes from data.

**One row per matched node.** Built with `Char()`, a document with one `Flight` element gives `1` row with `//Flight`, and a document with three `Flight` elements gives `3`. The attribute path `/root/Flight[1]/@origin` gives `1` row. These counts match Engagement.

**Zero rows when nothing matches.** An empty string, an unset variable, `<root></root>` with `//Flight`, and an XPath that matches nothing (`//NoSuchNode`) all give `0`, as on Engagement.

**`Field` returns its flag, not the cell.** On these rows `Field(Row(@rows, 2), "Value", 0)` gives `false` instead of `200.00`, and so do the `Xml` column and the attribute columns `origin_att` and `carrier_att` read with `0`, including a missing attribute. Reading by position (`Field(row, 1)` to `Field(row, 5)`, no flag) gives `true`. `Field` behaves the same way on [`BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/) rows and on the `Value` column of [`BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) rows, so in Next the function is useful for counting matches but not for reading node content.

**Every flag spelling works on valid XML.** Each of `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"` and `"0"`, used on its own, gave `3` rows for the three-element document. An email that held all eight calls at once failed to render; the cause was not isolated.

**Malformed XML depends on the flag.** For `<root><a>1</a>` (no closing `root`):

| Flag | Next | Engagement |
|---|---|---|
| `1` | `0` rows | `0` rows |
| `true` | `0` rows | `0` rows |
| `"true"` | `0` rows | `0` rows |
| `0` | preview fails (HTTP 500) | aborts |
| `"1"` | preview fails (HTTP 500) | `0` rows |

Each flag was tested alone in its own email; `"1"` made the preview fail with HTTP 500.

**Both spellings of the name work.** `BuildRowsetFromXML` (lower-case `s`) gives `3` rows for the three-element document, the same as `BuildRowSetFromXML`.

{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromxml" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromxml" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Documented as unavailable in Next, yet it works.** The reference's availability table says No for Marketing Cloud Next. In Next emails the function saved, rendered and returned the expected number of rows. [Card](/next/differs-from-docs/#buildrowsetfromxml-available-in-next)
- **XML written as a literal loses its tags.** The reference writes the XML document as a string literal. In a Next email the save strips the tags from such a literal, so the function gets plain text. [Card](/next/differs-from-docs/#buildrowsetfromxml-literal-tags-stripped)
- **`Field` returns the flag, not the node content.** The reference shows `Value`, `Xml` and attribute columns holding the node data. In Next, `Field` on these rows returns its flag (`false` or `true`). [Card](/next/differs-from-docs/#buildrowsetfromxml-field-returns-flag)
- **The error flag works the other way round.** The reference says `false` gives an empty rowset on bad XML and `true` an exception. In Next, malformed XML with `0` failed the render, while `1`, `true` and `"true"` gave `0` rows. [Card](/next/differs-from-docs/#buildrowsetfromxml-false-flag-fails)

{% include platform-compare.html %}

## See also

- [`BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — the JSON counterpart
- [`BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/) — splits a delimited string into a rowset
- [`Row`](/next/ampscript/functions/row/), [`Field`](/next/ampscript/functions/field/), [`RowCount`](/next/ampscript/functions/rowcount/) — read the rowset
- [`Char`](/next/ampscript/functions/char/) — build `<`, `>` and `"` for the XML
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-xml.html)
