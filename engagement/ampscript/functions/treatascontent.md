---
layout: page
title: "TreatAsContent"
description: "Evaluates a string as AMPscript content, rendering any embedded AMPscript expressions, and returns the rendered string. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that embedded AMPscript is executed rather than escaped."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/treatascontent/
platforms:
  - engagement
syntax: "TreatAsContent(stringToReturn)"
return_type: string
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
| `stringToReturn` | string | Yes | String whose embedded AMPscript is evaluated |

## Example

```ampscript
%%[
  VAR @out
  SET @out = TreatAsContent("pre-%%=Add(2,3)=%%-post")
]%%
Result: %%=v(@out)=%%
```

Renders `Result: pre-5-post`.

A common use is to evaluate content that was assembled or fetched at runtime — a data extension field, a looked-up block — so that any AMPscript it carries runs instead of being shown literally:

```ampscript
%%[
  VAR @body
  SET @body = Field(@row, "Content")
]%%
%%=TreatAsContent(@body)=%%
```

## Return value

**`string`** — the input with its embedded AMPscript evaluated and substituted in place.

There is no closed set of sentinel values: the result is whatever the rendered string happens to be.

## Behaviour

**Embedded AMPscript is executed, not escaped.** `TreatAsContent("pre-%%=Add(2,3)=%%-post")` renders `pre-5-post` — the inline expression runs and its result replaces it, while the surrounding literal text is preserved unchanged.

**Plain text passes through unchanged.** A string carrying no AMPscript, such as `just plain text`, is returned exactly as given.

**The empty string is valid and returns empty.** `TreatAsContent("")` renders the empty string with length zero, rather than aborting or returning a placeholder.

**The value is returned inline.** The result can be assigned to a variable and reused, not only written straight to the page.

{% include test-script.html bundle="ampscript-functions--treatascontent" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

Because the embedded content is executed, never pass unreviewed input straight into `TreatAsContent`: a value spliced into the string is evaluated as AMPscript. Sanitise or allow-list any user-supplied content first.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`TreatAsContentArea`](/engagement/ampscript/functions/treatascontentarea/) — stores a content string under a key and renders it
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-content/mc-ampscript-reference-content-treat-as-content.html) · [ampscript.guide](https://ampscript.guide/treatascontent/)
