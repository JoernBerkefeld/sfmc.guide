---
layout: page
title: "Handlebars buildRowSetFromXml"
description: "Handlebars buildRowSetFromXml: builds a rowset from the XML nodes an XPath expression selects; each row carries the node value, its XML, and its attributes."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/buildrowsetfromxml/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "Every tested call rendered the documented result."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Builds a rowset from the XML nodes an XPath expression selects; each row carries the node value, its XML, and its attributes.

## Syntax

```sfmc
{{buildRowSetFromXml xml xpath ...options}}
```

Returns `array`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `xml` | string | Yes | The XML to read. |
| `xpath` | string | Yes | XPath expression picking the nodes. |
| `options` | any | Yes, repeatable | Required named argument returnEmptyOnError: true yields an empty rowset when parsing or the XPath fails, false raises an error. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{length (buildRowSetFromXml "<r><i>1</i><i>2</i></r>" "/r/i" returnEmptyOnError=true)}}` renders `2`, as documented.
- `{{length (buildRowSetFromXml "not xml" "/r" returnEmptyOnError=true)}}` renders `0`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--buildrowsetfromxml" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `BuildRowSetFromXML`](/next/ampscript/functions/buildrowsetfromxml/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-buildrowsetfromxml.html)
