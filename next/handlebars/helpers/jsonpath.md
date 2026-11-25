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
mcn_tested: 2026-11-25
mcn_note: "The email cannot be saved, even with `jsonPath` as the only helper in it: Salesforce reports it as an unsupported helper."
verification: in-progress
test_scripts: complete
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

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{jsonPath '{"a":{"b":"x"}}' "$.a.b"}}`: the email cannot be saved; Salesforce answers with `unauthorized_helper` and asks to remove the unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--jsonpath" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `jsonPath` as a Marketing Cloud Next helper, available since the Summer '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-25, `jsonPath` alone in the email): `{{jsonPath '{"a":{"b":"x"}}' "$.a.b"}}` could not be saved; the CMS rejected it as an unsupported helper. Documented examples of other helpers that build their input list with `jsonPath` cannot be used either. [Details](/next/differs-from-docs/#hb-jsonpath-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-jsonpath.html)
