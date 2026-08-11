---
layout: page
title: "GetJWTByKeyName"
description: "Generates a JSON Web Token signed with a named Key Management key. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the RSA algorithms really do sign with an uploaded asymmetric key, verifiable off-platform against its public key."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/getjwtbykeyname/
platforms:
  - engagement
syntax: "GetJWTByKeyName(keyName, algorithm, jsonPayload)"
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
| `keyName` | string | Yes | External key of a Key Management key; the stored key string is UTF-8-encoded before use |
| `algorithm` | string | Yes | Signing algorithm — `HS256`, `HS384`, `HS512` for a symmetric key, or `RS256`, `RS384`, `RS512` for an asymmetric key |
| `jsonPayload` | string | Yes | Payload to encode, copied into the token untouched |

## Example

```html
%%[
  VAR @payload, @token
  SET @payload = '{"sub":"amp-verify","iat":"1700000000"}'
  SET @token = GetJWTByKeyName("AMP_VERIFY_JWT_HS", "HS256", @payload)
]%%
%%=v(@token)=%%
```

Renders `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbXAtdmVyaWZ5IiwiaWF0IjoiMTcwMDAwMDAwMCJ9.iC2IjXWi2m7E65Zp7BveyIXQY3uFbHaz1GUEcraTDhI` when `AMP_VERIFY_JWT_HS` is a Symmetric key whose stored value is that Base64 string.

The point of this function over [GetJWT](/engagement/ampscript/functions/getjwt/) is that the secret never appears in the page — it lives in Key Management and is referenced by its external key:

```html
%%[
  VAR @claims, @token
  SET @claims = Concat('{"email":"', AttributeValue("EmailAddress"), '","iat":"', Now(), '"}')
  SET @token = GetJWTByKeyName("AMP_VERIFY_JWT_RS", "RS256", @claims)
]%%
<a href="https://example.org/preferences?t=%%=v(@token)=%%">Update your preferences</a>
```

An `RS*` algorithm needs an Asymmetric key; a receiving system checks the signature with the matching public key, so the private key stays inside Marketing Cloud.

## Return value

**`string`** — the token as three Base64url segments joined by dots: the encoded header, the encoded payload, and the signature.

There is no closed set of sentinel values to test for. Every accepted call returns a token, and an unresolvable key name or a mismatched key type aborts the page instead of returning an error value.

## Behaviour

**The HMAC token matches an inline `GetJWT` byte for byte.** With a Symmetric key whose stored value is the Base64 string `oGbE/i+gRbdjSen3sVYES5DylJE760qsgNWI77UBUdM=`, `HS256`, `HS384` and `HS512` each produced a token identical to `GetJWT` called with that **same string** as the secret. The key string is UTF-8-encoded as stored — it is not Base64-decoded first — so reproducing the token with `GetJWT` means passing the stored string verbatim, not its decoded bytes.

**The RSA algorithms sign with the uploaded private key.** `RS256`, `RS384` and `RS512` each produced a well-formed token against an Asymmetric key uploaded from a 4096-bit RSA `.asc` file. Splitting the `RS256` token, reconstructing the RSA public key from the same keypair, and verifying `RSA-SHA256` over the `header.payload` bytes returned `true` — cryptographic proof that the private key behind the named Key Management key did the signing. `RS384`/`RS512` verified the same way with `RSA-SHA384`/`RSA-SHA512`.

**The header is generated from the algorithm argument and nothing else.** Decoding the first segment gave `{"alg":"RS256","typ":"JWT"}` (and the `HS*`/`RS384`/`RS512` variants carry their own `alg`) — no key id, no extra claims.

**The payload round-trips untouched.** The middle segment is the Base64url of the exact input `{"sub":"amp-verify","iat":"1700000000"}`, identical across every algorithm.

**The signature length follows the algorithm and the key.** The three HMAC signatures were 43, 64 and 86 Base64url characters (HS256/384/512 output sizes). Every RSA signature was 512 raw bytes — the modulus size of the 4096-bit key — regardless of the SHA variant, which is 683 Base64url characters.

**A key name that does not exist in Key Management aborts the page.** An unresolvable external key returns HTTP 422 with nothing rendered, not an empty string at HTTP 200 — so a caller cannot check for a missing key after the fact.

