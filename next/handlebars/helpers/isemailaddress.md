---
layout: page
title: "Handlebars isEmailAddress"
description: "Handlebars isEmailAddress: checks whether a value has the shape of an email address."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/isemailaddress/
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
Checks whether a value has the shape of an email address. It does not check that the mailbox or domain exists.

## Syntax

```sfmc
{{isEmailAddress emailAddress}}
```

Returns `boolean`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `emailAddress` | string | Yes | The email address to check. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{isEmailAddress "ana.lopez@example.com"}}` renders `true`, as documented.
- `{{isEmailAddress "ana.lopez@example"}}` renders `true`, as documented.
- `{{isEmailAddress "ana@lopez@example.com"}}` renders `false`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--isemailaddress" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `IsEmailAddress`](/next/ampscript/functions/isemailaddress/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-isemailaddress.html)
