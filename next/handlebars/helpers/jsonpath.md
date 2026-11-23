---
layout: page
title: "Handlebars jsonPath"
description: "Handlebars jsonPath: queries and filters JSON objects using a JSONPath expression."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/jsonpath/
platforms:
  - next
mcn: unsupported
mcn_tested: 2026-11-22
mcn_note: "The email cannot be saved: Salesforce reports it as an unsupported helper."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Queries and filters JSON objects using a JSONPath expression.

## Syntax

```sfmc
{{jsonPath object expression}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `object` | any | Yes | JSON object or array, or a JSON string, to search. |
| `expression` | string | Yes | The JSONPath expression to apply, beginning with $. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{jsonPath '{"a":{"b":"x"} }' "$.a.b"}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- `{{jsonPath '[1,2,3]' "$[-1]"}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
- `{{length (jsonPath '{"items":[{"price":50},{"price":150},{"price":200}]}' "$.items[?(@.price > 100)]")}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--jsonpath" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `jsonPath` as a Marketing Cloud Next helper, available since the Summer '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{jsonPath '{"a":{"b":"x"} }' "$.a.b"}}` could not be saved: the CMS answered HTTP 400 and named `jsonPath` as an unsupported handlebars helper. Documented examples of other helpers that build their input list with `jsonPath` cannot be used either. [Details](/next/differs-from-docs/#hb-jsonpath-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-jsonpath.html)
