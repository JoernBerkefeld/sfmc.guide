---
layout: page
title: "MobilePush setup"
description: "How the MobilePush SDK creates and updates contacts with your contact key and device ID, a setup checklist for the Marketing Cloud and app teams, push consent, and what to check when devices are missing."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/mobilepush/
platforms:
  - engagement
---

This page is for Marketing Cloud architects who set up push notifications together with an app team. The goal is simple: when a user registers or logs in to the app, Marketing Cloud has **one contact with your own ID as the contact key, and the user's device attached to it**.

{% include callout.html type="note" title="Check method names against your SDK version" content="The Marketing Cloud mobile SDK was renamed several times (MobilePush SDK, Marketing Cloud SDK, Engagement Mobile SDK, unified SDK) and method names changed with it. The names below are the common ones; your app team must check them against the SDK version they use." %}

- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [How contacts and devices are created and updated](#how-contacts-and-devices-are-created-and-updated)
- [Push consent](#push-consent)
- [Troubleshooting: contact exists but has no device](#troubleshooting-contact-exists-but-has-no-device)
- [Finding the official documentation](#finding-the-official-documentation)

## How it works

1. The app starts the SDK with the details of a **MobilePush app** that lives in one Marketing Cloud business unit.
2. The app sets the **contact key** (your ID, for example a global customer ID) in the SDK.
3. The SDK sends a **registration** to Marketing Cloud: contact key, a device ID the SDK generates per install, the push token from Apple or Google, the opt-in status, app ID, tags and attributes.
4. Marketing Cloud attaches this device to the contact with that key, or creates the contact if it does not exist yet.
5. After that, the SDK sends an update whenever this data changes. The SDK is the source of truth; data only flows from the device to Marketing Cloud.

Nothing else creates the MobilePush part of a contact. Not a list, not an automation, not your backend. Only the SDK registration does.

## Getting started

### Marketing Cloud team

1. **Create the MobilePush app** in Setup → Apps → MobilePush, in the business unit that will send the pushes.
2. **Add the push credentials**: an Apple key or certificate for iOS, and the Firebase (FCM) credentials for Android. Expired Apple certificates stop iOS sends.
3. **Hand over to the app team**: App ID, Access Token, App Endpoint (tenant-specific URL) and the business unit MID.
4. **Agree on the contact key**: which ID, in which exact format. It must match the subscriber key you use in email and elsewhere, character for character.
5. **Create attributes** in MobilePush Demographics (Contact Builder) before the app sends them.

### App team

1. **Add the SDK** and configure it with the four values from the Marketing Cloud team. Android also needs Firebase set up correctly, otherwise the SDK fails to start.
2. **Set the contact key** as soon as the user is known: `setProfileId(yourId)` in current SDKs, `setContactKey(yourId)` in older ones.
3. **Delay the registration until the key is set**: `delayRegistrationUntilContactKeyIsSet = true`. Without it, the first registration goes out with a generated key before login.
4. **Request notification permission** and pass the push token to the SDK (on iOS from `didRegisterForRemoteNotifications`).
5. **Turn on SDK logging** in test builds. The log shows whether the SDK started, which contact key and device ID were sent, and the server's response.

### Test together

1. Fresh install on a test phone (uninstall first), register or log in with a test user.
2. Wait about 15 minutes; registrations are not instant.
3. Open the test user's contact in Contact Builder and check its **MobilePush** section: device ID, system token, opt-in status. The All Contacts overview does not show the device ID.
4. Compare with the SDK log: same contact key, same device ID.

## How contacts and devices are created and updated

| Situation | Result in Marketing Cloud |
|---|---|
| Contact key set, contact **does not exist** | New contact with your key, device attached |
| Contact key set, contact **already exists** (from email, API, import) | Device attached to the existing contact. No duplicate. Email data, data extensions and other attributes stay as they are |
| **No** contact key set | Contact with a key Marketing Cloud generates. It never merges with your contact |
| Key set **after** the first registration | Device moves to your contact; the generated contact stays behind without a device ("orphaned") |
| Second phone, same user | Second device under the same contact |
| Another user logs in on the same phone | Device moves to the other user's contact |
| No notification permission yet | Device exists, push token may be empty, status not opted in |

## Push consent

There are two kinds of consent, and they reach Marketing Cloud in different ways.

**Technical opt-in comes only from the SDK.** It reflects the OS notification permission and the SDK's own push switch, which the app can turn on and off. Apple and Google also report invalid tokens and opt-outs back to Marketing Cloud. You cannot set this status from Marketing Cloud, an automation or the API.

**Marketing or legal consent** (from a consent tool, CRM or web form) is your own data:

- **Consent given in the app:** the app maps its consent switch to the SDK push switch. No consent means push disabled, and Marketing Cloud shows the device as not opted in. One source of truth.
- **Consent captured elsewhere:** load it into a data extension keyed on the contact key via automation or API, and filter on it in Journey Builder or use it as an exclusion list.

A contact only gets a push when the device is opted in **and** your consent data allows it. Both checks depend on the contact key matching; if devices sit under generated keys, consent filters on your ID miss them.

## Troubleshooting: contact exists but has no device

The contact and the device registration reach Marketing Cloud by different routes. A contact with your ID proves something created the contact, not that the SDK did.

| Symptom in the SDK log | Likely cause | What to check |
|---|---|---|
| SDK not started, init errors | Wrong configuration, Firebase missing (Android) | App ID, Access Token, App Endpoint, MID, Firebase setup |
| Nothing sent | Delayed registration and the key is never set, or set through the wrong call | `setProfileId` / `setContactKey` call and when it runs |
| Sent, but with another contact key | Key not set, set too late, different format (case, prefix, email instead of ID), shared test phone | Search Contact Builder for the key or device ID from the log |
| Sent with your exact key and accepted | You are looking in the wrong place | The contact's MobilePush section, the right business unit, waited 15 minutes |
| Sent and rejected, or retrying | Network blocked, wrong endpoint | Server response in the log; firewall or proxy on the test network |

Contacts can also come from your backend calling the API at sign-up, from email sends, imports, Marketing Cloud Connect or journey entries. That is fine, as long as the SDK then registers with exactly the same key.

## Finding the official documentation

The topic is spread across the SDK developer guides (app side) and Salesforce Help (Marketing Cloud side), and the important rules sit on pages with unexpected titles. These search terms get you there fastest:

- `setProfileId` and "Register Contacts" (MobilePush SDK): how the contact key is set and what happens without one
- "Contact Dissociation": orphaned contacts and `delayRegistrationUntilContactKeyIsSet`
- "Troubleshoot Initialization and Registration": SDK start and registration problems
- "MobilePush" in Salesforce Help, Mobile Studio section: the Marketing Cloud side (app setup, credentials, contacts)

Useful starting points:

- [MobilePush module overview](https://developer.salesforce.com/docs/marketing/mobile-unified-sdk/guide/overview.html)
- [Register contacts](https://developer.salesforce.com/docs/marketing/mobile-unified-sdk/guide/register-contacts-with-marketing-cloud.html)
- [Contact dissociation](https://developer.salesforce.com/docs/marketing/mobile-unified-sdk/guide/contact-dissociation.html)
- [Troubleshoot initialization and registration](https://developer.salesforce.com/docs/marketing/mobile-unified-sdk/guide/troubleshooting.html)
- [How the MobilePush module works](https://developer.salesforce.com/docs/marketing/mobile-unified-sdk/guide/how-the-sdk-works.html)
