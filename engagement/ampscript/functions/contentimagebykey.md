---
layout: page
title: "ContentImageByKey"
description: "Returns an HTML img tag for a Content Builder image asset by its customer key. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fallback-image path and that a missing image with no fallback aborts the page."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/contentimagebykey/
platforms:
  - engagement
syntax: "ContentImageByKey(imageExternalKey[, defaultImageExternalKey])"
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
| `imageExternalKey` | string | Yes | Customer key of the Content Builder image asset to return |
| `defaultImageExternalKey` | string | No | Customer key of a fallback image asset, rendered when the primary key is not found |

## Example

```ampscript
%%=ContentImageByKey('my-image-key')=%%
```

Swap `my-image-key` for the customer key of an image asset that exists on your account. It renders an HTML `img` tag for that asset — in this run the tag carried `title`, `alt`, `border="0"` and the proprietary `thid` attribute, with the asset's stored `src` URL.

A defensive form supplies a fallback image that renders when the primary key is missing:

```ampscript
%%=ContentImageByKey('nosuch-key', 'company-logo.png')=%%
```

The primary key does not exist, so the tag for the fallback asset (again, use a key that exists on your account) is rendered instead.

## Return value

**`string`** — an HTML `img` tag for the referenced image, with `title`, `alt`, `border` and `thid` attributes set. There is no closed set of sentinel values.

## Behaviour

**A single customer key renders the image as an `img` tag.** The output is full HTML markup, not a bare URL — the `title` and `alt` attributes carry the asset name, `border` is always `0`, and `thid` holds the Content Builder image ID. The key form is the most portable because it travels with the asset across business units.

**The second argument is a fallback image, not alt text.** When the primary key is missing but a valid fallback key is supplied, the fallback image's tag is rendered.

**A missing image with no fallback aborts the page.** Unlike the `ContentBlock` family, there is no default-content or empty-string mechanism — a missing key with a single argument aborts rendering (HTTP 422 on a CloudPage). Always supply a fallback when the key may not resolve.

{% include test-script.html bundle="ampscript-functions--contentimagebykey" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ContentImageByID`](/engagement/ampscript/functions/contentimagebyid/) — return the same image by its numeric ID
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-image-by-key.html) · [ampscript.guide](https://ampscript.guide/contentimagebykey/)
