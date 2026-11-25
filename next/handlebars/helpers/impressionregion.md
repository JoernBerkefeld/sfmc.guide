---
layout: page
title: "Handlebars impressionRegion"
description: "Handlebars impressionRegion: marks the enclosed part of a message as a named impression region for reporting on dynamic content."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/impressionregion/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-25
mcn_note: "Works with the region name as a positional argument. The documented `name=\"…\"` form is rejected when the email is saved."
test_scripts: complete
verification: in-progress
---

{% include verification-status.html %}

{% raw %}
Marks the enclosed part of a message as a named impression region for reporting on dynamic content. Adds no output of its own.

## Syntax

```sfmc
{{#impressionRegion "name"}}
  …
{{/impressionRegion}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Name of the impression region; given on the opening tag only. |

## Example

Tested in Marketing Cloud Next emails on 2026-11-25, one call per email:

- `{{#impressionRegion "Banner"}}in{{/impressionRegion}}` renders `in`.
- `{{#impressionRegion name="Banner"}}in{{/impressionRegion}}`: the email cannot be saved; Salesforce answers that the helper needs a positional argument instead of hash syntax.
{% endraw %}

Thanks to Nobuyuki Watanabe's [SFMC Tips #344](https://medium.com/@marketingcloudtips/marketing-cloud-next-impression-region-tracking-bd27e34bc541) for the positional syntax.

{% include test-script.html bundle="next-handlebars-helpers--impressionregion" chapter="behaviour" lang="handlebars" label="Show Next test script" %}
{% include test-script.html bundle="next-handlebars-helpers--impressionregion" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference passes the region name as a hash argument, `name="…"`. Marketing Cloud Next rejects that form when the email is saved and asks for a positional argument; `{{#impressionRegion "Banner"}}…{{/impressionRegion}}` works. [Details](/next/differs-from-docs/#hb-impressionregion-positional-name)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `BeginImpressionRegion`](/next/ampscript/functions/beginimpressionregion/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `EndImpressionRegion`](/next/ampscript/functions/endimpressionregion/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-impressionregion.html)
