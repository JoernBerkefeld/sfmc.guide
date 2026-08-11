---
layout: page
title: "GetSocialPublishURL"
description: "Returns HTML for sharing a content region on a supported social network via Social Forward. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that it yields a bare Publish.aspx URL and aborts the page on an empty content region."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/getsocialpublishurl/
platforms:
  - engagement
syntax: "GetSocialPublishURL(socialNetworkCode, contentRegion[, socialNetworkParamKey1, socialNetworkParamValue1, ...])"
return_type: string
min_args: 2
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `socialNetworkCode` | string \| number | Yes | Number code of the target social network |
| `contentRegion` | string | Yes | Name of the predefined content region to share |
| `socialNetworkParamKey1` | string | No | Key of a parameter passed to the social network |
| `socialNetworkParamValue1` | string | No | Value paired with the preceding key |

Further key/value pairs can be appended, so there is no upper bound on the argument count.

## Example

```ampscript
%%[
  VAR @share
  SET @share = GetSocialPublishURL(1, "Shared content region 1")
]%%
%%=v(@share)=%%
```

Renders a bare Social Forward link such as `http://pages.S7.exacttarget.com/Publish.aspx?qs=ABB7InYiOjEsImQiOjQ5NjR9...` — a plain URL with no anchor tag around it.

Because the return is only the URL, wrap it in your own anchor and append tracking parameters as extra key/value pairs:

```ampscript
%%[
  VAR @share
  SET @share = GetSocialPublishURL(1, "Shared content region 1", "utm_source", "amp")
]%%
<a href="%%=v(@share)=%%">Share on Facebook</a>
```

## Return value

**`string`** — a Social Forward publish URL pointing at the `pages.S7.exacttarget.com/Publish.aspx` endpoint with a signed `qs` query string.

The URL is opaque and session-specific, so there is no closed set of sentinel values to test for; the only stable check is that the value is non-empty.

## Behaviour

**The return is a bare URL, not markup.** A valid call renders a plain `http://pages.S7.exacttarget.com/Publish.aspx?qs=...` string with no surrounding `<a>` tag, so the caller supplies the anchor.

**A numeric-string code works the same as the number.** `GetSocialPublishURL("1", "Shared content region 1")` produced a URL of the same shape as `GetSocialPublishURL(1, ...)`, so the network code accepts a `string` or a `number`.

**Appended key/value pairs are accepted.** Passing an extra pair such as `"utm_source", "amp"` was accepted and lengthened the signed query string.

**An empty content region aborts the page.** `GetSocialPublishURL(1, "")` returns HTTP 422 and discards the output rendered before it — the empty region is rejected at runtime rather than defaulted, so guard the region name before calling.

{% include test-script.html bundle="ampscript-functions--getsocialpublishurl" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`GetSocialPublishURLByName`](/engagement/ampscript/functions/getsocialpublishurlbyname/) — the same URL by social network name plus a country code
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-social/mc-ampscript-reference-social-get-social-publish-url.html) · [ampscript.guide](https://ampscript.guide/getsocialpublishurl/)
