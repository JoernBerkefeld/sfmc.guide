---
layout: page
title: "BeginImpressionRegion"
description: "Marks the start of an impression tracking region. Runtime-proven on a live Marketing Cloud Engagement CloudPage — the region name must be a literal, and a variable argument aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/beginimpressionregion/
platforms:
  - engagement
syntax: "BeginImpressionRegion(regionName)"
return_type: string
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
| `regionName` | string | Yes | Literal name of the impression region to open |

## Example

```ampscript
%%[
  BeginImpressionRegion("nav-region")
]%%
before-%%=BeginImpressionRegion("nav-region")=%%-after
```

Renders `before--after` — the call emits nothing into the page.

Paired with `EndImpressionRegion` around a block of content:

```ampscript
%%=BeginImpressionRegion("promo")=%%
Shop the sale
%%=EndImpressionRegion()=%%
```

## Return value

**`string`** — an empty string. The call contributes nothing visible to the rendered output.

## Behaviour

**It emits nothing on a CloudPage.** The call renders an empty string; wrapping it in marker text shows `before--after`, so nothing is passed through and no marker or comment is inserted.

**The region name must be a literal.** Passing a variable as the region name aborts the whole page (HTTP 422) at compile time. A literal string argument renders cleanly.

{% include test-script.html bundle="ampscript-functions--beginimpressionregion" chapter="behaviour" %}

Impression regions are an **email-send** feature: they name a region of a message so opens and clicks inside it can be tracked in aggregate. That tracking only exists in a sent email context and cannot be exercised from a CloudPage, where the call simply renders empty. This page proves only what a CloudPage can show — the call is accepted and emits nothing.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`EndImpressionRegion`](/engagement/ampscript/functions/endimpressionregion/) — closes the region this opens
- [`TreatAsContentArea`](/engagement/ampscript/functions/treatascontentarea/) — takes an impression region name as its third argument
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-begin-impression-region.html) · [ampscript.guide](https://ampscript.guide/beginimpressionregion/)
