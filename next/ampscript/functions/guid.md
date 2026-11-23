---
layout: page
title: "AMPscript GUID (Next)"
description: "Generate a new globally unique identifier with AMPscript GUID in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including the format of the value."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/guid/
platforms:
  - next
syntax: "GUID()"
return_type: string
min_args: 0
verification: in-progress
differs_from_docs: true
engagement: same
mcn_tested: 2026-11-23
engagement_note: "GUID behaves the same on both: 36 characters, hyphens at 9, 14, 19 and 24, no braces, a new value per call. One comparison test showed `==` ignoring case in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

This function takes no parameters. An email that calls `GUID("x")` cannot be saved in Next: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

## Example

```ampscript
%%[ SET @token = GUID() ]%%
%%=v(@token)=%%
```

Renders a value such as `b3699a44-8716-4950-a23a-026a10263c12`.

Keep the value in a variable when you need it twice, because every call returns a new one.

## Return value

**`string`** — a 36-character identifier.

| Property | Value |
|---|---|
| Length | 36 characters |
| Groups | 8, 4, 4, 4, 12 |
| Hyphen positions | 9, 14, 19, 24 |
| Character at position 15 | `4` |
| Braces | none |

## Behaviour

**The shape is fixed.** `Length(GUID())` gives `36`. Cutting a value into its groups gives lengths `8-4-4-4-12`, the characters at positions 9, 14, 19 and 24 are all hyphens, and position 15 holds `4`.

**There are no braces.** `IndexOf` finds neither `{` nor `}` (both `0`), while the first hyphen is found at `9`.

**Each call gives a new value.** Two calls stored in two variables compare as different.

**A sample value printed in lowercase hex.** `@g == Uppercase(@g)` was true in Next because `==` ignored case in that comparison.

{% include test-script.html bundle="next-ampscript-functions--guid" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--guid" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **It works in Next although the docs say it does not.** The official availability table marks `GUID` as unsupported in Marketing Cloud Next. In a Next email every call produced a new 36-character identifier. [Card](/next/differs-from-docs/#guid-available-in-next)

{% include platform-compare.html %}

## See also

- [`GUID` in Marketing Cloud Engagement](/engagement/ampscript/functions/guid/) — how it behaves there
- [Length](/next/ampscript/functions/length/) — check the 36 characters
- [Substring](/next/ampscript/functions/substring/) — cut the value into groups
- [Lowercase](/next/ampscript/functions/lowercase/) — normalise the case
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-guid.html)
