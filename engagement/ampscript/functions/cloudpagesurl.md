---
layout: page
title: "CloudPagesURL"
description: "Builds the published URL of a CloudPages landing page. Runtime-proven on a live Marketing Cloud Engagement CloudPage — extra arguments must come in pairs, and a page ID that matches no page aborts the request instead of returning an empty string."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/cloudpagesurl/
platforms:
  - engagement
syntax: "CloudPagesURL(pageId[, paramName1, paramValue1, paramNameN, paramValueN, ...])"
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
| `pageId` | string \| number | Yes | CloudPages page ID (number or string) |
| `paramName1` | string | No | Query parameter name |
| `paramValue1` | string | No | Query parameter value |
| `paramNameN` | string | No | Additional query parameter name |
| `paramValueN` | string | No | Additional query parameter value |

Name and value are supplied as a pair, and the pairs repeat for as long as you need them. There is no upper bound on the argument count.

## Example

```html
%%[
  VAR @link
  SET @link = CloudPagesURL(39412)
]%%
<a href="%%=v(@link)=%%">Open the page</a>
```

Renders the landing page's own published URL, unchanged and without a query string — the same address you would copy out of the page's properties.

Add a pair when the target page needs a value, and read it back there with `RequestParameter`:

```html
%%[
  VAR @link
  SET @link = CloudPagesURL(39412, "offer", "spring")
]%%
<a href="%%=v(@link)=%%">See your offer</a>
```

The rendered `href` now carries one extra query parameter holding a single encrypted token. Neither `offer` nor `spring` is readable in it — see below.

## Return value

**`string`** — the published URL of the referenced page.

The value domain is open, so there is no set of sentinel values to test for. What is fixed is the shape: with no extra pairs it is the bare page URL; with pairs it is that same URL plus exactly one query parameter, whatever number of pairs you passed.

## Behaviour

**A plain call returns the page's direct URL, not a wrapper.** Called with a page ID from an ordinary anonymous page request, the result was byte-for-byte the referenced page's own published address — same host, same path, no query string, and no tracking or redirect host in front of it. Nothing needs unwrapping before you can use it.

**Extra arguments must come in pairs.** One, three and five arguments all render. Two and four abort the request with HTTP 422 and discard everything already written, so a name left without its value takes the whole page down rather than being ignored.

**A page ID that matches no page aborts the request.** It does not return an empty string and it does not return an error value — the request fails outright with HTTP 422, discarding output already written. This is the single most important thing to know about the function: a mistyped ID looks exactly like a broken page, and gives you nothing to test for. Validate the ID before you build the link — see [the card on this](/engagement/differs-from-docs/#cloudpagesurl-unknown-page-id-aborts).

**Pairs are encrypted, not appended.** A pair produced one extra query parameter carrying a long opaque token in which neither the name nor the value could be found. A second pair only lengthened that same token. Do not expect to read your own parameters back out of the URL string.

**Encoding a value is therefore moot.** A value containing a space and an ampersand produced a result with no space and no ampersand anywhere in it. The characters that would need escaping never reach the URL as text in the first place.

**The token changes on every request.** The same call fetched twice returned two different tokens of equal length, so the result must never be compared, deduplicated or cached as an identity. Two calls inside a *single* render do match — a comparison that passes in one page is not evidence the value is stable.

**The ID may be a number or a quoted string.** Both spellings of the same ID produced the identical URL.

{% include test-script.html bundle="ampscript-functions--cloudpagesurl" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" text="Re-running the script above: a bare string literal passed to `OutputLine` renders an empty line instead of the marker. Every marker, banner and label has to go through `Concat(...)`, even with a single argument." %}

Two things this harness cannot reach. What the token resolves to on the target page needs a real send with a real subscriber, so the personalisation the official reference describes is untested here — only the token's existence, its per-call variation and its absorption of the extra pairs were proven. And the reserved parameter names the official reference lists were not exercised at all, so that list stands unchallenged and unconfirmed.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [MicrositeURL](/engagement/ampscript/functions/micrositeurl/) — the Classic Content microsite counterpart, which accepts an ID that matches nothing instead of aborting
- [RedirectTo](/engagement/ampscript/functions/redirectto/) — wrap the result when link tags would otherwise break the URL
- [Unknown page IDs abort the request](/engagement/differs-from-docs/#cloudpagesurl-unknown-page-id-aborts) — the finding in full
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-sites/mc-ampscript-reference-sites-cloud-pages-url.html) · [ampscript.guide](https://ampscript.guide/cloudpagesurl/)
