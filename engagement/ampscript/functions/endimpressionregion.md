---
layout: page
title: "EndImpressionRegion"
description: "Marks the end of an impression tracking region. Runtime-proven on a live Marketing Cloud Engagement CloudPage — the optional argument accepts boolean, string, and number truthy values to close all open regions."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/endimpressionregion/
platforms:
  - engagement
syntax: "EndImpressionRegion([endAllRegions])"
return_type: string
min_args: 0
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
| `endAllRegions` | string \| boolean \| number | No | A truthy value ends every open region; the default ends only the most recent |

## Example

```ampscript
%%[
  BeginImpressionRegion("promo")
  EndImpressionRegion()
]%%
before-%%=EndImpressionRegion()=%%-after
```

Renders `before--after` — the call emits nothing into the page.

Close all open regions at once with a truthy argument:

```ampscript
%%=EndImpressionRegion(true)=%%
```

## Return value

**`string`** — an empty string. The call contributes nothing visible to the rendered output.

## Behaviour

**It emits nothing on a CloudPage.** With zero or one argument the call renders an empty string; wrapped in marker text it shows `before--after`.

**Zero and one argument both render cleanly.** The no-argument form closes the most recent open region; a truthy argument closes every open region.

**The argument is truthy-typed, not strictly boolean.** Boolean `true`, string `"true"`, and number `1` are all accepted and render without error — the parameter is widened accordingly.

{% include test-script.html bundle="ampscript-functions--endimpressionregion" chapter="behaviour" %}

Impression regions are an **email-send** feature. The distinction between ending one region and ending all of them affects impression tracking in a sent message, which cannot be observed from a CloudPage — there the call simply renders empty regardless of argument. This page proves only what a CloudPage can show.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`BeginImpressionRegion`](/engagement/ampscript/functions/beginimpressionregion/) — opens the region this closes
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-end-impression-region.html) · [ampscript.guide](https://ampscript.guide/endimpressionregion/)
