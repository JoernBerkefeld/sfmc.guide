---
layout: page
title: "Handlebars guid"
description: "Handlebars guid: creates a new globally unique identifier (GUID)."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/guid/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "`{{guid}}` renders a new lowercase GUID with hyphens, such as `2e91d93e-b0c6-4e35-90f7-aeec80323606`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Creates a new globally unique identifier (GUID). Takes no parameters; any that are passed are ignored.

## Syntax

```sfmc
{{guid}}
```

Returns `string`.

## Parameters

Takes no parameters.

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{guid}}` renders `2e91d93e-b0c6-4e35-90f7-aeec80323606`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--guid" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `GUID`](/next/ampscript/functions/guid/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-guid.html)
