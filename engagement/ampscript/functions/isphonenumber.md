---
layout: page
title: "IsPhoneNumber"
description: "Checks a value against the North American Numbering Plan. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including Canadian and Caribbean numbers, which pass despite the function's reputation for being US-only."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/isphonenumber/
platforms:
  - engagement
syntax: "IsPhoneNumber(value)"
return_type: boolean
min_args: 1
max_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `value` | string \| number | Yes | Phone number to validate; strip any leading plus sign or country code first |

## Example

```html
%%[ VAR @ok SET @ok = IsPhoneNumber("425-555-0142") ]%%
%%=v(@ok)=%%
```

Renders `True`.

A number captured in international form has to lose its prefix before it will pass, since the plus sign alone is enough to fail the check:

```html
%%[
  VAR @input, @ok
  SET @input = Replace(RequestParameter("phone"), "+1", "")
  SET @ok = IsPhoneNumber(@input)
]%%
%%=IIf(@ok, "we can text you", "we need a North American number")=%%
```

## Return value

**`boolean`** — `True` for a number inside the numbering plan, `False` otherwise.

Both literals were produced in the same render, as the capitalised words `True` and `False`. They are genuine booleans: each compares equal to the corresponding boolean value.

## Behaviour

**The scope is the North American Numbering Plan, not the United States.** A Dominican Republic number and a Canadian number both return `True`; a valid United Kingdom number returns `False`. Reading the function as US-only is too narrow, and reading it as a general phone check is too wide.

**Separators are tolerated, other characters are not.** Dashes, dots, spaces and parentheses all pass. A vanity number spelling letters — `425-555-CALL` — returns `False`, so non-numeric characters are not simply ignored.

**A leading plus sign fails on its own.** `IsPhoneNumber("+14255550142")` returns `False` while the same subscriber digits without the prefix return `True`.

**Digit count is not what decides the answer.** `IsPhoneNumber("1234567890")` has ten digits and returns `False`; a seven-digit number returns `False` too.

**An unquoted number works.** `IsPhoneNumber(6585550142)` returns the same `True` as its quoted form, and the empty string returns `False`.

### Which inputs are accepted

| Call | Renders |
|---|---|
| `IsPhoneNumber("4255550142")` | `True` |
| `IsPhoneNumber("425-555-0142")` | `True` |
| `IsPhoneNumber("425.555.0185")` | `True` |
| `IsPhoneNumber("(829) 555-0142")` | `True` |
| `IsPhoneNumber("647 555 0123")` | `True` |
| `IsPhoneNumber(6585550142)` | `True` |
| `IsPhoneNumber("+14255550142")` | `False` |
| `IsPhoneNumber("425-555-CALL")` | `False` |
| `IsPhoneNumber("0161 496 0009")` | `False` |
| `IsPhoneNumber("1234567890")` | `False` |
| `IsPhoneNumber("5550142")` | `False` |
| `IsPhoneNumber("")` | `False` |

{% include test-script.html bundle="ampscript-functions--isphonenumber" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [IsEmailAddress](/engagement/ampscript/functions/isemailaddress/) — the sibling format check for email addresses
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-is-phone-number.html) · [ampscript.guide](https://ampscript.guide/isphonenumber/)
