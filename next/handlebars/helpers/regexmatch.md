---
layout: page
title: "Handlebars regExMatch"
description: "Handlebars regExMatch: applies a regular expression (Java regex syntax) to a string and returns the matched text or one capture group."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/regexmatch/
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
Applies a regular expression (Java regex syntax) to a string and returns the matched text or one capture group. Returns an empty string when nothing matches.

## Syntax

```sfmc
{{regExMatch subject pattern group [...options]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to search. |
| `pattern` | string | Yes | The regular expression to apply. |
| `group` | string | Yes | Name or number of the capture group to return; "0" is the whole match. |
| `options` | any | No, repeatable | Named boolean flags: explicitCapture, ignoreCase, ignorePatternWhitespace, multiline. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{regExMatch "abc123" "[0-9]+" "0"}}` renders `123`, as documented.
- `{{regExMatch "save10" "^[A-Z0-9]{5,7}$" "0" ignoreCase=true}}` renders `save10`, as documented.
- `{{regExMatch "abc" "[0-9]+" "0"}}` renders an empty string, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--regexmatch" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `RegExMatch`](/next/ampscript/functions/regexmatch/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-regexmatch.html)
