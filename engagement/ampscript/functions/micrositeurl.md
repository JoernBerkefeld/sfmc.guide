---
layout: page
title: "MicrositeURL"
description: "Builds a Classic Content microsite URL. Runtime-proven on a live Marketing Cloud Engagement CloudPage — the page reference and any extra name-value pairs are folded into one encrypted token, and every call produces a different token."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/micrositeurl/
platforms:
  - engagement
syntax: "MicrositeURL(pageId[, paramName1, paramValue1, paramNameN, paramValueN, ...])"
return_type: string
min_args: 1
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `pageId` | string \| number | Yes | Microsite page ID |
| `paramName1` | string | No | Query parameter name |
| `paramValue1` | string | No | Query parameter value |
| `paramNameN` | string | No | Additional query parameter name |
| `paramValueN` | string | No | Additional query parameter value |

Name and value are supplied as a pair, and the pairs repeat for as long as you need them.

## Example

```html
%%[
  VAR @link
  SET @link = MicrositeURL(1467160, "offer", "spring")
]%%
<a href="%%=v(@link)=%%">Open the page</a>
```

The rendered `href` is a microsite host followed by a single query parameter carrying one long opaque token. Neither `offer` nor `spring` appears anywhere in it — the pair is inside the token. Render the same block twice and the two tokens differ, so never compare the result against a stored copy.

## Return value

**`string`** — a microsite page URL carrying exactly one encrypted token.

The value domain is open, so there is no set of sentinel values to test for. What is fixed is the shape: one host, one path, one query parameter, one token. Everything you passed — the page reference and every extra pair — lives inside that token.

## Behaviour

**Extra name-value pairs are encrypted, not appended.** Adding a single pair lengthened the result by thirteen characters against the same call without it, while neither the name nor the value could be found anywhere in the string. There is still exactly one query parameter afterwards. Do not expect to read your own parameters back out of the URL.

**Every call returns a different URL.** Two calls with identical arguments in one render produced two different tokens of the same length. The result must never be compared, deduplicated or cached as an identity.

**An ID that does not exist is accepted.** A nine-digit ID matching no asset produced a well-formed URL of the same shape. The function builds the link without checking that the referenced page exists, so a typo in the ID fails only when someone opens the link.

**The ID may be a number or a quoted string.** Both spellings of the same ID, and the ID passed through a variable, all produced valid URLs. Our own catalog previously typed it as a number only.

**Exactly one required argument.** A zero-argument call aborts the request with HTTP 422, as does a call supplying a name without its value. The maximum is open, as the pairs repeat.

The same calls were re-run on a parent business unit and behaved identically, so none of the above is an artefact of a child account.

{% include test-script.html bundle="ampscript-functions--micrositeurl" chapter="behaviour" %}

One thing the harness cannot reach: what the token resolves to on the target page. That needs a real send with a real subscriber, so the personalisation the official reference describes is untested here — only the token's existence, its per-call variation and its absorption of extra pairs were proven.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [CloudPagesURL](/engagement/ampscript/functions/cloudpagesurl/) — the CloudPages counterpart, which aborts the request on an ID that matches no page
- [v](/engagement/ampscript/functions/v/) — outputs the built URL inline
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-microsite-url.html) · [ampscript.guide](https://ampscript.guide/micrositeurl/)
