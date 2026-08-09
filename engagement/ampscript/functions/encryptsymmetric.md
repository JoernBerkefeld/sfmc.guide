---
layout: page
title: "EncryptSymmetric"
description: "Encrypts a value with symmetric key encryption and returns Base64. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including the fact that the ciphertext is deterministic, so equal plaintexts are linkable."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/encryptsymmetric/
platforms:
  - engagement
syntax: "EncryptSymmetric(value, algorithm, passwordExternalKey, password, saltExternalKey, salt, ivExternalKey, iv)"
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
| `value` | string | Yes | The value to encrypt |
| `algorithm` | string | Yes | Cipher name, optionally followed by semicolon-separated mode and padding settings |
| `passwordExternalKey` | string | Yes | External key of a Key Management customer key holding the passphrase, or empty when the passphrase is supplied inline |
| `password` | string | Yes | The passphrase itself, or empty when an external key is used |
| `saltExternalKey` | string | Yes | External key holding the salt, or empty when the salt is supplied inline |
| `salt` | string | Yes | The salt as a hex string, or empty when an external key is used |
| `ivExternalKey` | string | Yes | External key holding the initialization vector, or empty when the IV is supplied inline |
| `iv` | string | Yes | The initialization vector as a hex string, or empty when an external key is used |

All eight arguments must be present. The three external-key positions and the three inline positions form pairs: fill one side of each pair and leave the other empty.

## Example

```html
%%[
  VAR @cipher
  SET @cipher = EncryptSymmetric(
    "SFMC probe 2026", "aes",
    @noKey, "zzThrowawayPhrase2026",
    @noKey, "0011223344556677",
    @noKey, "000102030405060708090a0b0c0d0e0f")
]%%
%%=v(@cipher)=%%
```

Renders `Ig8oL30Et8hO0sELCyVakw==` — 24 Base64 characters for a 15-character input.

`@noKey` is simply never assigned. An undeclared variable is how you say "no external key" inline; an empty string literal in the same position does exactly the same thing.

Round-tripping is the normal use, and both halves need the same four settings:

```html
%%[
  VAR @plain, @cipher, @back
  SET @plain = AttributeValue("EmailAddress")
  SET @cipher = EncryptSymmetric(@plain, "aes", @noKey, @pw, @noKey, @salt, @noKey, @iv)
  SET @back   = DecryptSymmetric(@cipher, "aes", @noKey, @pw, @noKey, @salt, @noKey, @iv)
]%%
```

Never hard-code a real passphrase in a CloudPage the way the example above does with a throwaway value — use a Key Management customer key.

## Return value

**`string`** — the ciphertext, Base64-encoded.

There is no sentinel value to test for. A rejected argument aborts the page rather than returning an error token, so a branch that renders nothing at all is the failure signal.

## Behaviour

**The round trip is exact, including non-ASCII.** Encrypting a fixed ASCII string and decrypting it again in the same render returned the original byte for byte, and so did a string containing `é` and `€`. Nothing in the pair is lossy.

**The output is Base64, and its length follows the cipher's block size rather than the input length.** A 15-character plaintext produced 24 Base64 characters — 16 bytes, exactly one AES block, so a short input is padded up to the block boundary.

**The ciphertext is deterministic.** Two calls with byte-identical arguments in the same render produced the identical string. The initialization vector comes from the argument you pass, not from a fresh random value per call — which means equal plaintexts encrypt to equal ciphertexts. If you store these values, they are linkable: anyone who can see the column can tell which rows share a plaintext, without decrypting anything.

**More cipher names work than the sources list.** `aes`, `des` and `tripledes` were all accepted and all round-tripped, and the name is case-insensitive — `AES` behaves exactly like `aes`.

**The algorithm argument also takes a compound form.** A cipher name followed by semicolon-separated settings, such as `des;mode=ecb;padding=zeros`, is accepted — and the padding choice is visible in the result: under `padding=zeros` the decrypted value comes back with trailing padding characters, so the caller has to strip them.

**An empty string and an omitted external key are interchangeable.** Passing `""` in the three external-key positions produced the same ciphertext as passing an undeclared variable.

**All eight arguments are required, and a wrong count is a compile-time error.** Seven and nine arguments each abort the page — and unlike a bad argument *value*, a wrong argument *count* kills every branch of the page, including ones that never run. You cannot hide an arity mistake behind a condition.

**The named-key form is not covered here.** Supplying a Key Management customer key in the external-key positions requires a key configured in Setup, which was not available on the business unit used for these checks. Everything above was proven with inline values only.

{% include test-script.html bundle="ampscript-functions--encryptsymmetric" chapter="behaviour" %}

{% include callout.html type="warning" title="Declare every VAR once, at the top" content="AMPscript has no block scope. Re-declaring a variable with `VAR` inside an `IF` branch aborts the whole page at compile time, even when that branch is never selected. Hoist every declaration into a single top-level block before the branches." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [DecryptSymmetric](/engagement/ampscript/functions/decryptsymmetric/) — the inverse; the pair round-trips exactly when all four settings match
- [Base64Encode](/engagement/ampscript/functions/base64encode/) — encoding, not encryption; anyone can reverse it
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-encryption/mc-ampscript-reference-encryption-encrypt-symmetric.html) · [ampscript.guide](https://ampscript.guide/encryptsymmetric/)
