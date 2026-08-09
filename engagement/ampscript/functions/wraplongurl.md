---
layout: page
title: "WrapLongURL"
description: "Shortens a long URL for email clients that truncate long hyperlinks. Runtime-proven on a live Marketing Cloud Engagement CloudPage — outside a send the argument comes back byte for byte unchanged, whatever its length."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/wraplongurl/
platforms:
  - engagement
syntax: "WrapLongURL(url)"
return_type: string
min_args: 1
max_args: 1
verification: verified
differs_from_docs: true
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string \| number | Yes | URL to shorten |

## Example

```html
%%[
  VAR @link
  SET @link = WrapLongURL(@veryLongTrackingUrl)
]%%
<a href="%%=v(@link)=%%">Read more</a>
```

In an email send this yields a short platform link that forwards to the original address. On a CloudPage it does not: a URL built to 1048 characters came back at exactly 1048 characters, character for character the input. Test the shortening in a send, not on a page.

## Return value

**`string`** — the shortened URL when the call happens during a send; in any other context the supplied value unchanged.

The value domain is open, so there is no set of sentinel values to test for. Outside a send the return value is simply the argument, so a caller cannot tell from the result alone whether shortening happened.

## Behaviour

**Outside a send nothing is shortened.** A URL assembled to 1048 characters — well past the documented 975-character threshold — was returned at the same length and compared equal to the input in the same render. This is the point worth remembering: a CloudPage will never show you the shortened form, so a page render is not a valid test of the feature.

**Determinism follows from that.** Two calls with the same input in one render returned identical strings. That is a property of the pass-through, not evidence of a stable shortening token.

**A URL already below the threshold comes back unchanged** — a 27-character URL rendered at length 27. This is the one part of the documented behaviour a page can confirm.

**Nothing is validated.** An empty string answers empty at length zero, a word that is not a URL at all comes back unchanged, and a bare number comes back as its decimal digits. None of these aborts, so a malformed value passes straight through into your markup.

**Exactly one argument.** A zero-argument call and a two-argument call each abort the request with HTTP 422.

{% include test-script.html bundle="ampscript-functions--wraplongurl" chapter="behaviour" %}

### Differs from official docs

The official reference states the shortening unconditionally: a URL longer than 975 characters comes back as a short link that redirects to the original. That did not happen in any page render. The community guide supplies the missing condition — shortening is applied when the message is sent — which explains the gap, but the official page does not mention it, so a reader of that page alone will draw the wrong conclusion.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [RedirectTo](/engagement/ampscript/functions/redirectto/) — the other send-context link function, likewise a pass-through on a page
- [v](/engagement/ampscript/functions/v/) — outputs the result inline
- [Differs from docs: no shortening outside a send](/engagement/differs-from-docs/#wraplongurl-no-shortening-outside-a-send)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-http/mc-ampscript-reference-http-wrap-long-url.html) · [ampscript.guide](https://ampscript.guide/wraplongurl/)
