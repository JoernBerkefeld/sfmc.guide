---
layout: page
title: "Handlebars format"
description: "Handlebars format: formats a value with a format string and, if given, a type."
parent: Handlebars Helper Reference
parent_url: /next/handlebars/helpers/
permalink: /next/handlebars/helpers/format/
platforms:
  - next
mcn: differs-from-docs
mcn_tested: 2026-11-22
mcn_note: "`{{format 1234.567 \"N2;N0;N2\"}}` gives `1,234.57` as documented. The section for negative numbers is ignored: `{{format -1234.567 \"N2;(F2);N0\"}}` renders `-1,234.57` instead of `(1,234.57)`. Zero padding is ignored too: `{{format 123 \"000000\"}}` renders `123` instead of `000123`."
test_scripts: complete
verification: verified
---

{% include verification-status.html %}

{% raw %}
Formats a value with a format string and, if given, a type.

## Syntax

```sfmc
{{format subject formatString [type] [culture]}}
```

Returns `string`.

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `subject` | any | Yes | Input value. |
| `formatString` | string | Yes | Pattern that shapes the output. |
| `type` | string | No | Format type: date or numeric. |
| `culture` | string | No | Culture code, such as en-US. |

## Example

Tested in a Marketing Cloud Next email on 2026-11-22:

- `{{format 1234.567 "N2;N0;N2"}}` renders `1,234.57`, as documented.
- `{{format -1234.567 "N2;(F2);N0"}}` renders `-1,234.57`. The documented result is `(1,234.57)`.
- `{{format 123 "000000"}}` renders `123`. The documented result is `000123`.
{% endraw %}

{% include test-script.html bundle="next-handlebars-helpers--format" chapter="behaviour" lang="handlebars" label="Show Next test script" %}

## Differs from official docs

{% raw %}
- The reference says a format string may be split by `;` into one section each for numbers above, below and equal to zero, and its own example formats `-1234.567` with `"N2;(F2);N0"` as `(1,234.57)`. In Marketing Cloud Next (tested 2026-11-22): `{{format -1234.567 "N2;(F2);N0"}}` rendered `-1,234.57`: the first section was used and the negative section ignored. The positive case, `{{format 1234.567 "N2;N0;N2"}}`, rendered `1,234.57` as documented. [Details](/next/differs-from-docs/#hb-format-negative-section-ignored)
- The reference lists the custom format `000000` as padding `123` with leading zeros to `000123`. In Marketing Cloud Next (tested 2026-11-22): `{{format 123 "000000"}}` rendered `123`, without the leading zeros. [Details](/next/differs-from-docs/#hb-format-zero-padding-ignored)
{% endraw %}

{% include mcn-status.html %}

## See also

- [AMPscript `Format`](/next/ampscript/functions/format/) — does a similar job in AMPscript, with a different call shape
- [AMPscript `FormatDate`](/next/ampscript/functions/formatdate/) — does a similar job in AMPscript, with a different call shape
- [Official reference](https://developer.salesforce.com/docs/marketing/handlebars-for-marketing-cloud-next/references/mcn-handlebars-utility-references/mcn-handlebars-reference-utility-format.html)
