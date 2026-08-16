---
layout: page
title: "RedirectTo"
description: "Marks a URL held in a variable or field as a tracked email link. Runtime-proven on a live Marketing Cloud Engagement CloudPage — despite the name it emits no redirect, never halts the script, and hands the value straight back."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/redirectto/
platforms:
  - engagement
syntax: "RedirectTo(url)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string \| number | Yes | Target URL |

## Example

```html
%%[
  VAR @target
  SET @target = "https://example.com/offer?a=1&b=2"
]%%
<a href="%%=RedirectTo(@target)=%%">See the offer</a>
```

Inside a tracked send this makes the click countable. On a CloudPage the `href` is simply the address you passed, ampersand and all — the response is still HTTP 200 and carries no `Location` header, so nothing about the page changes.

## Dynamic trackable links

When a link URL is assembled from variables, wrap the final address in `RedirectTo` so the click still counts. The temptation is to build the whole `<a>` tag by hand with `Concat` and print it with `v()` — but a link emitted that way is invisible to link tracking.

```ampscript
<!-- good: RedirectTo preserves click tracking -->
%%[
  SET @myParam = "bar"
  SET @url = Concat("https://mydomain.com/somePath?foo=", @myParam)
]%%
<a href="%%=RedirectTo(@url)=%%">demo link</a>
```

```ampscript
<!-- bad: hand-built anchor via Concat + v() is not tracked -->
%%[
  SET @myParam = "bar"
  SET @url = Concat('<a href="', "https://mydomain.com/somePath?foo=", @myParam, '">demo link</a>')
]%%
%%=v(@url)=%%
```

Both render a working link, but only the first is counted as a click. When the URL carries parameters, URL-encode the values before building it (see [URLEncode](/engagement/ampscript/functions/urlencode/)) — an unencoded value can break the resulting link.

## Return value

**`string`** — the link-tracking target for the supplied address during a tracked send; on a CloudPage the supplied value unchanged.

The value domain is open, so there is no set of sentinel values to test for. An empty argument answers an empty string at length zero rather than aborting.

## Behaviour

**The name is misleading: no redirect is emitted.** Every call was fetched with automatic redirect following switched off so the status line could be read literally. The response was HTTP 200 every time, with no `Location` header at all.

**It does not halt the script.** Output written before the call is delivered, output written after it is delivered, and the enclosing block runs to its end. Treating this function as a way to send a visitor elsewhere from a landing page does not work — that is not what it does.

**On a page the argument comes straight back.** A URL carrying two query parameters returned at its original length with the ampersand intact and no tracking wrapper around it. Calling it inline inside a concatenation behaves exactly like assigning it first.

**Nothing is validated.** A word that is not a URL comes back unchanged, an empty string comes back empty, and a bare number comes back as its decimal digits.

**Exactly one argument.** A zero-argument call and a two-argument call each abort the request with HTTP 422.

{% include test-script.html bundle="ampscript-functions--redirectto" chapter="behaviour" %}

What a page cannot show is the function's actual purpose — producing the tracked target inside a send, where clicks are attributed to a subscriber. That needs a real send and is untested here. The official reference never claims a redirect happens at render time, so the pass-through is a limit of the test context rather than a contradiction.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [WrapLongURL](/engagement/ampscript/functions/wraplongurl/) — the other send-context link function, likewise a pass-through on a page
- [v](/engagement/ampscript/functions/v/) — outputs the result inline
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-redirect-to.html) · [ampscript.guide](https://ampscript.guide/redirectto/)
