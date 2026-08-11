---
layout: page
title: "BuildOptionList"
description: "Builds an HTML <option> list from literal value/text pairs. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including exactly which pair is marked selected and what a non-matching default does."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/buildoptionlist/
platforms:
  - engagement
syntax: "BuildOptionList(defaultSelection, option1Value, option1Text[, optionValueN, optionTextN, ...])"
return_type: string
min_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `defaultSelection` | string \| number | Yes | The option value to mark as selected |
| `option1Value` | string | Yes | The `value` attribute of the first option |
| `option1Text` | string | Yes | The display text of the first option |
| `optionValueN` | string | No | The `value` attribute of a further option |
| `optionTextN` | string | No | The display text of a further option |

Values and display texts are supplied as literal pairs; there is no upper bound on the number of pairs.

## Example

```ampscript
%%[
  VAR @options
  SET @options = BuildOptionList("2", "1", "Alpha", "2", "Beta", "3", "Gamma")
]%%
<select name="choice">%%=v(@options)=%%</select>
```

Renders three options, with the second one pre-selected because the default is `2`:

```html
<option value="1">Alpha</option>
<option value="2" selected="selected">Beta</option>
<option value="3">Gamma</option>
```

Pass the default from a data value to reflect a stored preference back to the subscriber:

```ampscript
%%[
  VAR @sizes
  SET @sizes = BuildOptionList(AttributeValue("PreferredSize"), "S", "Small", "M", "Medium", "L", "Large")
]%%
```

## Return value

**`string`** — a run of `<option>` tags, one per value/text pair, in argument order, each on its own line. The output is arbitrary HTML, so there is no closed set of sentinel values to test for.

## Behaviour

**One `<option>` per pair, in order.** Each `optionValue`/`optionText` pair becomes `<option value="…">…</option>`, emitted in the order the arguments are supplied.

**Only the matching pair is selected.** The pair whose value equals `defaultSelection` gets `selected="selected"`; every other option is left plain. In the example above only the `value="2"` option carries the attribute.

**A numeric default matches a string value of the same digits.** `BuildOptionList(2, "1", "Alpha", "2", "Beta")` marks the `value="2"` option selected — the default is compared loosely against each string value.

**A non-matching default selects nothing.** `BuildOptionList("9", "1", "Alpha", "2", "Beta")` renders both options with no `selected` attribute anywhere, rather than defaulting to the first option.

**Three arguments is the minimum.** `BuildOptionList("1", "1", "One")` — a default plus a single value/text pair — renders one selected option and returns HTTP 200.

{% include test-script.html bundle="ampscript-functions--buildoptionlist" chapter="behaviour" %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`ContentArea`](/engagement/ampscript/functions/contentarea/) · [`ContentBlockByName`](/engagement/ampscript/functions/contentblockbyname/) — other Content functions
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-build-option-list.html) · [ampscript.guide](https://ampscript.guide/buildoptionlist/)
