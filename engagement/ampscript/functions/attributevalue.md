---
layout: page
title: "AttributeValue"
description: "Reads an attribute of the current message or page context by name. Runtime-proven on a live Marketing Cloud Engagement CloudPage — system attributes resolve there, the name is matched without regard to case, and an unknown name gives an empty value instead of failing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/attributevalue/
platforms:
  - engagement
syntax: "AttributeValue(attributeName)"
return_type: string
min_args: 1
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `attributeName` | string | Yes | Attribute name, matched without regard to case; an empty name aborts the page |

## Example

```html
%%[
  VAR @context
  SET @context = AttributeValue("_messagecontext")
]%%
Rendered in: %%=v(@context)=%%
```

On a CloudPage this renders `LANDINGPAGE`.

An unknown name is safe to call — it renders nothing rather than failing:

```html
%%[
  VAR @maybe
  SET @maybe = AttributeValue("no_such_attribute")
  IF Empty(@maybe) THEN
    SET @maybe = "not available"
  ENDIF
]%%
```

## Return value

**`string`** — the attribute value, or an empty value when the name resolves to nothing.

The value domain is open, so there is no set of tokens to test against. The empty result is a real empty string, not a swallowed failure: `Empty()` on the same call answers true, and nesting the call inside a `Concat` renders the two surrounding characters with nothing between them.

## Behaviour

**System attributes resolve on a CloudPage.** Even with no subscriber involved, `_messagecontext` rendered `LANDINGPAGE`, `memberid` rendered the business unit MID and `jobid` rendered `0`, all at HTTP 200.

**Subscriber attributes do not.** `emailaddr` and `_subscriberkey` rendered empty on a CloudPage. That is a statement about the context, not a defect — in a send those names carry values.

**The name is matched without regard to case.** `_messagecontext` and `_MessageContext` rendered the identical value.

**An unknown name is an empty value, not a failure.** An invented name rendered nothing between its delimiters and the page still returned HTTP 200.

**A numeric argument is accepted** and answers empty without failing. This is not a widening of the parameter type — a number is not an alternative form of an attribute name, it simply never matches one.

**An empty name is not survivable.** `AttributeValue("")` aborts its block with HTTP 422 while sibling blocks on the same page render normally. Guard the name before calling if it comes from a variable.

**Exactly one argument.** Zero-argument and two-argument calls each abort their own block while the rest of the page keeps rendering.

{% include test-script.html bundle="ampscript-functions--attributevalue" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="Every marker and label in the test script goes through <code>Concat(...)</code>, including single-argument ones. A bare string literal passed to <code>OutputLine</code> renders an empty line while the page still returns HTTP 200, so the marker silently vanishes." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Differs from docs: what resolves on a CloudPage](/engagement/differs-from-docs/#attributevalue-cloudpage-and-empty-name)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-attribute-value.html) · [ampscript.guide](https://ampscript.guide/attributevalue/)
