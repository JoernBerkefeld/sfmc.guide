---
layout: page
title: "AMPscript LookupRows (Next)"
description: "AMPscript LookupRows in Marketing Cloud Next: syntax and what has been proven so far. An email containing the call saves; rendering it has not been tested in Next."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/lookuprows/
platforms:
  - next
syntax: "LookupRows(dataExt, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: rowset
min_args: 3
verification: in-progress
differs_from_docs: false
engagement: untested
mcn_tested: 2026-11-23
engagement_note: "Engagement returns every matching data extension row as a rowset, and an empty rowset when nothing matches. In Next, only saving an email with the call has been tested, so the two cannot be compared yet."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataExt` | string | Yes | Name or external key of the data extension to read |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%[
  SET @r = LookupRows("ProbeDE", "K", "v")
]%%
```

An email containing this call, placed in a branch that never runs, saved and published. What the call returns in Next has not been tested.

## Return value

**`rowset`** — the declared return type. No result has been observed in Next yet.

## Behaviour

**Next accepts the syntax.** An email with `LookupRows("ProbeDE", "K", "v")` inside an `IF 1 == 2` branch saved and published, and the rest of the email rendered.

**Rendering was not tested.** Reading rows needs a data source in the Next org, and none was available for the test. Do not rely on the Engagement results until they are checked in Next.

{% include test-script.html bundle="next-ampscript-functions--lookuprows" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

{% include platform-compare.html %}

## See also

- [`LookupRows` in Marketing Cloud Engagement](/engagement/ampscript/functions/lookuprows/) — how it behaves there
- [`Lookup`](/next/ampscript/functions/lookup/) — a single value from the first match
- [`LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/) — sorted and capped
- [`RowCount`](/next/ampscript/functions/rowcount/)
- [`Row`](/next/ampscript/functions/row/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup-rows.html)
