---
layout: page
title: "AMPscript ContentBlockByID (Next)"
description: "Load a content block by numeric ID with AMPscript ContentBlockByID in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the missing-block fallback that breaks the render."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/contentblockbyid/
platforms:
  - next
syntax: "ContentBlockByID(contentBlockId[, impressionRegionName, errorOnMissingContentBlock, errorMessage, statusCode])"
return_type: string
min_args: 1
max_args: 5
verification: in-progress
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "For an ID that does not exist with the error flag `0`, Engagement returns the fallback text and sets the status variable to `-1` (`FB-CBID -1`); in Next the same email fails to render (HTTP 500). The falsy spellings `false`, `\"false\"` and `\"0\"` fail the same way in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `contentBlockId` | number \| string | Yes | Numeric identifier of the content block to insert |
| `impressionRegionName` | string | No | Name of an impression region that the inserted block is tracked under |
| `errorOnMissingContentBlock` | string \| boolean \| number | No | Error flag. In Next a missing block fails the render with any value tested: `1`, `0`, `false`, `"false"`, `"0"` |
| `errorMessage` | string | No | Fallback text for a missing block; in Next the render fails before it is used |
| `statusCode` | number | No | Output variable for the lookup status; not observed in Next, as the render fails first |

One to five arguments: an email that calls `ContentBlockByID()` with none, or with a sixth argument, cannot be saved.

## Example

```ampscript
%%[
  VAR @sc, @out
  SET @out = ContentBlockByID(999999999, "", 0, "Block unavailable", @sc)
]%%
%%=v(@out)=%%
```

ID `999999999` does not exist. In Next this email saves and publishes, but the preview fails (HTTP 500) instead of rendering `Block unavailable`. Only reference blocks that exist.

## Return value

**`string`** — meant to be the rendered block. Loading a block that exists was not tested in Next, so no return value has been observed.

## Behaviour

**A missing block fails the render, whatever the error flag.** With the flag `0`, `false`, `"false"` or `"0"`, an ID that does not exist makes the preview fail (HTTP 500) instead of returning the fallback text. The flag `1` fails the same way.

**The fallback text is never reached.** A fallback containing `%%=Add(2,3)=%%` also ends in a failed render, so whether it would be evaluated or printed as written is unknown in Next.

**The argument count is checked at save.** `ContentBlockByID()` and a six-argument call are both refused with HTTP 400 and "The AMPscript syntax isn't valid".

**Loading an existing block was not tested in Next.** The test block used on Engagement does not exist in the Next org, so rendering a found block, the numeric-string ID form and the status code on success are all unproven.

{% include test-script.html bundle="next-ampscript-functions--contentblockbyid" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **A missing block fails the render despite a falsy flag.** The reference says the flag `false` makes the function return the fallback text and set the status code to `-1`. In Next, a block that does not exist made the preview fail (HTTP 500) with `0`, and an email combining `false`, `"false"` and `"0"` also failed (not isolated per value), so neither the fallback nor the status code is ever used. [Card](/next/differs-from-docs/#contentblockbyid-missing-block-fails)

{% include platform-compare.html %}

## See also

- [`ContentBlockByID` in Marketing Cloud Engagement](/engagement/ampscript/functions/contentblockbyid/) — how it behaves there
- [`ContentBlockByKey`](/next/ampscript/functions/contentblockbykey/) — retrieve a block by its customer key
- [`ContentBlockByName`](/next/ampscript/functions/contentblockbyname/) — retrieve a block by its folder path and name
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-block-by-id.html)
