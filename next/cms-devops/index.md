---
layout: page
title: "CMS DevOps"
description: "Which tool copies which Marketing Cloud Next CMS content type between workspaces and orgs, the verified API behaviour behind it, and the open gaps."
parent: Next
parent_url: /next/
permalink: /next/cms-devops/
verification: in-progress
platforms:
  - next
# Grades per tool, in the order create, read, update, delete, publish (and unpublish).
# yes = verified live; partial = verified, part of the operation is missing; no = refused; none = not offered or not tested.
cms_rows:
  - label: Email
    m: email
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: the HTML of a block email is normalised on deploy'
  - label: Email template
    m: email-template
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: 'Published, but delivered on neither marketing channel'
  - label: Email fragment
    m: email-fragment
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: Image
    m: image
    cli: yes partial yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI retrieve leaves out images with no internal content name, without a warning (<a href="#g3">G3</a>)'
  - label: Document
    m: document
    cli: yes no yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only'
  - label: Audio
    m: audio
    cli: yes no yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only'
  - label: Brand
    m: brand
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: SMS and MMS
    m: sms
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: Push notification
    m: push-notification
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: In-app message
    m: in-app
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: RCS message
    m: rcs
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: WhatsApp session message
    m: whatsapp-session
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: Video
    m: video
    cli: yes no yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only'
  - label: Custom font
    m: custom-font
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: Contact card (VCF)
    m: vcf
    cli: yes no yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only'
  - label: 'Content block: landing page'
    m: web-fragment
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: 'Cannot be unpublished while a published page uses it'
  - label: Consent banner
    m: consent-banner
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: ''
  - label: Form handler
    m: form-handler
    cli: yes no yes yes none
    plugin: yes yes yes yes none
    note: 'Standard CLI: write-only. Publish refused without a Flow; one with a Flow was not tried'
  - label: Form
    m: form
    cli: yes yes yes yes none
    plugin: yes yes yes yes partial
    note: 'Publishes only with a Flow, which the CMS editor creates and which is not copied: in another org the copy cannot be published'
  - label: Landing page template
    m: landing-page-template
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: 'Publishing makes a public URL live'
  - label: Landing page
    m: landing-page
    cli: yes yes yes yes none
    plugin: yes yes yes yes yes
    note: 'Publishes only after its content blocks are published'
  - label: Preference page
    m: preference-page
    cli: none none none none none
    plugin: no no no no no
    note: 'Create it in the CMS editor. The plugin cannot find it; see Behaviour worth knowing'
  - label: Expression
    m: expression
    cli: yes no yes yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only'
  - label: Tracked link
    m: tracked-link
    cli: yes no none yes none
    plugin: yes yes yes yes yes
    note: 'Standard CLI: write-only; the Campaign must belong to the business unit of the workspace'
---

{% include verification-status.html title="The capability table and every behaviour listed here were verified live at API 68.0; the open points are listed under Gaps and open questions." %}

Marketing Cloud Next keeps emails, landing pages, messages, media and brands as content items in CMS workspaces. You can keep that content in Git and copy it into another workspace or another org, but the two routes that do it cover very different parts of it.

This page compares them type by type, lists the API behaviour that matters when you move content around, and names what has not been verified yet, each with a live probe that would settle it.

{% capture beyond_gui %}
These come with a file-based workflow. The CMS item pages that were checked offer Edit, Publish or Unpublish, Delete and Copy to another folder.

- **Copy content into another workspace or org.** The same files were deployed into a second workspace of the same org and into another org for all 23 plugin types, and back again. Every reference was rewritten to the destination: images, embedded content blocks, templates, the Campaign of a tracked link and the record type of a form.
- **Deploy several types in one command, in dependency order.** One deploy created an image, a content block, a template and a landing page; delete and unpublish took the page first.
- **Keep it in Git and redeploy only what changed.** A redeploy of unchanged files wrote nothing for every type.
{% endcapture %}
{% include callout.html type="tip" title="Beyond the CMS GUI" content=beyond_gui %}

## Which tool works for which type

<p class="crud-legend"><span class="crud-chip crud-chip--yes">yes</span> verified live · <span class="crud-chip crud-chip--partial">partial</span> verified, part of the operation is missing · <span class="crud-chip crud-chip--no">no</span> refused or not possible · <span class="crud-chip crud-chip--none">—</span> not offered or not tested</p>

