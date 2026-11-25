---
layout: page
title: "Handlebars lookup"
description: "Handlebars lookup: dynamically accesses an object property or array element by a variable key."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/lookup/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-25
mcn_note: "`{{lookup (hash k=\"v\") \"k\"}}` gives `v`, and looking up a list index works. A key that does not exist renders the whole object, `{k=v}`, instead of the documented empty string."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Dynamically accesses an object property or array element by a variable key.

## Syntax

```sfmc
{{lookup object key}}
```

Returns `any`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `object` | any | Yes | Object or array to read from. |
| `key` | any | Yes | Property name or array index to read. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-22 and 2026-11-25:

- `{{lookup (hash k="v") "k"}}` renders `v`, as documented.
- `{{lookup (hash k="v") "missing"}}` renders `{k=v}`. The documented result is an empty string.
- With a list of two rows built in AMPscript (`%%[ SET @rows = BuildRowsetFromJSON('[{"name":"Bob","age":27},{"name":"Ann","age":21}]', '$[*]', 1) ]%%`), `{{lookup (lookup rows 0) "name"}}` renders `Bob`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--lookup" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference says that a key which does not exist gives `undefined`, which renders as an empty string. In Marketing Cloud Next (tested 2026-11-22): `{{lookup (hash k="v") "missing"}}` rendered `{k=v}`, the whole object, instead of an empty string. An existing key, `{{lookup (hash k="v") "k"}}`, rendered `v`. [Details](/next/differs-from-docs/#hb-lookup-missing-key-renders-object)
{% endraw %}

{% include mcn-status.html %}

## See also

- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-objects-references/mcn-handlebars-reference-objects-lookup.html)
