---
layout: page
title: "AMPscript RaiseError (Next)"
description: "Stop a render with AMPscript RaiseError in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email preview."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/raiseerror/
platforms:
  - next
syntax: "RaiseError(message[, skipSubscriber, apiErrorCode, apiErrorNumber, preserveDataExt])"
return_type: void
min_args: 1
max_args: 5
verification: in-progress
differs_from_docs: false
engagement: same
mcn_tested: 2026-11-23
engagement_note: "Both platforms abort when the call runs and refuse an empty call. Engagement CloudPages answer HTTP 422 with a fixed notice; the Next email preview fails with HTTP 500."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | Error message |
| `skipSubscriber` | string \| boolean \| number | No | Skip only the current subscriber and continue the job, rather than stopping it. Accepts `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |
| `apiErrorCode` | string | No | Custom API error code |
| `apiErrorNumber` | number | No | Custom API error number |
| `preserveDataExt` | string \| boolean \| number | No | Retain earlier data-extension writes; allowed values: `true`, `false`, `1`, `0`, `"true"`, `"false"`, `"1"`, `"0"` |

## Example

```ampscript
%%[
  IF 1 == 2 THEN
    RaiseError("probe")
  ENDIF
]%%
gated
```

Renders `gated`: the branch never runs, so the call does nothing. An email with a branch like this saves and publishes.

## Return value

**`void`** — nothing is returned. When the call runs, the render fails instead.

## Behaviour

**A call that runs stops the render.** An email with `RaiseError("message")` saves and publishes, but the preview fails with HTTP 500 and no message. Text before and after the call does not help: `before%%[ RaiseError("…") ]%%after` fails the same way.

**The optional arguments do not change that.** Calls with a second argument of `true`, `1` or `"true"`, and five-argument calls ending in `1`, `"true"` or `true`, each save and then fail the preview.

**A sixth argument is not caught at save.** `RaiseError("…", 1, "R2", 100, 1, 1)` saves, then fails the preview like the others.

**An empty call is rejected at save.** `RaiseError()` gives HTTP 400, "The AMPscript syntax isn't valid".

What happens during a real send (stopping the job, skipping a subscriber, error codes) was not tested in Next.

{% include test-script.html bundle="next-ampscript-functions--raiseerror" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--raiseerror" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [IIf](/next/ampscript/functions/iif/) — choose a value without stopping the render
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-utilities/mc-ampscript-reference-utilities-raise-error.html)
