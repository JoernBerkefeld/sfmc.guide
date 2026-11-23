---
layout: page
title: "AMPscript BuildRowSetFromXML (Next)"
description: "Turn an XML string into a rowset with AMPscript BuildRowSetFromXML in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, where valid XML returned no rows."
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
engagement_note: "Engagement returns one row per matched node: `//Flight` over three `Flight` elements gives `3` rows, with `Value`, `Xml` and `<name>_att` columns (`200.00`, `IND`). In Next test emails, with the XML written as a literal in the email's HTML component, the same XML gave `0` rows, and reads from those rows returned the flag (third argument of `Field`, `true` when omitted), not the cell; the save step may have changed the markup (e.g. tag case, so `//Flight` would not match), which is not yet ruled out. Empty, unset and malformed input give `0` rows on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `xmlData` | string | Yes | The XML payload to parse |
| `xpathExpression` | string | Yes | XPath expression selecting the nodes to turn into rows |
| `returnEmptyOnError` | string \| boolean \| number | Yes | Error flag. `1` gives an empty rowset for malformed XML and `0` fails the render; other spellings were not proven |

All three arguments are needed: an email that calls the function with only two cannot be saved.

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = BuildRowSetFromXML('<root><Flight origin="IND">100.00</Flight></root>', "//Flight", 1)
]%%
%%=RowCount(@rows)=%%
```

Rendered `0` in a Next test email, although the XML is well formed and holds one matching `Flight` element. The XML was written as a literal in the email's HTML component, and saving the email may have changed that markup (for example the tag case, so `//Flight` would no longer match); this is not yet ruled out. Do not rely on this function for row data in Next until it has been re-tested.

## Return value

**`rowset`** — in the Next test emails, a rowset of zero rows for every input tested (the XML was a literal in the HTML component; see Behaviour).

## Behaviour

**Valid XML gave zero rows in the test emails.** `<root><Flight origin="IND">100.00</Flight></root>` with `//Flight` gave `0`. A document with three `Flight` elements gave `0` too, and so did an attribute path such as `/root/Flight[1]/@origin`. In every case the XML was written as a literal in the email's HTML component, and the save step may have changed the markup (for example the tag case, so `//Flight` would not match). That is not yet ruled out, so treat the result as unconfirmed until it is re-tested with the XML kept out of the HTML markup.

**Reads from the empty rowset do not fail.** `Field` returns the flag (third argument, `true` when omitted), not the cell: `Field(Row(@rows, 2), "Value", 0)` gives `false`, and so do the `Xml` and `<name>_att` columns (`origin_att`, `carrier_att`) read with `0`. Reading by position (`Field(row, 1)` to `Field(row, 5)`, no flag) gives `true`. None of this is the node content.

**Empty, unset and malformed input give zero rows.** An empty string, an unset variable, `<root></root>`, an XPath that matches nothing and the malformed `<root><a>1</a>` with the flag `1` all give `0`.

**A falsy flag on malformed XML fails the render.** `BuildRowSetFromXML("<root><a>1</a>", "//a", 0)` makes the preview fail (HTTP 500).

**Several cases failed to render.** The spelling `BuildRowsetFromXML` (lowercase `s`) on valid XML, an email using all eight flag spellings on valid XML, and an email using `true`, `"true"` and `"1"` on malformed XML each made the preview fail (HTTP 500). The capital-`S` spelling with the flag `true` gave `0` rows.

{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromxml" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--buildrowsetfromxml" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **Documented as unavailable in Next, yet accepted.** The reference's availability table says No for Marketing Cloud Next. In Next emails the function saved and rendered. [Card](/next/differs-from-docs/#buildrowsetfromxml-available-in-next)
- **Well-formed XML gave zero rows (unconfirmed).** The reference shows three `Flight` elements becoming three rows. In the Next test emails the same kind of document gave `0` rows, but the XML was a literal in the HTML component and the save step may have changed it, so this is not yet confirmed. [Card](/next/differs-from-docs/#buildrowsetfromxml-zero-rows-unconfirmed)
- **The error flag works the other way round.** The reference says `false` gives an empty rowset on bad XML. In Next, `0` on malformed XML failed the render and `1` gave `0` rows (same caveat about the literal XML). [Card](/next/differs-from-docs/#buildrowsetfromxml-false-flag-fails)
- **The reference's own spelling breaks the render.** Its example writes `BuildRowsetFromXml` with a lower-case `s`. In Next, `BuildRowsetFromXML` made the preview fail (HTTP 500); `BuildRowSetFromXML` rendered. [Card](/next/differs-from-docs/#buildrowsetfromxml-lowercase-s-fails)

{% include platform-compare.html %}

## See also

- [`BuildRowSetFromXML` in Marketing Cloud Engagement](/engagement/ampscript/functions/buildrowsetfromxml/) — how it behaves there
- [`BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — the JSON counterpart, which does return rows in Next
- [`BuildRowSetFromString`](/next/ampscript/functions/buildrowsetfromstring/) — splits a delimited string into a rowset
- [`Row`](/next/ampscript/functions/row/), [`Field`](/next/ampscript/functions/field/), [`RowCount`](/next/ampscript/functions/rowcount/) — read the rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-rowset-from-xml.html)