Standard CLI means Salesforce CLI's own `sf project retrieve|deploy` with the Metadata API types `DigitalExperienceBundle` and `DigitalExperience` (a marketing workspace is the bundle `marketing/<workspace>`, an item is the member `marketing/<workspace>.<type>/<ApiName>`). Plugin means [`sf cms`](/tools/sf-plugin-cms/), which works through the Connect REST API (`/connect/cms/…`). The five letters are create, read, update, delete and publish (with unpublish); hover a letter for its grade. A grey letter means nobody has tried it yet, not that it fails.

{% assign ops = 'Create,Read,Update,Delete,Publish' | split: ',' %}
<table class="crud-overview crud-matrix">
  <thead><tr><th scope="col">Type</th><th scope="col"><code>-m</code> name</th><th scope="col">Standard CLI</th><th scope="col">Plugin</th><th scope="col">Note</th></tr></thead>
  <tbody>
  {%- for row in page.cms_rows %}
    <tr>
      <td>{{ row.label | escape }}</td>
      <td><code>{{ row.m }}</code></td>
      {%- assign tools = 'cli,plugin' | split: ',' %}
      {%- for tool in tools %}
      {%- assign grades = row[tool] | split: ' ' %}
      <td>
        {%- for op in ops -%}
          {%- assign grade = grades[forloop.index0] -%}
          {%- if grade == 'yes' -%}{%- assign word = 'yes' -%}{%- elsif grade == 'partial' -%}{%- assign word = 'partial' -%}{%- elsif grade == 'no' -%}{%- assign word = 'not possible' -%}{%- else -%}{%- assign word = 'not offered or not tested' -%}{%- endif %}
        <span class="crud-chip crud-chip--{{ grade }}" title="{{ op }}: {{ word }}">{{ op | slice: 0 }}</span>
        {%- endfor %}
      </td>
      {%- endfor %}
      <td>{{ row.note }}</td>
    </tr>
  {%- endfor %}
  </tbody>
</table>

