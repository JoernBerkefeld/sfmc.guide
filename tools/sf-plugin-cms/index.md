---
layout: page
title: "sf-plugin-cms"
description: "Salesforce CLI plugin that copies Marketing Cloud CMS content between a workspace and files in Git."
parent: Tools
parent_url: /tools/
permalink: /tools/sf-plugin-cms/
platforms:
  - next
---

Salesforce CLI (`sf cms`) plugin that copies Marketing Cloud CMS content between a CMS workspace and files you keep in Git. You retrieve components into files, edit them, preview what a deploy would change and deploy them to the same workspace, another workspace or another org. It is not a backup, restore or migration tool.

## What it does

- Retrieve, preview, deploy, delete, publish and unpublish 24 CMS types: emails, templates and fragments, landing pages and their content blocks, forms, media files, messages, brands and more
- List the CMS workspaces of an org and the channels of a workspace
- Works on the default variant of each component; other language and custom variants are left alone, with a warning
- Deploy never publishes and never sends anything; new components are Drafts

## Types

| Type | `-m` name |
| --- | --- |
| Email | `email` |
| Email template | `email-template` |
| Email fragment | `email-fragment` |
| Image | `image` |
| Document | `document` |
| Audio | `audio` |
| Brand | `brand` |
| SMS and MMS | `sms` |
| Push notification | `push-notification` |
| In-app message | `in-app` |
| RCS message | `rcs` |
| WhatsApp session message | `whatsapp-session` |
| Video | `video` |
| Custom font | `custom-font` |
| Contact card (VCF) | `vcf` |
| Content block: landing page | `web-fragment` |
| Consent banner | `consent-banner` |
| Form handler | `form-handler` |
| Form | `form` |
| Landing page template | `landing-page-template` |
| Landing page | `landing-page` |
| Preference page | `preference-page` (create refused by Salesforce) |
| Expression | `expression` |
| Tracked link | `tracked-link` |

### Not handled

- **Preference page:** Salesforce refuses to create one through the API (`CONTENT_TYPE_DISABLED_FOR_API`).
- **Universal fragment:** its CMS editor never finishes loading.
- **Mobile inbox message** and **SMS DLT template:** not available in the org.
- **WhatsApp template message:** needs a connected WhatsApp Business Account.

## Quick start

```sh
sf cms list workspace -o source
sf cms retrieve -o source --workspace Default_Content_Workspace -m email
sf cms deploy -o target --workspace Default_Content_Workspace -m email:Welcome_Email --preview
sf cms deploy -o target --workspace Default_Content_Workspace -m email:Welcome_Email
sf cms publish -o target --workspace Default_Content_Workspace -m email:Welcome_Email
```

## How it works

- **Files:** each component is one JSON file under `cms/<workspace>/<type>/`. Email and template HTML and plain text sit next to it as `.html` and `.txt` files; media files (images, documents, audio, video, fonts, contact cards) sit next to the JSON. The files hold no record IDs, content keys or status.
- **Preview first:** `--preview` on deploy, delete, publish and unpublish reports `create`, `update`, `unchanged`, `delete` or `blocked` per component and changes nothing.
- **Deploy:** creates components the destination does not have and updates the default variant of the ones it has; unchanged components are not written. Referenced components are written first. If anything is blocked, nothing is written; the first failed write stops the deploy, and there is no rollback.
- **Retrieve is lenient, deploy is strict:** retrieve keeps settings it does not recognise in the file; deploy refuses such a file and names the setting. Values are not checked by the plugin: Salesforce decides, and its answer is shown.
- **Delete:** takes components by name only, confirms the delete by reading back, then removes the local files (`--keep-local-files` keeps them). A component with other variants is refused, because Salesforce would delete them too. Deleted components stay in Salesforce's recycle bin: until the bin is emptied, a component with the same API name cannot be created in that workspace again ("You can't create multiple files with the same file name").
- **Folders:** the file names the folder path from the workspace root; missing folders are created on deploy. Existing components are never moved.
- **References:** a component used by another one (an image, a brand, a content block embedded as `@cms/…`, a landing page's template) is stored by type and API name, so the same file works in every workspace and org. A reference the destination does not have blocks the deploy, unless the same deploy creates it.
- **Salesforce records:** a tracked link's Campaign is stored by name, a form's record type by object and developer name. Deploy looks them up in the destination org and never creates them.
- **Data graphs:** before deploying an email or fragment that uses a data graph, the plugin checks that the destination org has that data space and data graph. Deploy data graphs with [sf-plugin-data](/tools/sf-plugin-data/) first. Salesforce may refuse to delete a data graph ("Unable to delete Data Graph. Try again later.") while deleted CMS items in the recycle bin still use it; this was observed, the cause is not proven.
- **Merge fields across orgs:** content keeps its merge fields. The destination org needs the same data graph: the same name, in the same data space, with every field the merge fields use. Deploy checks this before any write and refuses a missing data graph or field, naming it and the sf-plugin-data command that adds it.
- **Merge fields across data spaces and business units:** `--dataspace <name>` names the data space the content's data graphs must be in; `--allow-cross-dataspace` (`-c`) lets deploy move a data graph of another data space into it. The plugin then renames the data graph, its data space and every object and field name in the merge fields by the data space rules of sf-plugin-data (for example `Marketing` → `ds2_Marketing`, `ssot__FirstName__c` → `FirstName__c`), checks each merge field against the data graph in the target data space, and pairs identity resolution objects (`Unified…`) through the org's rulesets. All other text stays as it was, and `--preview` lists every rename. A name with no counterpart, or with more than one, is refused before anything is written, and so is a deploy into another data space without `-c`. This moves content to a workspace of another business unit with its own data space: an email with merge fields was proven to work in the second business unit's editor.
- **Publish:** only the named components are published. Name a page together with the content blocks it embeds: in one run, embedded components are published first and unpublished last. Publishing a landing page or template makes a public URL live, and the plugin says so. For a landing page in another org, publish its content blocks (web fragments) first; the plugin does that when they are in the same run, and the template can stay Draft. Forms and form handlers publish only with an input field and a Flow added in the CMS editor.
- **Per-type details:** a custom font without `fallbackFont` gets `"arial"` from Salesforce; a contact card's `vcfData` is filled from the `.vcf` file; a tracked link's short link and expiry are added by Salesforce on publish and not kept in the file.
- **Errors:** every problem has a plugin error code and a hint; Salesforce's HTTP status, error code and message are shown as they came.
- **Exit codes:** as in the Salesforce CLI, with and without `--json`: `0` success, `1` failed, `2` wrong flags, `68` partial (some components written, another failed), `69` still open (no answer within the timeout, or the readback after a deploy or publish not confirmed yet).
- **As a library:** other tools can import `sf-plugin-cms/api` and call deploy, publish, unpublish, delete (`remove`) and retrieve on their own org connection, with the same result as `--json`. `getItems` tells whether components exist and are published, and two helpers build and read the content reference a flow stores (`marketing--<workspace>.sfdc_cms__email--<ApiName>`). Once publish reports `published`, a flow can use the content at once.

## Links

- [GitHub](https://github.com/JoernBerkefeld/sf-plugin-cms)
- [npm](https://www.npmjs.com/package/sf-plugin-cms)

[← All tools](/tools/)
