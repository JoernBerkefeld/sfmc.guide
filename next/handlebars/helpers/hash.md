---
layout: page
title: "Handlebars hash"
description: "Handlebars hash: builds an object from key=value pairs."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/hash/
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
Builds an object from key=value pairs. Used only as a subexpression within other helpers.

## Syntax

```sfmc
(hash ...pairs)
```

Returns `object`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `pairs` | any | Yes, repeatable | Key-value pairs, e.g. name="Alice" age=30. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{get (hash name="Alice" age=30) "name"}}` renders `Alice`, as documented.
- `{{hash name="Alice" age=30}}` renders `{name=Alice, age=30}`, as documented.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--hash" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-data-references/mcn-handlebars-reference-data-hash.html)