{% include test-script.html bundle="ampscript-functions--getjwtbykeyname" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="A bare string literal passed to `OutputLine` renders an empty line while the page still returns HTTP 200, so the marker silently vanishes and the block looks like a function that produced no output. Always wrap it — `OutputLine(Concat(\"--- safe start ---\"))` — even for a single argument." %}

{% include callout.html type="note" title="Provisioning: the key type must match the algorithm" content="The first argument is the key's **External Key**, not its display name, and the key must live in the **same Business Unit (MID)** the AMPscript runs in. The algorithm has to match the provisioned key type — `HS256`/`HS384`/`HS512` need a **Symmetric** key (a stored passphrase or Base64 string), while `RS256`/`RS384`/`RS512` need an **Asymmetric** key; mixing them throws a `FunctionExecutionException`. Both the HMAC and RSA paths were proven with the key living in the same child BU the CloudPage ran in — no parent-BU escalation was needed." %}

{% include callout.html type="note" title="Reproducing a stored-key token off-platform" content="For the HMAC algorithms, `GetJWTByKeyName` UTF-8-encodes the *stored key string* before signing, so to match its output with `GetJWT` you pass the **exact same string value** — don't Base64-decode the stored secret first, or the signatures won't line up. The RSA algorithms have no `GetJWT` equivalent (`GetJWT` is HMAC-only), so an `RS*` token can only be checked off-platform: export the RSA public key from the uploaded keypair to SPKI PEM and verify `RSA-SHA256`/`384`/`512` over the `header.payload` bytes — see [Provisioning the RSA key](#provisioning-the-rsa-key)." %}

## Provisioning the RSA key

The `RS*` algorithms need an **Asymmetric** key in Key Management, and getting one uploaded is the non-obvious part. The uploader is documented around file-transfer and PGP workflows, and the only format that was accepted here is a **PGP/GPG-generated, ASCII-armored `.asc`** secret key — a genuine unsigned 4096-bit RSA PGP keypair. That lines up with Salesforce treating an `.asc` upload as an unsigned 4096-bit RSA key pair for PGP/File Transfer.

{% include callout.html type="warning" title="An OpenSSL .pfx is rejected — don't waste time on it" content="Every OpenSSL-built **PKCS#12 `.pfx`** was refused with *The key file does not contain any valid private encryption keys.* — tried with a PKCS#1 key, a PKCS#8 key, and even a re-encode using the legacy SHA1-3DES cipher and SHA1 MAC. A raw OpenSSL PEM bundle (private key + certificate) renamed to `.asc` was rejected the same way. The uploader wants a real PGP `.asc` (or a genuine certificate), not an X.509 PFX." %}

The recipe that worked, using an isolated keyring so it never touches your default one:

```bash
# 1. Generate an unsigned 4096-bit RSA keypair (no separate key passphrase needed)
gpg --batch --pinentry-mode loopback --passphrase 'ampverify' \
    --quick-generate-key 'AMP Verify <amp-verify@example.org>' rsa4096 sign 0
# (a --full-generate-key batch parameter file works too)

# 2. Export the PRIVATE key, ASCII-armored — this is what you upload
gpg --armor --export-secret-keys <FINGERPRINT> > AMP_VERIFY_JWT_RS_pgp.asc

# 3. Export the PUBLIC key — keep this for off-platform verification
gpg --armor --export <FINGERPRINT> > AMP_VERIFY_JWT_RS_pub.asc
```

Then upload it: **Key Management → Create → Asymmetric → Choose File → select the private `.asc` → Private Key → enter the passphrase → Save**, and give the key the **External Key** you pass as the first argument to `GetJWTByKeyName`.

To verify an `RS*` token, use the matching **public** `.asc`: convert it to SPKI PEM (parse the RSA modulus and exponent out of the PGP public-key packet and DER-encode a `SubjectPublicKeyInfo`) and hand that to any JWT library — `GetJWT` can't reproduce `RS*` because it is HMAC-only.

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [GetJWT](/engagement/ampscript/functions/getjwt/) — the inline-secret variant; HMAC only, and the secret is visible in the page source
- [Base64Encode](/engagement/ampscript/functions/base64encode/) — the padded, non-URL-safe encoding the token segments deliberately avoid
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-get-jwt-by-key-name.html) · [ampscript.guide](https://ampscript.guide/getjwtbykeyname/)
