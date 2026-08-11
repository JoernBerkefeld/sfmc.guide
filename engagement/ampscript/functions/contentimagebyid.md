---
layout: page
title: "ContentImageByID"
description: "Returns an HTML img tag for a Content Builder image asset by its numeric ID. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fallback-image path and that a missing image with no fallback aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/contentimagebyid/
platforms:
  - engagement
syntax: "ContentImageByID(id[, defaultImageExternalId])"
return_type: string
min_args: 1
max_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | number \| string | Yes | Numeric ID of the Content Builder image asset to return |
| `defaultImageExternalId` | number \| string | No | ID of a fallback image asset, rendered when the primary ID is not found |

## Example

```ampscript
%%=ContentImageByID(1133955)=%%
```

Renders an HTML `img` tag for that asset — in this run the tag carried `title`, `alt`, `border="0"` and the proprietary `thid="1133955"` attribute, with the asset's stored `src` URL.

A defensive form supplies a fallback image that renders when the primary ID is missing:

```ampscript
%%=ContentImageByID(9999999, 1201143)=%%
```

The primary ID does not exist, so the tag for the fallback asset (`thid="1201143"`) is rendered instead.

## Return value

**`string`** — an HTML `img` tag for the referenced image, with `title`, `alt`, `border` and `thid` attributes set. There is no closed set of sentinel values.

## Behaviour

**A single ID renders the image as an `img` tag.** The output is full HTML markup, not a bare URL — the `title` and `alt` attributes carry the asset name, `border` is always `0`, and `thid` holds the Content Builder image ID.

**The second argument is a fallback image, not alt text.** When the primary ID is missing but a valid fallback ID is supplied, the fallback image's tag is rendered.

**A missing image with no fallback aborts the page.** Unlike the `ContentBlock` family, there is no default-content or empty-string mechanism — a missing ID with a single argument aborts rendering (HTTP 422 on a CloudPage). Always supply a fallback when the ID may not resolve.

{% include test-script.html bundle="ampscript-functions--contentimagebyid" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ContentImageByKey`](/engagement/ampscript/functions/contentimagebykey/) — return the same image by its customer key
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-image-by-id.html) · [ampscript.guide](https://ampscript.guide/contentimagebyid/)
