---
layout: page
title: "Handlebars impressionRegion"
description: "Handlebars impressionRegion: marks the enclosed part of a message as a named impression region for reporting on dynamic content."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/impressionregion/
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
Marks the enclosed part of a message as a named impression region for reporting on dynamic content. Adds no output of its own.

## Syntax

```sfmc
{{#impressionRegion name}}
  …
{{/impressionRegion}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Name of the impression region; given on the opening tag only. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{#impressionRegion name="Banner"}}in{{/impressionRegion}}`: the email cannot be saved; Salesforce reports it as an unsupported helper.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--impressionregion" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

{% raw %}
- The reference documents `impressionRegion` as a Marketing Cloud Next helper, available since the Winter '27 release, with parameters and examples. In Marketing Cloud Next (tested 2026-11-22): an email containing `{{#impressionRegion name="Banner"}}in{{/impressionRegion}}` could not be saved: the CMS answered HTTP 400 and named `impressionRegion` as an unsupported handlebars helper. [Details](/next/differs-from-docs/#hb-impressionregion-rejected-on-save)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `BeginImpressionRegion`](/next/ampscript/functions/beginimpressionregion/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `EndImpressionRegion`](/next/ampscript/functions/endimpressionregion/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-content-references/mcn-handlebars-reference-content-impressionregion.html)
