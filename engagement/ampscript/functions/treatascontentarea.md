---
layout: page
title: "TreatAsContentArea"
description: "Stores a content string under a key for the duration of a send and renders it, evaluating any embedded AMPscript. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that it renders the inline second argument rather than looking the key up."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/treatascontentarea/
platforms:
  - engagement
syntax: "TreatAsContentArea(contentKey, contentValue[, impressionRegion])"
return_type: string
min_args: 2
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `contentKey` | string | Yes | Key the content is stored under for the send |
| `contentValue` | string | Yes | Content to store and render; embedded AMPscript is evaluated |
| `impressionRegion` | string | No | Name of an impression region to wrap the content in |

## Example

```ampscript
%%[
  VAR @out
  SET @out = TreatAsContentArea("k1", "inline-%%=Add(4,5)=%%-end")
]%%
Result: %%=v(@out)=%%
```

Renders `Result: inline-9-end`.

A realistic use stores content pulled from a data extension so it can be reused across a send, evaluating any AMPscript it contains:

```ampscript
%%=TreatAsContentArea("VirtualCA1", Lookup("DEName", "Content", "Key", @key))=%%
```

## Return value

**`string`** — the stored content with its embedded AMPscript evaluated.

There is no closed set of sentinel values: the result is whatever the rendered content happens to be.

## Behaviour

**It renders the inline second argument, not a stored lookup.** `TreatAsContentArea("k1", "inline-%%=Add(4,5)=%%-end")` renders `inline-9-end` — the content string supplied as the second argument is what appears, and the embedded `Add(4,5)` is evaluated to `9`. The first argument is the storage key, not something the function looks up and returns.

**A fresh key is not a failure path.** Calling with a never-before-seen key and empty content renders the empty string with no error — the call stores by key rather than failing on a missing lookup.

**Plain content passes through unchanged.** Content carrying no AMPscript is returned exactly as given.

**The third argument names an impression region.** The three-argument form is accepted and renders its inline content the same way; `TreatAsContentArea("k3", "three-%%=Add(6,7)=%%-end", "RegionX")` renders `three-13-end`.

{% include test-script.html bundle="ampscript-functions--treatascontentarea" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

The content store is scoped to a send and caps at 300 unique variations; beyond that, later variations render as the first. Those send-time semantics cannot be exercised from a CloudPage, where each request renders once. Because embedded content is executed, sanitise any user-supplied value before passing it in.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`TreatAsContent`](/engagement/ampscript/functions/treatascontent/) — evaluates a string as content without the send-scoped key store
- [`BeginImpressionRegion`](/engagement/ampscript/functions/beginimpressionregion/) — the impression region the third argument names
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-treat-as-content-area.html) · [ampscript.guide](https://ampscript.guide/treatascontentarea/)
