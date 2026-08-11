---
layout: page
title: "GetJWT"
description: "Generates a JSON Web Token signed with an inline secret. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the algorithm name is matched case-insensitively and the payload is never validated as JSON."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/getjwt/
platforms:
  - engagement
syntax: "GetJWT(secret, algorithm, jsonPayload)"
return_type: string
min_args: 3
max_args: 3
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `secret` | string | Yes | Secret used to sign the token; the empty string aborts the page |
| `algorithm` | string | Yes | HMAC algorithm name — `HS256`, `HS384` or `HS512`, matched case-insensitively |
| `jsonPayload` | string | Yes | Payload to encode, copied into the token untouched |

## Example

```html
%%[
  VAR @secret, @payload, @token
  SET @secret = "sfmc-probe-secret-2026"
  SET @payload = '{"sub":"probe","n":7}'
  SET @token = GetJWT(@secret, "HS256", @payload)
]%%
%%=v(@token)=%%
```

Renders `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwcm9iZSIsIm4iOjd9.308Bu1Ma_gFb0_8RNujndwB8xJh6n3myT7xZ3h7BNhE`.

The usual reason to reach for it is handing a receiving system something it can check for tampering, most often on a link:

```html
%%[
  VAR @claims, @token
  SET @claims = Concat('{"email":"', AttributeValue("EmailAddress"), '","iat":"', Now(), '"}')
  SET @token = GetJWT(@secret, "HS256", @claims)
]%%
<a href="https://example.org/preferences?t=%%=v(@token)=%%">Update your preferences</a>
```

The secret is written into the page source, so anyone who can read the page can mint tokens. Where Key Management is available, [GetJWTByKeyName](#see-also) keeps the secret out of the code.

## Return value

**`string`** — the token as three Base64url segments joined by dots: the encoded header, the encoded payload, and the signature.

There is no closed set of sentinel values to test for. Every accepted call returns a token, and every rejected one aborts the page instead of returning an error value — so the result can never be checked defensively after the fact.

## Behaviour

**The token matches an independent implementation byte for byte.** For the payload `{"sub":"probe","n":7}` and the secret above, the page returned exactly the value computed outside Marketing Cloud with a standard HMAC-SHA256, 109 characters long. The same held for `HS384` and `HS512`.

**The header is generated from the algorithm argument and nothing else.** Decoding the first segment on the page gave `{"alg":"HS256","typ":"JWT"}` — no key id, no extra claims.

**Signing is deterministic.** Two calls with identical arguments in the same render produced the identical token, compared on the page rather than by eye.

### The encoding is Base64url, not standard Base64

Searching the token found no `=`, no `+` and no `/`, and an `_` at position 75. The segments therefore use the URL-safe alphabet and carry no padding, which is what lets a token travel in a query string untouched. Do not run the segments through a standard Base64 decoder without translating `-` and `_` back first.

### The algorithm name is matched case-insensitively

Passing `hs256` produced exactly the `HS256` token, header included — the decoded header still reads `"alg":"HS256"`. No source mentions this. Anything outside the three HMAC names is refused outright: `RS256` and the invented `HS999` each aborted the page with HTTP 422, as did an empty secret.

### The payload is never parsed

Passing the plain string `not json at all` produced a valid token whose middle segment is simply the Base64url of that string. Nothing validates the payload as JSON, so a malformed payload ships silently and fails only at the receiving end.

{% include test-script.html bundle="ampscript-functions--getjwt" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="warning" title="Argument-count probes need their own deploy" content="A wrong argument count aborts AMPscript at compile time, so it takes down every branch on the page — including the control block and branches that were never requested. Keep arity checks out of the gated behaviour harness and give each one its own deployment, or a whole run returns uninformative HTTP 422s." %}

{% include callout.html type="note" title="Keeping the secret out of the page" content="To avoid writing the secret into the page source, use [GetJWTByKeyName](/engagement/ampscript/functions/getjwtbykeyname/) and reference a Key Management key by its external key instead. That variant also unlocks the `RS*` RSA algorithms, which `GetJWT` does not support. Its page covers the Key Management provisioning traps — key type versus algorithm, the fussy asymmetric-key uploader (a gpg `.asc` keypair is accepted while an OpenSSL `.pfx` is rejected), and how to reproduce a token off-platform." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [Base64Encode](/engagement/ampscript/functions/base64encode/) — the padded, non-URL-safe encoding the token segments deliberately avoid
- [EncryptSymmetric](/engagement/ampscript/functions/encryptsymmetric/) — when the payload itself must stay unreadable; a token only proves it was not altered
- [The algorithm name is case-insensitive](/engagement/differs-from-docs/#getjwt-case-insensitive-algorithm)
- [The payload is not validated as JSON](/engagement/differs-from-docs/#getjwt-payload-not-validated)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-get-jwt.html) · [ampscript.guide](https://ampscript.guide/getjwt/)
