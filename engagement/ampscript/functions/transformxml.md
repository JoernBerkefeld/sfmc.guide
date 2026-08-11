---
layout: page
title: "TransformXML"
description: "Transforms an XML document using an XSLT stylesheet. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the argument order and the way any bad input takes the whole page down."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/transformxml/
platforms:
  - engagement
syntax: "TransformXML(xmlDocument, xslDocument)"
return_type: string
min_args: 2
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
| `xmlDocument` | string | Yes | The XML content to transform |
| `xslDocument` | string | Yes | The XSLT stylesheet applied to the XML |

## Example

```ampscript
%%[
  VAR @xml, @xsl
  SET @xml = "<greeting><who>World</who></greeting>"
  SET @xsl = "<?xml version=\"1.0\"?><xsl:stylesheet xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" version=\"1.0\"><xsl:output method=\"text\"/><xsl:template match=\"/greeting\">Hi [<xsl:value-of select=\"who\"/>]</xsl:template></xsl:stylesheet>"
]%%
%%=TransformXML(@xml, @xsl)=%%
```

Renders `Hi [World]`.

To emit HTML that itself contains AMPscript, wrap the result in [`TreatAsContent`](/engagement/ampscript/functions/) so the transformed markup is evaluated rather than printed literally:

```ampscript
%%=TreatAsContent(TransformXML(@xml, @xsl))=%%
```

## Return value

**`string`** — the text or markup produced by applying the stylesheet to the XML. The value is whatever the transform yields, so there is no closed set of return values to test for.

## Behaviour

**The XML comes first, the stylesheet second.** `TransformXML(@xml, @xsl)` transforms and returns the result; swapping the two arguments so the stylesheet is passed first aborts the page, because a stylesheet is not valid input to the XML slot.

**Any bad input takes the whole page down.** AMPscript has no error handling for this function, so malformed XML, a stylesheet that is not well-formed XML, and an empty stylesheet each abort the CloudPage with HTTP 422 and discard everything rendered before the call — rather than returning an empty string or an error message. Validate both documents before calling, and keep the call late in the page so a failure loses as little rendered output as possible.

{% include test-script.html bundle="ampscript-functions--transformxml" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="When re-running the test script, keep the `Concat(...)` around every marker and value. `OutputLine(\"literal\")` renders an empty line, so a bare literal marker silently vanishes and the block looks like it failed." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

The official reference notes the function was designed for XML and XSL stored as Classic Content, and that supplying the stylesheet from a Content Builder block can throw. Passing literal strings — or Base64-decoded content blocks — works.

## See also

- [`BarcodeURL`](/engagement/ampscript/functions/barcodeurl/) · [`BuildOptionList`](/engagement/ampscript/functions/buildoptionlist/) — other Content functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-transform-xml.html) · [ampscript.guide](https://ampscript.guide/transformxml/)
