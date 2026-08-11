---
layout: page
title: "ExecuteFilter"
description: "Executes a data-extension-based data filter and returns the matching rows as an unordered rowset. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including what an empty filter returns and its case-insensitive matching."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/executefilter/
platforms:
  - engagement
syntax: "ExecuteFilter(dataFilterExternalId)"
return_type: rowset
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dataFilterExternalId` | string | Yes | External key of a data filter that is based on a data extension |

## Example

```ampscript
%%[
  VAR @rows
  SET @rows = ExecuteFilter("AMP_VERIFY_FILTER")
]%%
Matches: %%=v(RowCount(@rows))=%%
```

With a filter `FirstName Equals "Alice"` over a data extension holding two Alice rows and one Bob row, renders `Matches: 2`.

Iterate the returned rowset with [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/):

```ampscript
%%[
  VAR @rows, @i, @r
  SET @rows = ExecuteFilter("AMP_VERIFY_FILTER")
  FOR @i = 1 TO RowCount(@rows) DO
    SET @r = Row(@rows, @i)
]%%
%%=v(Field(@r, "Id"))=%%: %%=v(Field(@r, "FirstName"))=%%
%%[
  NEXT @i
]%%
```

Emits `F1: Alice` and `F3: Alice` — the Bob row is excluded.

## Return value

**`rowset`** — the rows that satisfy the data filter, unordered. Pass it to [`RowCount`](/engagement/ampscript/functions/rowcount/), [`Row`](/engagement/ampscript/functions/row/) and [`Field`](/engagement/ampscript/functions/field/). A filter that matches nothing returns an **empty rowset** (`RowCount` `0`), not a null or an error — the page does not abort.

## Behaviour

**Only data-extension-based filters.** The filter referenced by `dataFilterExternalId` must be built on a data extension; profile-attribute filters are not supported. Use this on CloudPages, landing pages, microsites, and MobileConnect SMS.

**The filter value comparison is case-insensitive.** A row whose `FirstName` was `alice` matched a filter searching for `Alice`, alongside the exact-case rows.

**Returns an unordered rowset.** Row order is not guaranteed; use [`ExecuteFilterOrderedRows`](/engagement/ampscript/functions/executefilterorderedrows/) when you need sorting or a row cap.

{% include test-script.html bundle="ampscript-functions--executefilter" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ExecuteFilterOrderedRows`](/engagement/ampscript/functions/executefilterorderedrows/) — same, with a sort column and a row limit
- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — filter a data extension inline without a saved data filter
- [`Row`](/engagement/ampscript/functions/row/) · [`Field`](/engagement/ampscript/functions/field/) · [`RowCount`](/engagement/ampscript/functions/rowcount/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-execute-filter.html) · [ampscript.guide](https://ampscript.guide/executefilter/)
