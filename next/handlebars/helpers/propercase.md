---
layout: page
title: "Handlebars propercase"
description: "Handlebars propercase: capitalizes the first letter of each word and lowercases the rest."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/propercase/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-25
mcn_note: "`{{propercase \"hELLO wORLD\"}}` renders `HelloWorld`: the words are capitalized, but the space between them is dropped. Write the name in lowercase; `properCase` is rejected at save."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Capitalizes the first letter of each word and lowercases the rest.

## Syntax

```sfmc
{{propercase subject [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to change to proper case. |
| `culture` | string | No | Locale code (for example `tr-TR`) whose letter-case rules apply. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-25, alone in the email:

- `{{propercase "hELLO wORLD"}}` renders `HelloWorld`. The documented result is `Hello World`: the space between the words is lost.
- Helper names are case-sensitive. `{{properCase …}}` (camelCase) is rejected when the email is saved as an unsupported helper; only the documented spelling `propercase` works.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--propercase" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--propercase" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference says the helper capitalizes the first letter of each word and lowercases the rest; it does not mention removing spaces. In Marketing Cloud Next (tested 2026-11-25): `{{propercase "hELLO wORLD"}}` rendered `HelloWorld`, with the space between the words dropped. [Details](/next/differs-from-docs/#hb-propercase-drops-spaces)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `ProperCase`](/next/ampscript/functions/propercase/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-propercase.html)
