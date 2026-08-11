---
layout: page
title: "DataExtensionRowCount"
description: "Returns the total number of rows in a data extension. Runtime-proven on a live Marketing Cloud Engagement CloudPage."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/dataextensionrowcount/
platforms:
  - engagement
syntax: "DataExtensionRowCount(dataExtensionName)"
return_type: number
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
| `dataExtensionName` | string | Yes | Name or external key of the data extension to count |

## Example

```ampscript
%%[
  VAR @total
  SET @total = DataExtensionRowCount("AMP_VERIFY_SCRATCH")
]%%
Rows: %%=v(@total)=%%
```

With three seeded rows, renders `Rows: 3`.

Unlike `RowCount`, it takes the data extension by name and needs no prior lookup, so it is a one-line total:

```ampscript
Subscribers: %%=v(DataExtensionRowCount("AMP_VERIFY_SCRATCH"))=%%
```

## Return value

**`number`** — the total number of rows currently stored in the named data extension.

There is no sentinel: the result is a bare non-negative integer.

## Behaviour

**Counts every row in the data extension by name.** After seeding three rows, `DataExtensionRowCount("AMP_VERIFY_SCRATCH")` returned `3`. It is addressed by data extension name or external key — no rowset and no filter, so it counts the whole table rather than a matched subset.

{% include test-script.html bundle="ampscript-functions--dataextensionrowcount" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Check the official reference |

## See also

- [`RowCount`](/engagement/ampscript/functions/rowcount/) — counts the rows in a rowset rather than a whole data extension
- [`LookupRows`](/engagement/ampscript/functions/lookuprows/) — read a filtered subset of the same data extension
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-data-extension/mc-ampscript-reference-data-extension-row-count.html) · [ampscript.guide](https://ampscript.guide/dataextensionrowcount/)