Not in the table, because no tool handles them: **universal fragment** (its editor never finished loading, so no item exists to study), **WhatsApp template message** (needs a connected WhatsApp Business Account), **mobile inbox message** and **SMS DLT template** (listed as types, but not offered by the CMS UI of the test org). See [G7](#g7).

### The two routes side by side

| | Standard CLI (Metadata API) | Plugin (Connect REST API) |
|---|---|---|
| Content key of a new item | Taken from `_meta.json` when no other item uses it, so keys stay the same across orgs. A key that another item already uses is ignored without a message and a new key is assigned. | Always a new key; the plugin's files hold no keys and reference other items by type and API name. |
| References | An image is referenced by its API name. A missing image fails the whole deploy (in a dry run too), naming the item and the JSON path; in another org the image deployed in the same request is rolled back. | Resolved by API name in the destination before any write; a missing one is refused before anything is written (`REFERENCE_NOT_IN_DESTINATION`). |
| Publish state | No retrieved file carries one. Redeploying a published item keeps it published and adds a draft version: the status becomes Revised. | `sf cms publish` and `sf cms unpublish`; deploy never publishes. |
| Create, update, delete | Create and delete verified for the 23 types the plugin handles besides the preference page, update for all of them except the tracked link; each as a single member. A new item is a Draft at version 1.1, a redeploy with a changed title keeps the item and its key and raises the version to 1.2. `sf project deploy start -d <folder>`, `--metadata-dir` and `sf project delete source` work too; `sf project deploy quick` was refused after a successful validation. | `sf cms deploy` and `sf cms delete`. |
| Delete | A post-destructive-changes deploy or `sf project delete source`. The item is deleted with its API name renamed to `<name>-<ManagedContent ID>`, so the name is free again. `--purge-on-delete` made no difference. | `sf cms delete`. The item keeps its API name: a new item with that name is refused in that workspace. Removing the item from the recycle bin does not change that, still 18 minutes later. |
| Types it cannot read | Document, audio, video, contact card, expression, tracked link and form handler, even by exact member name; all of them can still be deployed and deleted. Images without an internal content name are left out too ([G3](#g3)). | None known; preference page reads were not tested. |
| Language variants | `content.json` holds the primary language; each other language is a file beside it (for example `de.json`) with only the parts that differ. | Only the default variant; an item with other variants is refused on delete. |

## Behaviour worth knowing

These were all observed through the Connect REST API at API 68.0 unless the item says otherwise.

- **Text comes back HTML-escaped.** A variant read escapes `<`, `>`, `&`, `"` and `'` in every string of the content body unless the request sends `X-Chatter-Entity-Encoding: false`. Create and variant updates store the body exactly as sent, with or without that header.
- **Names.** Create keeps the given API name and URL name and assigns a new content key. The same API name is accepted in another workspace of the same org and in another org. Items created in the UI have an API name equal to their content key. On create, `sfdc_cms:title` and `sfdc_cms:urlName` in the content body win over the title and URL name of the request.
- **Publishing needs no channel.** A publish with the variant IDs and the workspace ID delivers the item on the workspace's channels by type: emails, SMS and push on Marketing Messages; landing pages on Marketing Landing Pages; images and documents on both. An email template is published but delivered on neither.
- **Variants.** Publish and unpublish act only on the named variant. Salesforce refuses to unpublish the primary variant while another variant is still published. Deleting the only variant deletes the item; deleting a non-primary variant keeps the item. A translation variant needs the content key (an 18-character ID is refused) and accepts only translatable body fields.
- **Landing pages.** A page or template publishes only when the content blocks it embeds are published; Draft images and a Draft template do not block it. A content block used by a published page cannot be unpublished; a template can. A page names its template by the bare content key and embeds a content block as `@cms/<content key>`.
- **Forms and form handlers.** Salesforce refuses to publish one without an input component, and one with an input mapped to the Lead email without a Flow. A form with a Lead data source, two mapped fields and a Flow made with **New Flow** in the CMS editor (a Form-Triggered Flow) published through the plugin. The Flow is not part of the CMS item: a copy in another org is created as a Draft, and its publish is refused ("Add all fields, then add a flow."). A form cannot be deleted while its Flow exists; delete the Flow on its record page first. A form handler's body holds no field mapping, object or Flow. The record type of a form data source is an org-specific ID: a create in another org fails with the source org's ID and succeeds with the target's.
- **Preference pages** cannot be created through the API (`CONTENT_TYPE_DISABLED_FOR_API`). The CMS editor saves one once a channel and a subscription are picked; its API name is its content key. Such a page does not show up in SOQL on `ManagedContent` or `ManagedContentVariant`, so the plugin, which finds items that way, reports it as not found. Through Connect, by its variant ID, it can be read, published, unpublished and deleted (delete the variant); an update is refused (`CONTENT_TYPE_DISABLED_FOR_API`).
- **Media downloads need a standard CLI login.** Media files are downloaded from `/cms/media/…` with the CLI's access token. With a login through an External Client App that issues JWT-based access tokens, every download answered with the Salesforce sign-in page; after `sf org login web` with the standard CLI app the same downloads worked. Uploads work with both.
- **Tracked links.** The body holds a Campaign record ID, and the Campaign must belong to the workspace's business unit: Salesforce refuses one without that business unit ("Choose a campaign in the same business unit as this workspace"). Publishing adds a short link, a sequence ID and an expiry time to the body, and unpublishing removes them. A create that carries them stores none of them, and an update without them keeps the short link of a published link.
- **Media.** Image, document, audio, video, custom font and contact card are created and updated as multipart requests (parts `ManagedContentInputParam` or `ManagedContentVariantInputParam` plus `contentData`). An update that sends the same file with a new title still stores a new file version. A contact card needs `vcfData` in the body; Salesforce does not take it from the uploaded vCard. A custom font without `fallbackFont` gets `arial`. Every Standard CLI redeploy of audio, video, a contact card or a custom font with its file creates a new file record. Neither route checks the file itself: a 24-byte file that is no video was accepted as a video.
- **Size and count.** Videos of 1, 10, 50 and 100 MB were each accepted in one plugin deploy and stored byte for byte (the 100 MB one in about 40 seconds); larger files were not tried. One plugin deploy of 50 email fragments took 150 seconds, one item after the other, with no refusal or rate-limit answer.
- **Messages.** SMS, push, in-app, RCS and WhatsApp session bodies hold no sender, channel, app, keyword or account. Their only references are the data graph and, for in-app, an image. Publish changes only the publish state; no item page offers Send, Activate or Schedule.
- **Folders** (API 68.0 and later; folder listing answers `404` at 67.0). A folder is created one level at a time and listed at once. The folder list pages by page and page size and ends with an empty or short page.
- **Data graphs are not checked by Salesforce.** Create accepts an email whose data graph does not exist in the org, and one whose merge field reads an attribute the graph does not have, without a warning; the merge field then stays empty. An expression names its data graph without a data space. An expression update that names a field the graph does not have answers `500 UNKNOWN_EXCEPTION`, not a `400`.
- **Deleting a data graph that an email used** is refused ("Unable to delete Data Graph. Try again later."), and it stays refused after the email is deleted, with either route, and after a removal attempt from the recycle bin. A graph of the same shape that no email used was deleted at once. When the refusal ends is not known ([G9](#g9)).
- **The recycle bin.** Deleted items can be listed with SOQL that includes deleted rows (`sf data query --all-rows`, `IsDeleted = true`). Anonymous Apex `Database.emptyRecycleBin` removes an email fragment by ID; deleted emails have no recycle bin entry, with either route. A removed row still shows up as deleted in that query. Removing an email fragment from the bin did not free its API name.
- **Block email HTML** is normalised by both routes: style declarations are lowercased and compacted, and a table gets a `<tbody>`. Duplicate `rel` tokens were removed by the Standard CLI; the plugin's Connect create removed them in paragraph text but kept them in raw HTML. An emailFragment, emailTemplate and landingPage were stored exactly as in the file.
- **Email previews lag behind a publish.** After an email is deployed and published, the email preview API (`previewEmail`) still renders the previously published version for 45 to 70 seconds (measured on 2026-11-22, 11-23 and 11-25). In CI, put a build marker into the email and poll the preview until the marker shows up (for example 10 tries, 15 seconds apart) before trusting it. If the old version is still there after that, the new version failed to render; a render error can also come back as HTTP `500` without a message. Landing page previews were not measured.
- **Slow saves still land.** Saving a larger email took 40 to 70 seconds. A save that got no answer in time was applied later anyway, so give saves a long timeout (the plugin's `--timeout 300` was used) and do not save the same item again until the earlier save is confirmed. During these runs a save was once refused with "You can't save this content because you don't have permission to edit it"; whether a pending save or something else caused it is not proven.
- **Flows** store a message as `marketing--<workspace>.sfdc_cms__email--<ApiName>`. A flow deployed right after `sf cms publish` returned already saw the email as published.
- **Business units.** The workspace list of the CMS can be filtered by business unit; in an org without business units the filter is ignored. Which workspace is a business unit's default is shown only in Setup: two workspaces of the same business unit looked the same in the Connect workspace list and detail, the Standard CLI workspace files and the `BusinessUnit` and `ManagedContentSpace` objects.

## Across workspaces, orgs and data spaces

| Move | Plugin | Standard CLI |
|---|---|---|
| Another workspace, same org | Verified for all 23 types: create, then a redeploy that writes nothing. | Not tested. |
| Another org | Verified for all 23 types, in both directions: create, update, publish (except forms), unpublish, delete. References point at the destination's items and records; a Campaign is found by name, a record type by object and developer name. | Verified for an image and the email that uses it. The items keep the source content keys; the image gets a new file record in the target. |
| Another data space | Verified for emails, email fragments, SMS, push, RCS, WhatsApp session messages and a landing page with its template and content block, deployed into another business unit's workspace of the same org with `--dataspace` and `--allow-cross-dataspace`: the data graph, data space and merge fields were renamed, and a redeploy reported every item unchanged. The email editor showed the merge fields; the editor was not opened for the other types. In-app messages: not tested ([G8](#g8)). | Not tested. |

What the plugin checks before it writes, so a copy does not silently lose its personalisation: the destination org must have the data space and the data graph, and the graph must have every attribute a merge field reads (`DATA_GRAPH_NOT_IN_DESTINATION`, `DATA_GRAPH_ATTRIBUTE_MISSING`). Both refusals were seen live in another org, in `default` and in a second data space, with only reads sent. Once the missing field was added to the target graph with [sf-plugin-data](/tools/sf-plugin-data/), the same files were created there with their data graph and merge fields unchanged. A merge field without a counterpart in the target data space (`CROSS_DATASPACE_UNRESOLVED`) and a cross-data-space deploy without the flag (`CROSS_DATASPACE_NOT_ALLOWED`) were refused before any write. All plugin codes are in the plugin's [error code list](https://github.com/JoernBerkefeld/sf-plugin-cms/blob/main/docs/errors.md).

How data spaces name things is explained on the [Data Spaces](/next/data-spaces/) page.

<a id="gaps"></a>

## Gaps and open questions

{% include callout.html type="warning" title="Not verified yet" content="Everything below is unknown or only partly known. Do not rely on it until a probe has settled it. The probes are suggestions: run them only in an org where you may write, with items you created for the test." %}

Research runs in the main test org; a second org is used only as the target of cross-org copies. Each probe names the item kinds it creates; delete them afterwards with the same tool.

| # | What is unknown | Suggested probe | Settled when |
|---|---|---|---|
| <a id="g3"></a>G3 | Why some items have no internal content name (`contentFqn` is empty in a Connect read), which hides them from a Standard CLI retrieve. Two 70-byte PNGs created through the API on the same day differ in it; kind, folder, status, size and creator do not decide it. | Main org: create test images through the plugin, the Standard CLI and the CMS UI, read each through Connect and retrieve each by member name. | A create route or setting that always leaves the field empty. |
| <a id="g7"></a>G7 | Universal fragment, WhatsApp template message, mobile inbox message and SMS DLT template have no item to study. | Main org: try the universal fragment editor again. The other three need an org that offers them (WhatsApp templates need a connected business account). | An item exists and a raw variant read shows its body. |
| <a id="g8"></a>G8 | Cross-data-space copy of an in-app message, which needs its image in the target workspace. | Main org: a test in-app message with an image, both deployed in one `sf cms deploy --dataspace <space> --allow-cross-dataspace` run into the other business unit's workspace. | The stored data graph and merge fields carry the target space's names. |
| <a id="g9"></a>G9 | When a data graph that an email used can be deleted again. | Main org: retry `sf data360 delete -m data-graph:<name>` on the two test graphs left from the probe, daily. | The day the delete succeeds, or a Salesforce statement on the dependency. |
| <a id="g12"></a>G12 | API versions other than 68.0. Email fragments were also verified at 67.0, where folder listing answers `404`. | Main org, read-only: `sf cms retrieve -m email --api-version 66.0` and `67.0`, compared with the files of 68.0. | Identical files, or the first version that differs or fails. |
| <a id="g13"></a>G13 | Media files larger than 100 MB, and request limits beyond 50 items per deploy. | Main org: deploy test videos of 250 and 500 MB, and one deploy with a few hundred small test items. | The first size or count Salesforce refuses, with its error. |

Settled by the probes of 2026-11-25: Standard CLI create, update and delete for the types the plugin handles, a tracked link with a Campaign, block-email normalisation by the plugin, whether removing an item from the recycle bin frees its name (it does not), which channel delivers which type, the default workspace of a business unit (no API shows it), language variants in Standard CLI files, publishing a form with a Flow, preference pages made in the CMS editor, and media downloads (they need a standard CLI login). The results are in the sections above.
## Before you start

- **Plugin:** install and sign-in steps, flags and every error code are on the [sf-plugin-cms](/tools/sf-plugin-cms/) page. Run `--preview` before every deploy, delete, publish and unpublish.
- **Standard CLI:** needs a project folder with `sfdx-project.json`, as described on [Data Cloud DevOps](/next/data-cloud-devops/#project-folder). Deploy single `DigitalExperience` members, not the whole workspace bundle: only single members were tested.
- **Data graphs** used by emails and messages must exist in the destination first. Deploy them with [sf-plugin-data](/tools/sf-plugin-data/); see [Data Cloud DevOps](/next/data-cloud-devops/).
- Deleted items stay in the recycle bin. With the plugin, their API name stays taken in that workspace.
