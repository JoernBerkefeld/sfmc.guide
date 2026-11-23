---
layout: page
title: "AMPscript BeginImpressionRegion (Next)"
description: "Open an impression tracking region with AMPscript BeginImpressionRegion in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the variable region name that Next accepts."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/beginimpressionregion/
platforms:
  - next
syntax: "BeginImpressionRegion(regionName)"
return_type: string
min_args: 1
max_args: 1
verification: in-progress
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Content wrapped in a region renders unchanged on both platforms (`X` stays `X`). Engagement aborts the page when the region name is a variable (`BeginImpressionRegion(@name)`); Next renders the content as if the name were a literal."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `regionName` | string | Yes | Name of the impression region to open, as a literal or a variable |

## Example

```ampscript
%%[ BeginImpressionRegion("promo") ]%%X%%[ EndImpressionRegion() ]%%
```

Renders `X`. The two calls add nothing to the email.

## Return value

**`string`** — an empty string. The call leaves no visible trace in the rendered email.

## Behaviour

**It emits nothing.** Content between `BeginImpressionRegion("ProbeRegion")` and `EndImpressionRegion()` renders exactly as written, with no marker or comment added.

**A variable works as the region name.** `SET @name = "dyn-region"` followed by `BeginImpressionRegion(@name)` renders the content after it normally; the email does not fail.

**Impression tracking itself was not tested in Next.** Whether opens and clicks are recorded against the region only shows in send reports, which a preview email does not produce.

{% include test-script.html bundle="next-ampscript-functions--beginimpressionregion" chapter="behaviour" lang="ampscript" label="Show Next test script" %}

## Differs from official docs

- **Documented as unavailable in Next, yet accepted.** The reference's availability table says No for Marketing Cloud Next. In a Next email the call saved and rendered: the content around it came out as `X`, with a literal or a variable region name. Tracking itself was not tested. [Card](/next/differs-from-docs/#beginimpressionregion-available-in-next)

{% include platform-compare.html %}

## See also

- [`BeginImpressionRegion` in Marketing Cloud Engagement](/engagement/ampscript/functions/beginimpressionregion/) — how it behaves there
- [`EndImpressionRegion`](/next/ampscript/functions/endimpressionregion/) — closes the region this opens
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-begin-impression-region.html)
