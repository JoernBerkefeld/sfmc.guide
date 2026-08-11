---
layout: page
title: "ContentAreaByName"
description: "Inserts a Classic content area by its folder path and name. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the no-match default path and that default content is emitted literally. Classic content is retired; prefer ContentBlockByName."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/contentareabyname/
platforms:
  - engagement
syntax: "ContentAreaByName(contentAreaName[, impressionRegionName, errorOnMissingContentArea, errorMessage, statusCode])"
return_type: string
min_args: 1
max_args: 5
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

{% include callout.html type="warning" title="Deprecated — use ContentBlockByName" content="`ContentAreaByName` references Classic content areas, which are no longer supported. Author new content in Content Builder and retrieve it with `ContentBlockByName`." %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `contentAreaName` | string | Yes | Folder path and name of the Classic content area to retrieve |
| `impressionRegionName` | string | No | Impression region name to associate with the content area |
| `errorOnMissingContentArea` | boolean | No | When true (the default), a missing area aborts; set to 0 to fall back to the default content |
| `errorMessage` | string | No | Default content returned when the area is missing — emitted literally |
| `statusCode` | number | No | Output variable set to 0 on success or -1 when no content was found |

## Example

```ampscript
%%[
  VAR @sc, @out
  SET @out = ContentAreaByName("nosuch\Folder\Area", "", 0, "Area unavailable", @sc)
]%%
%%=v(@out)=%%
```

Renders `Area unavailable` and sets `@sc` to `-1` — the clean no-match path when the name does not resolve.

When the name does resolve, the bare form inserts the stored content area:

```ampscript
%%=ContentAreaByName('My Folder\My Content')=%%
```

## Return value

**`string`** — the rendered HTML of the named content area, or the `errorMessage` default when the area is missing and `errorOnMissingContentArea` is 0. There is no closed set of sentinel values.

## Behaviour

**A missing name with the error flag set to 0 returns the default content.** An unresolved folder-path name with `errorOnMissingContentArea` 0 renders the default content and sets the status variable to `-1` instead of aborting the page.

**The default content is emitted literally.** A default containing an inline expression renders verbatim; the embedded AMPscript is **not** evaluated. Use [`TreatAsContent`](/engagement/ampscript/functions/treatascontent/) if the fallback string itself needs to run.

**The function is still callable at runtime.** Even though Classic content is retired, the call resolves and follows the documented default-content path rather than raising an unknown-function error.

{% include test-script.html bundle="ampscript-functions--contentareabyname" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes (Classic content, deprecated) |
| Marketing Cloud Next | No |

## See also

- [`ContentArea`](/engagement/ampscript/functions/contentarea/) — the same Classic lookup keyed by numeric ID
- [`ContentBlockByKey`](/engagement/ampscript/functions/contentblockbykey/) — the Content Builder replacement keyed by customer key
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-area-by-name.html) · [ampscript.guide](https://ampscript.guide/contentareabyname/)
