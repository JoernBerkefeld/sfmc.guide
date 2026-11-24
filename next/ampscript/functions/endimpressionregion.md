---
layout: page
title: "AMPscript EndImpressionRegion (Next)"
description: "Close an impression tracking region with AMPscript EndImpressionRegion in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the boolean, string and number forms of the optional argument."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/endimpressionregion/
platforms:
  - next
syntax: "EndImpressionRegion([endAllRegions])"
return_type: string
min_args: 0
max_args: 1
verification: in-progress
differs_from_docs: true
engagement: same
mcn_tested: 2026-11-23
engagement_note: "Every form tested renders the same on both platforms: the call adds nothing, with no argument or with `0`, `1`, `true` or `\"true\"`."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `endAllRegions` | string \| boolean \| number | No | A truthy value ends every open region; the default ends only the most recent |

## Example

```ampscript
%%[ BeginImpressionRegion("nav-region") ]%%A%%[ EndImpressionRegion(0) ]%%B
```

Renders `AB`. Neither call adds anything to the email.

## Return value

**`string`** — an empty string. The call leaves no visible trace in the rendered email.

## Behaviour

**It emits nothing.** `BeginImpressionRegion("ProbeRegion")`, then `Y`, then `EndImpressionRegion(1)` renders `Y`. Text on either side of the call ends up adjacent.

**It works without an open region.** `EndImpressionRegion()` on its own, followed by `Z`, renders `Z`.

**The argument accepts several spellings.** The number `0` and `1`, the boolean `true` and the string `"true"` all render cleanly: `A%%[ EndImpressionRegion(true) ]%%B` and `A%%[ EndImpressionRegion("true") ]%%B` both give `AB`.

**Which regions get closed was not tested in Next.** The difference between ending one region and ending all of them only shows in impression tracking, which a preview email does not produce.

{% include test-script.html bundle="next-ampscript-functions--endimpressionregion" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **Documented as unavailable in Next, yet accepted.** The reference's availability table says No for Marketing Cloud Next. In a Next email every form tested (no argument, `0`, `1`, `true`, `"true"`) saved and rendered, adding nothing to the output. Which regions get closed was not tested. [Card](/next/differs-from-docs/#endimpressionregion-available-in-next)

{% include platform-compare.html %}

## See also

- [`BeginImpressionRegion`](/next/ampscript/functions/beginimpressionregion/) — opens the region this closes
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-end-impression-region.html)
