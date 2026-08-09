---
layout: page
title: "DecryptSymmetric"
description: "Decrypts a Base64 ciphertext produced by EncryptSymmetric. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including which cipher names work and why an arity mistake cannot be hidden behind a condition."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/decryptsymmetric/
platforms:
  - engagement
syntax: "DecryptSymmetric(encryptedValue, algorithm, passwordExternalKey, password, saltExternalKey, salt, ivExternalKey, iv)"
return_type: string
min_args: 8
max_args: 8
verification: verified
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `encryptedValue` | string | Yes | The Base64 ciphertext to decrypt |
| `algorithm` | string | Yes | Cipher name, optionally followed by semicolon-separated mode and padding settings; must match what was used to encrypt |
| `passwordExternalKey` | string | Yes | External key of a Key Management customer key holding the passphrase, or empty when the passphrase is supplied inline |
| `password` | string | Yes | The passphrase itself, or empty when an external key is used |
| `saltExternalKey` | string | Yes | External key holding the salt, or empty when the salt is supplied inline |
| `salt` | string | Yes | The salt as a hex string, or empty when an external key is used |
| `ivExternalKey` | string | Yes | External key holding the initialization vector, or empty when the IV is supplied inline |
| `iv` | string | Yes | The initialization vector as a hex string, or empty when an external key is used |

All eight arguments must be present, and all four settings — algorithm, passphrase, salt and IV — must match the ones used to encrypt.

## Example

```html
%%[
  VAR @plain
  SET @plain = DecryptSymmetric(
    "Ig8oL30Et8hO0sELCyVakw==", "aes",
    @noKey, "zzThrowawayPhrase2026",
    @noKey, "0011223344556677",
    @noKey, "000102030405060708090a0b0c0d0e0f")
]%%
%%=v(@plain)=%%
```

Renders `SFMC probe 2026`. The ciphertext is a plain transportable string, so it can be stored, passed through a link, or hard-coded like this — it is not an in-render handle.

The usual shape is decrypting something that arrived from outside the page:

```html
%%[
  VAR @token, @plain
  SET @token = RequestParameter("t")
  SET @plain = DecryptSymmetric(@token, "aes", @noKey, @pw, @noKey, @salt, @noKey, @iv)
]%%
```

`@noKey` is simply never assigned — an undeclared variable is how you say "no external key" inline, and an empty string literal does the same thing.

## Return value

**`string`** — the decrypted plain text.

There is no sentinel value to test for. A branch that renders nothing at all is the failure signal.

## Behaviour

**The round trip is exact, including non-ASCII.** A fixed ASCII string and a string containing `é` and `€` each came back byte for byte identical to the original when encrypted and decrypted in the same render with the same arguments.

**The cipher names accepted match the encrypt side, and the name is case-insensitive.** `aes`, `AES`, `des` and `tripledes` each returned the original plaintext, every one exercised through an actual `DecryptSymmetric` call rather than assumed from its inverse.

**The compound form works, and the padding scheme is visible in the result.** `des;mode=ecb;padding=zeros` decrypted successfully, but the returned string carried trailing padding characters instead of ending at the original plaintext — measure the length rather than trusting that the value ends where you expect.

**An empty string and an omitted external key are interchangeable.** Passing `""` in the three external-key positions returned the same plaintext as passing an undeclared variable.

**All eight arguments are required, and a wrong count is a compile-time error.** Seven and nine arguments each abort the page, and — unlike a bad argument *value* — a wrong argument *count* takes down every branch of the page, including ones that are never selected. An arity mistake cannot be hidden behind a condition.

**What happens on bad input is not established here.** Decrypting with a wrong passphrase, a wrong salt, or a malformed or truncated ciphertext could not be pinned down: those cases sat in a page that was already aborting for an unrelated compile-time reason, so their failures say nothing about the function. Treat the outcome as unknown and validate the input before you rely on it.

**The named-key form is not covered here.** Supplying a Key Management customer key in the external-key positions requires a key configured in Setup, which was not available on the business unit used for these checks. Everything above was proven with inline values only.

{% include test-script.html bundle="ampscript-functions--decryptsymmetric" chapter="behaviour" %}

{% include callout.html type="warning" title="Declare every VAR once, at the top" content="AMPscript has no block scope. Re-declaring a variable with `VAR` inside an `IF` branch aborts the whole page at compile time, even when that branch is never selected. Hoist every declaration into a single top-level block before the branches." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [EncryptSymmetric](/engagement/ampscript/functions/encryptsymmetric/) — the inverse; produces the Base64 ciphertext this function consumes
- [Base64Decode](/engagement/ampscript/functions/base64decode/) — decoding, not decryption; needs no key at all
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-decrypt-symmetric.html) · [ampscript.guide](https://ampscript.guide/decryptsymmetric/)
