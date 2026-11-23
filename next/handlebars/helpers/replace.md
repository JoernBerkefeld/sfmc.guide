---
layout: page
title: "Handlebars replace"
description: "Handlebars replace: replaces every occurrence of a substring with another (case-sensitive)."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/replace/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "`{{replace \"a-b-c\" \"-\" \"+\"}}` gives `a+b+c`. The search ignores case, although the documentation says it is case-sensitive: `{{replace \"Aa\" \"a\" \"x\"}}` renders `xx` instead of `Ax`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Replaces every occurrence of a substring with another (case-sensitive).

## Syntax

```sfmc
{{replace subject search replacement [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String in which to replace text. |
| `search` | string | Yes | The substring to search for. |
| `replacement` | string | Yes | The replacement substring. |
| `culture` | string | No | BCP 47 locale code for culture-specific comparison. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{replace "a-b-c" "-" "+"}}` renders `a+b+c`, as documented.
- `{{replace "Aa" "a" "x"}}` renders `xx`. The documented result is `Ax`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--replace" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference says the search string is matched case-sensitively. In Marketing Cloud Next (tested 2026-11-22): `{{replace "Aa" "a" "x"}}` rendered `xx`: the uppercase `A` was replaced too. A case-sensitive match would give `Ax`. [Details](/next/differs-from-docs/#hb-replace-ignores-case)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Replace`](/next/ampscript/functions/replace/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-replace.html)
