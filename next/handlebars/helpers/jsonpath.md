---
layout: page
title: "Handlebars jsonpath"
description: "Handlebars jsonpath: queries and filters JSON objects using a JSONPath expression."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/jsonpath/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-25
mcn_note: "Write the name in lowercase, as the docs do: `jsonpath`. The camelCase spelling `jsonPath` is rejected when the email is saved."
verification: verified
test_scripts: complete
---

{% include verification-status.html %}

{% raw %}
Queries and filters JSON objects using a JSONPath expression.

## Syntax

```sfmc
{{jsonpath object expression}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `object` | any | Yes | JSON object or array, or a JSON string, to search. |
| `expression` | string | Yes | The JSONPath expression to apply, beginning with $. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{jsonpath (buildRowSetFromString "a|b|c" "|") "$[1]"}}` renders `b`, as documented (zero-based index).
- Helper names are case-sensitive. `{{jsonPath …}}` (camelCase) is rejected when the email is saved as an unsupported helper; only the documented spelling `jsonpath` works.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--jsonpath" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--jsonpath" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

{% include mcn-status.html %}

## See also

- [AMPscript `BuildRowsetFromJSON`](/next/ampscript/functions/buildrowsetfromjson/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-jsonpath.html)
