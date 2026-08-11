---
layout: page
title: "UpsertContact"
description: "Upserts attributes onto a mobile contact matched by phone number, creating the contact if it does not exist. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that both a create and an update return 0 and that an unknown attribute returns 1 without writing."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/upsertcontact/
platforms:
  - engagement
syntax: "UpsertContact(channel, attribute, phoneNumber, keyToUpsert1, valueToUpsert1[, keyToUpsertN, valueToUpsertN, ...])"
return_type: number
min_args: 5
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `channel` | string | Yes | Contact channel; only `mobile` is supported |
| `attribute` | string | Yes | Match attribute; only `phone` is supported |
| `phoneNumber` | string \| number | Yes | Phone number including country code |
| `keyToUpsert1` | string | Yes | Name of the first attribute to upsert |
| `valueToUpsert1` | string | Yes | Value of the first attribute |
| `keyToUpsertN` | string | No | Further attribute name |
| `valueToUpsertN` | string | No | Value for the corresponding further attribute |

Attributes are supplied as repeating name/value pairs; there is no upper bound on the number of pairs. The attribute name must be a defined MobileConnect attribute — a system attribute such as `_ZipCode`, `_City`, `_State`, `_FirstName`, `_LastName` or `_UTCOffset`, or a user-created MobileConnect attribute.

## Example

```ampscript
%%[
  VAR @status
  SET @status = UpsertContact("mobile", "phone", 14255550142, "_ZipCode", "98026")
]%%
Status: %%=v(@status)=%%
```

Renders `Status: 0` — the upsert succeeded. The same call made a second time for the same phone number updates the existing contact and again returns `0`.

{% include callout.html type="warning" title="A successful upsert writes a real mobile contact" content="On success this function creates or updates a live mobile contact keyed on the phone number. AMPscript has no contact-delete function, so a contact created this way cannot be removed from AMPscript. Only run the success path against a number you are willing to keep as a contact, and never against a real handset you do not control." %}

## Return value

**`number`** — a status code: `0` on success, `1` on error.

The return is a closed two-value status code, not a count of records. `0` was proven for both creating a new contact and updating an existing one; `1` was proven for several error conditions.

## Behaviour

**A create and an update both return 0.** Upserting an opaque, unreachable phone number in a reserved test range with the system attribute `_ZipCode` returned `0` and created the contact; calling the same phone number again with a different value updated that contact and again returned `0`.

**An unknown attribute name returns 1 without writing.** Passing an attribute name that is not a defined MobileConnect attribute returned `1` with the page rendering fully and no contact written. The same `1` is returned for an unsupported channel (anything other than `mobile`) and for a non-numeric phone value.

**The phone number accepts an integer or a numeric string.** Both `447700900523` and `"447700900524"` returned `0` for a successful create, so either form is accepted for the phone argument.

{% include test-script.html bundle="ampscript-functions--upsertcontact" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

## See also

- [`InsertData`](/engagement/ampscript/functions/insertdata/) · [`UpsertData`](/engagement/ampscript/functions/upsertdata/) — write to a data extension instead of a contact
- [`IsPhoneNumber`](/engagement/ampscript/functions/isphonenumber/) — validate a phone number before upserting
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-contacts/mc-ampscript-reference-contacts-upsert-contact.html) · [ampscript.guide](https://ampscript.guide/upsertcontact/)
