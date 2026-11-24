---
layout: page
title: "AMPscript Lookup (Next)"
description: "AMPscript Lookup in Marketing Cloud Next: syntax and what has been proven so far. An email containing the call saves; rendering it has not been tested in Next."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/lookup/
platforms:
  - next
syntax: "Lookup(dataObject, returnColumn, searchColumn1, searchValue1[, searchColumnN, searchValueN, ...])"
return_type: string
min_args: 4
verification: in-progress
differs_from_docs: false
engagement: untested
mcn_tested: 2026-11-23
engagement_note: "Engagement returns the column value of the first matching data extension row, or an empty string when nothing matches. In Next, only saving an email with the call has been tested, so the two cannot be compared yet."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataObject` | string | Yes | Name or external key of the data extension to read |
| `returnColumn` | string | Yes | Column whose value is returned from the first matching row |
| `searchColumn1` | string | Yes | First column to filter on |
| `searchValue1` | string \| number | Yes | Value the first column must equal |
| `searchColumnN` | string | No | Further filter columns, each paired with a value |
| `searchValueN` | string \| number | No | Value the corresponding further column must equal |

## Example

```ampscript
%%=Lookup("ProbeDE", "F", "K", "v")=%%
```

An email containing this call, placed in a branch that never runs, saved and published. What the call renders in Next has not been tested.

## Return value

**`string`** — the declared return type. No output has been observed in Next yet.

## Behaviour

**Next accepts the syntax.** An email with `Lookup("ProbeDE", "F", "K", "v")` inside an `IF 1 == 2` branch saved and published, and the rest of the email rendered.

**Rendering was not tested.** Reading a value needs a data source in the Next org to look up, and none was available for the test. Do not rely on the Engagement results (first match, empty string on no match, several column/value pairs, numeric criteria) until they are checked in Next.

{% include test-script.html bundle="next-ampscript-functions--lookup" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

{% include platform-compare.html %}

## See also

- [`LookupRows`](/next/ampscript/functions/lookuprows/) — every matching row as a rowset
- [`LookupOrderedRows`](/next/ampscript/functions/lookuporderedrows/)
- [`Field`](/next/ampscript/functions/field/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-lookup.html)
