---
layout: page
title: "Handlebars length"
description: "Handlebars length: counts the characters in a string or the items in an array."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/length/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-26
mcn_note: "Every tested call rendered the documented result."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Counts the characters in a string or the items in an array.

## Syntax

```sfmc
{{length subject}}
```

Returns `integer`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | any | Yes | String or array to measure. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{length "hello"}}` renders `5`, as documented.
- `{{length "a b"}}` renders `3`, as documented.
- On 2026-11-26, `{{length (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm")}}` counted the rows of a related DMO list of the data graph bound to the email (`2` for a recipient with two linked source records, Email Builder preview).
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--length" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Length`](/next/ampscript/functions/length/) — the AMPscript equivalent
- [AMPscript `RowCount`](/next/ampscript/functions/rowcount/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-length.html)
