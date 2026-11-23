---
layout: page
title: "Handlebars now"
description: "Handlebars now: returns the current server date and time in UTC."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/now/
platforms:
  - next
mcn: matches-docs
mcn_tested: 2026-11-22
mcn_note: "`{{now}}` renders the date and time with a `T` between them and no time zone suffix, such as `2026-11-22T11:07:35`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Returns the current server date and time in UTC. Takes no parameters.

## Syntax

```sfmc
{{now}}
```

Returns `string`.

## Parameters

Takes no parameters.

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{now}}` renders `2026-11-22T11:07:35`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--now" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

{% include mcn-status.html %}

## See also

- [AMPscript `Now`](/next/ampscript/functions/now/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-date-time-references/mcn-handlebars-reference-date-time-now.html)
