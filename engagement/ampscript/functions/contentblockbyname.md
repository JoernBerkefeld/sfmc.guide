---
layout: page
title: "ContentBlockByName"
description: "Retrieves and renders a Content Builder content block by its full Name/path. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the missing-block default path and that default content is emitted literally."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/contentblockbyname/
platforms:
  - engagement
  - next
syntax: "ContentBlockByName(contentBlockName[, impressionRegionName, errorOnMissingContentBlock, errorMessage, statusCode])"
return_type: string
min_args: 1
max_args: 5
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `contentBlockName` | string | Yes | Full Name/path of the content block to retrieve (for example `Content Builder\My Folder\My Block`) |
| `impressionRegionName` | string | No | Impression region name to associate with the block |
| `errorOnMissingContentBlock` | boolean | No | When true (the default), a missing block aborts; set to 0 to fall back to the default content |
| `errorMessage` | string | No | Default content returned when the block is missing — emitted literally |
| `statusCode` | number | No | Output variable set to 0 on success or -1 when no content was found |

## Example

```ampscript
%%=ContentBlockByName('Content Builder\My Folder\Welcome Banner')=%%
```

Renders the stored body of the block at that path.

A more defensive form suppresses the missing-block abort and supplies fallback text plus a status variable:

```ampscript
%%[
  VAR @sc, @out
  SET @out = ContentBlockByName("Content Builder\nosuch-name", "", 0, "Block unavailable", @sc)
]%%
%%=v(@out)=%%
```

Renders `Block unavailable` and sets `@sc` to `-1`.

## Return value

**`string`** — the rendered HTML of the referenced block, or the `errorMessage` default when the block is missing and `errorOnMissingContentBlock` is 0. There is no closed set of sentinel values.

## Behaviour

**A full block Name/path renders the block body.** The path is the complete folder chain plus the block name, using backslashes as separators.

**A missing block with the error flag set to 0 returns the default content.** `ContentBlockByName("Content Builder\nosuch-name", "", 0, "FB", @sc)` renders `FB` and sets the status variable to `-1` instead of aborting the page.

**The default content is emitted literally.** A default containing an inline expression renders verbatim; the embedded AMPscript is **not** evaluated. Use [`TreatAsContent`](/engagement/ampscript/functions/treatascontent/) if the fallback string itself needs to run as AMPscript.

**The full five-argument signature works.** All optional arguments are honoured — unlike the SSJS binding of the same name, which only reads the first argument.

{% include test-script.html bundle="ampscript-functions--contentblockbyname" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | Yes, from API 67.0 |

## See also

- [`ContentBlockByID`](/engagement/ampscript/functions/contentblockbyid/) — retrieve the same block by its numeric ID
- [`ContentBlockByKey`](/engagement/ampscript/functions/contentblockbykey/) — retrieve the same block by its customer key
- [`ContentArea`](/engagement/ampscript/functions/contentarea/) · [`ContentAreaByName`](/engagement/ampscript/functions/contentareabyname/) — the retired Classic-content equivalents
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-block-by-name.html) · [ampscript.guide](https://ampscript.guide/contentblockbyname/)
