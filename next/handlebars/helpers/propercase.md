---
layout: page
title: "Handlebars properCase"
description: "Handlebars properCase: capitalizes the first letter of each word and lowercases the rest."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/propercase/
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
Capitalizes the first letter of each word and lowercases the rest.

## Syntax

```sfmc
{{properCase subject [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | string | Yes | String to change to proper case. |
| `culture` | string | No | Locale code (for example `tr-TR`) whose letter-case rules apply. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{properCase "hELLO wORLD"}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--propercase" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `properCase` as a Marketing Cloud Next helper, available since the Winter '26 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{properCase "hELLO wORLD"}}` could not be saved: the CMS answered HTTP 400 and named `properCase` as an unsupported handlebars helper. [Details](/next/differs-from-docs/#hb-propercase-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `ProperCase`](/next/ampscript/functions/propercase/) — the AMPscript equivalent
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-string-references/mcn-handlebars-reference-string-propercase.html)
