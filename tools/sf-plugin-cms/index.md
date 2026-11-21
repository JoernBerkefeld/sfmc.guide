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

- Retrieve, preview, deploy, delete, publish and unpublish emails, email templates, email fragments, images, documents, audio files and brands
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

## Quick start

```sh
sf cms list workspace -o source
sf cms retrieve -o source --workspace Default_Content_Workspace -m email
sf cms deploy -o target --workspace Default_Content_Workspace -m email:Welcome_Email --preview
sf cms deploy -o target --workspace Default_Content_Workspace -m email:Welcome_Email
sf cms publish -o target --workspace Default_Content_Workspace -m email:Welcome_Email
```

## How it works

- **Files:** each component is one JSON file under `cms/<workspace>/<type>/`. Email and template HTML and plain text sit next to it as `.html` and `.txt` files; images, documents and audio keep their file next to the JSON. The files hold no record IDs, content keys or status.
- **Preview first:** `--preview` on deploy, delete, publish and unpublish reports `create`, `update`, `unchanged`, `delete` or `blocked` per component and changes nothing.
- **Deploy:** creates components the destination does not have and updates the default variant of the ones it has; unchanged components are not written. Referenced components are written first. If anything is blocked, nothing is written; the first failed write stops the deploy, and there is no rollback.
- **Retrieve is lenient, deploy is strict:** retrieve keeps settings it does not recognise in the file; deploy refuses such a file and names the setting. Values are not checked by the plugin: Salesforce decides, and its answer is shown.
- **Delete:** takes components by name only, confirms the delete by reading back, then removes the local files (`--keep-local-files` keeps them). A component with other variants is refused, because Salesforce would delete them too.
- **Folders:** the file names the folder path from the workspace root; missing folders are created on deploy. Existing components are never moved.
- **References:** an image or brand used by another component is stored by type and API name, so the same file works in every workspace and org. A reference the destination does not have blocks the deploy, unless the same deploy creates it.
- **Data graphs:** before deploying an email or fragment that uses a data graph, the plugin checks that the destination org has that data space and data graph. Deploy data graphs with [sf-plugin-data](/tools/sf-plugin-data/) first.
- **Errors:** every problem has a plugin error code and a hint; Salesforce's HTTP status, error code and message are shown as they came.

## Links

- [GitHub](https://github.com/JoernBerkefeld/sf-plugin-cms)
- [npm](https://www.npmjs.com/package/sf-plugin-cms)

[← All tools](/tools/)
