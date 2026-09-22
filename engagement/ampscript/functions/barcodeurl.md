---
layout: page
title: "BarcodeURL"
description: "Builds a URL that renders a barcode image from its inputs."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/barcodeurl/
platforms:
  - engagement
syntax: "BarcodeURL(valueToConvert, barcodeType, width, height[, checksumValue, showText, altText, rotation, transparentBG])"
return_type: string
min_args: 4
max_args: 9
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `valueToConvert` | string | Yes | The data to encode in the barcode |
| `barcodeType` | string | Yes | The symbology, e.g. `code128auto`, `code39`, `ean13` |
| `width` | number | Yes | Image width in pixels |
| `height` | number | Yes | Image height in pixels |
| `checksumValue` | string | No | Checksum value for the barcode |
| `showText` | string \| boolean \| number | No | Show the encoded value as a text band beneath the barcode. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |
| `altText` | string | No | Alternate text shown when `showText` is off |
| `rotation` | number | No | Orientation in degrees: 0, 90, 180 or 270 |
| `transparentBG` | string \| boolean \| number | No | Transparent instead of white background. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

## Example

```ampscript
<img src="%%=BarcodeURL('12345678901', 'code128auto', 150, 50)=%%">
```

The function returns a bare URL, so it is wrapped in an `<img>` tag by the caller. The four-argument form above renders `<img src="http://cl.s7.exct.net/LiveContent.aspx?qs=…">` — a LiveContent URL that serves the barcode image.

All nine arguments together select formatting options and still return a single URL:

```ampscript
%%[
  VAR @code
  SET @code = BarcodeURL("12345678901", "code128auto", 150, 50, "", 1, "MyAlt", 90, 1)
]%%
<img src="%%=v(@code)=%%">
```

## Return value

**`string`** — a LiveContent URL that renders the requested barcode image. The URL is opaque and varies per call, so there is no closed set of values to test for. The function returns the URL only, never a complete `<img>` element.

## Behaviour

**The optional arguments are accepted and change the URL.** Supplying `checksumValue`, `showText`, `altText`, `rotation` and `transparentBG` each produces a distinct URL, up to the full nine-argument form. `showText` and `transparentBG` also change the rendered image: all eight boolean-like literals are accepted, a truthy value draws the encoded value as a text band beneath the barcode (or makes the background fully transparent), and a falsy value omits the band (or leaves an opaque white background). All four truthy spellings produce the same image, as do all four falsy spellings. The `qs` token in the returned URL varies from call to call, but that is an encoding artefact — the underlying image is identical, and a token remains usable with no observed expiry.

**An empty value aborts the page.** Passing an empty string as `valueToConvert` aborts the CloudPage with HTTP 422 and discards everything rendered before it, rather than returning an empty string or a blank-barcode URL. Guard the value before calling — see [Differs from official docs](/engagement/differs-from-docs/#barcodeurl-empty-value-aborts). Note also the documented per-page limit: BarcodeURL may be called at most twice per message or landing page.

{% include test-script.html bundle="ampscript-functions--barcodeurl" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ContentArea`](/engagement/ampscript/functions/contentarea/)
- [`BuildOptionList`](/engagement/ampscript/functions/buildoptionlist/) — other Content functions
- [Differs from official docs](/engagement/differs-from-docs/#barcodeurl-empty-value-aborts) — the empty-value abort
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-barcode-url.html)
- [ampscript.guide](https://ampscript.guide/barcodeurl/)
