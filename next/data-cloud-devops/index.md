---
layout: page
title: "Data Cloud DevOps"
description: "Data Cloud metadata commands, default source-format files, illustrative responses and supported lifecycle limits for Marketing Cloud Next."
parent: Next
parent_url: /next/
permalink: /next/data-cloud-devops/
redirect_from:
  - /next/data-cloud-cli/
verification: verified
platforms:
  - next
crud_rows:
  - path: next/data-cloud-devops/data-stream-definition.md
    label: Data Streams
    anchor: data-stream-configuration-datastreamdefinition
    failures: '—'
    api_note: 'Ingestion API and Salesforce CRM streams'
    plugin_note: 'other connectors than Ingestion API and Salesforce CRM are untested and sent as written; refresh mode and DLO setting changes are refused: Salesforce ignores them'
  - path: next/data-cloud-devops/data-lake-object.md
    label: DLOs
    anchor: data-lake-object-dlo-customobject-dll
    failures: 'Standard-CLI create of the tested full schema fails; the plugin creates through the native API.'
    cli_note: 'create gives a disabled definition only'
  - path: next/data-cloud-devops/data-model-object.md
    label: DMOs
    anchor: data-model-object-dmo-customobject-dlm
    failures: 'A changed field type is accepted (HTTP 200) but silently ignored. API 60.0 returns 404 for every method.'
    api_note: 'no field removal; a changed field type is accepted but silently ignored'
    plugin_note: 'never changes generated fields except their label on deploy'
  - path: next/data-cloud-devops/dlo-dmo-mapping.md
    label: DLO-DMO-mapping
    anchor: dlo-to-dmo-mapping-objectsourcetargetmap
    failures: 'A direct native DELETE of a non-last mapping can remove DMO fields.'
    api_note: 'a direct native DELETE of a non-last mapping can remove DMO fields'
    plugin_note: 'the file holds the label, changed through the Metadata API'
  - path: next/data-cloud-devops/field-source-target-relationship.md
    label: Relationships
    anchor: field-relationship-fieldsrctrgtrelationship
    failures: '—'
  - path: next/data-cloud-devops/data-source-object.md
    label: Source object definitions
    anchor: source-object-configuration-datasourceobject
    failures: '—'
  - path: next/data-cloud-devops/calculated-insights.md
    label: Calculated insights
    anchor: read
    failures: '—'
  - path: next/data-cloud-devops/data-transforms.md
    label: Data Transforms
    anchor: read
    failures: 'An update replaces the whole transform: a value left out is reset. PATCH answers 405.'
    cli_note: 'no Metadata API type; a hidden DataTransform lists names only'
    api_note: 'an update replaces the whole transform: a value left out is reset; PATCH answers 405'
    plugin_note: 'the file holds the schedule; a deployed schedule makes the transform run in the target org; Salesforce refuses writes to system transforms'
  - path: next/data-cloud-devops/segments.md
    label: Segments
    anchor: read
    failures: '—'
    cli_note: 'definitions only, never a live segment'
    plugin_note: 'the file holds the schedule; a deployed schedule makes the segment publish in the target org; Salesforce refuses to clear a DBT schedule'
  - path: next/data-cloud-devops/segment-members.md
    label: Segment members
    anchor: segment-members-runtime-data-not-metadata
    failures: '—'
    api_note: 'read = member export, update = publish; runtime rows have no create or delete'
  - path: next/data-cloud-devops/data-graphs.md
    label: Data Graphs
    anchor: operational-data-graphs
    failures: '—'
    plugin_note: 'join changes are refused: Salesforce keeps the old join'
  - path: next/data-cloud-devops/identity-resolution.md
    label: Identity Resolution
    anchor: operational-identity-resolution
    failures: '—'
  - path: next/data-cloud-devops/data-kit-object-template.md
    label: Kit templates
    anchor: kit-template-datakitobjecttemplate
    failures: '—'
  - path: next/data-cloud-devops/data-package-kit-definition.md
    label: Kit definitions
    anchor: kit-definition-datapackagekitdefinition
    failures: '—'
  - path: next/data-cloud-devops/data-package-kit-object.md
    label: Kit membership
    anchor: kit-membership-datapackagekitobject
    failures: '—'
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

You can use Salesforce CLI to download quite a bit of your Data Cloud (Data 360) configuration. Making changes is a little less straightforward: some commands work with saved definitions, while others work with the actual running component.

This page explains the difference and shows the commands next to the files and responses you can expect. Start with retrieving an existing component. Only move on to create, update or delete when you have checked the prerequisites for that section.

<a id="beyond-the-gui"></a>

{% capture beyond_gui %}
These come with the plugin's file-based workflow, which the UI's per-object wizards and dialogs do not offer:

- **Retrieve many components in one command** and keep the files in Git (plugin). One `sf data360 retrieve -m data-stream -m data-transform -m data-graph -m relationship` saved 3,878 items without an error.
- **Deploy only what changed in a Git range** (plugin `--changed-since`). A range holding a data stream, a DMO and a mapping ran in dependency order and wrote nothing because nothing differed.
- **Deploy or delete related objects of several types in one command**, in dependency order (plugin). One deploy created two DLOs, two DMOs, two mappings and a relationship; one delete removed two data graphs before the identity resolution ruleset they were built on.

Type-specific items, each checked against the UI: [relationship label, cardinality and source field changes](/next/data-cloud-devops/field-source-target-relationship/#beyond-the-gui) and [SQL (DBT) segments](/next/data-cloud-devops/segments/#beyond-the-gui).
{% endcapture %}
{% include callout.html type="tip" title="Beyond the Data Cloud GUI" content=beyond_gui %}

<!-- Keep this capability table, all linked type-page details and their visible last-updated timestamps synchronized with every substantive update across this guide. -->

Each linked page covers one logical resource, with Retrieve, Create, Update and Delete sections. Prefer a dedicated standard CLI command when the verified workflow provides one; otherwise use a native API through `sf api request rest`, or the explicitly identified facade where native support is not qualified. Using Salesforce CLI as a request runner does not make an API workflow standard resource-specific CLI support. XML definitions and runtime state are views of the same resource, not separate feature types.

## Which tool works for which type

<p class="crud-legend"><span class="crud-chip crud-chip--yes">yes</span> usable workflow · <span class="crud-chip crud-chip--partial">partial</span> part of the operation is missing or refused · <span class="crud-chip crud-chip--no">no</span> not supported · <span class="crud-chip crud-chip--none">—</span> not offered or not tested</p>

Standard CLI means Salesforce CLI's own `sf project retrieve|deploy` (Metadata API). API means direct REST calls. Plugin means `sf data360`. The four letters are create, read, update and delete; hover a letter for its grade. Grades come from each type page and cover the usable workflows supplied there, not every observed operation; write permissions, dependencies and processing warnings still apply. The plugin grade follows the plugin README's definition: a refusal or gap in the plugin itself is partial; Salesforce limits, API-version and data-space limits and verification breadth are not.

{% include crud-tool-matrix.html %}

### Behaviour worth knowing

- **Segment side objects.** Creating a segment makes Salesforce add two Segment Membership DMOs (`<DMO>_SM_<ms>__dlm` and `_SMH_`) with relationships, in the segment's space and without a prefix. They stay after the segment is deleted.
- **The default space can be renamed** but not deleted. Every other space has a prefix (for example `ds2`) that shows up on segment names and on the copies of standard DMOs in that space.
- **Delete quirks.** A segment deletes by name only (by ID: `405`). A DMO deletes by name only. A data stream's create response ID is not the record ID its DELETE needs. Deleting a DMO's only mapping is refused (`500`); deleting the DMO removes it.
- **DLO delete may need repeating.** In two separate runs, a DLO used by a just-deleted transform answered `204` to DELETE but then read `ERROR` for about 19 minutes; a second DELETE removed it.
- **Transform not found.** Its `404` text says a transform in another space is found as `<prefix>_<name>`. That is wrong: a transform created in a custom space is stored without a prefix, read by its plain name, and `<prefix>_<name>` answers `404`.
- **A DLO's spaces change on the space, not on the DLO.** A DLO `PATCH` with `dataspaceInfo` or `dataSpaceInfo` is refused as an unrecognized field, and `PUT` on the DLO answers `405`. `PUT /services/data/vXX.0/ssot/data-spaces/<space>/members` with `{"members":{"members":[{"memberName":"<Name>__dll"}]}}` adds the DLO (a flat `members` list answers `400`); it answers `PROCESSING` and the DLO reads both spaces a few seconds later, under the same name. `DELETE …/data-spaces/<space>/members?memberNames=<Name>__dll` removes it from that space and keeps the DLO; `DELETE …/members/<name>` answers `405`.
- **Generated DMOs are open to writes, and their fields are not protected.** On the DMOs that identity resolution and data graphs create, Salesforce accepts label, description and custom-field changes, and also relabels or deletes their own system and standard fields. It refuses a mapping onto them (`400` "Unsupported DMO Creation Type used for mapping") and deletes them only after their ruleset or graph is gone (`412` before).
- **System transforms cannot be changed.** The transform a data graph creates reads as one hidden `STL_HIDDEN` definition. Salesforce refuses a `PUT` of it (`400`), a schedule change and a delete (`403`), and a create from its file (`400`). A graph built on a DMO without a mapping leaves this transform in `ERROR` for good.
- **Transform schedules have their own route.** `PUT …/data-transforms/<name>/schedule` takes `Hourly`, `Daily` or `None` (`Weekly` is refused), only while the transform is active; `{"frequency":"None"}` turns it off, and `DELETE` on the route answers `405`. The `GET` answer cannot be sent back as is.
- **Graph edits can only add.** A data graph `PUT` that removes a field or related object, swaps a related object or changes the root is refused (`400`). A changed join answers `200` and rebuilds the graph but keeps the old join. A graph cannot be renamed.
- **Segment schedules.** A weekly schedule (exactly one day) is set on create or by `PATCH` through `publishScheduleInfo` plus a start date; a `PATCH` without schedule keys keeps it. A UI segment's schedule can be cleared; a DBT segment's schedule cannot (every clearing body answers `400`), only deleting the segment removes it. Segments take no `parameters` input. Lookbacks such as 7, 30 or 45 days and 1 year are accepted; 0 days and 400 days are refused.
- **Ingestion API stream updates.** Salesforce refuses (`400`) a mapping retarget, removal, source or return-type change and targets `KQ_…` or `DataSource`. It answers `200` but changes nothing for refresh mode, category, event time field, DLO label and source fields. It accepts additive mappings from the primary key, with a Number type, and in the create body, and it stores an additive mapping from a label that names no event field without checking it. Only UPSERT creates.
- **Waterfall children.** A Waterfall's child segments go into `includeCriteria` as `{"type":"Waterfall","segments":[{"type":"NestedSegment","segmentId":"<child definition id>"}]}`; a description-only `PATCH` keeps them. Every `PATCH` of an Einstein GPT segment is refused (`400`).

### What this means for the plugin

- Every type works in any data space. Two files in different spaces can never carry the same name, so files stay in one folder per type and the space is a field in each file: a top-level `c__dataSpace`, a list for DLOs and data streams and a single name for every other type.
- `--dataspace` names the run's space (`default` when omitted). A file of another space is refused, never skipped, and the org's spaces are read once per command so an unknown space is refused before any other request.
- A DLO's file lists all its spaces. Deploy adds a space through the space's members route, sending the complete member list it has just read; a member list that does not add up is refused. Removing a space needs `--allow-dataspace-removal`, and a DLO that still belongs to another space is not deleted.
- Names are kept as Salesforce stores them: `ds2_<Name>` for segments, `ds2_Individual_<id>` for rulesets, `ds2_Individual__dlm` with fields like `FirstName__c` for standard DMO copies. A segment or ruleset file without the prefix is refused before any write. The first mapping onto a standard DMO copy that does not exist yet is retried once with the default spelling.
- Reads by name cannot name a space, so the plugin checks the space the answer names before every write and delete.
- See [Data Spaces](/next/data-spaces/) for how each route treats the space.

## Before you start

The resource pages use two kinds of commands, and each example says which one it is:

- **Standard CLI:** Salesforce CLI's own `sf project …` and `sf api request rest` commands.
- **Plugin:** the `sf-plugin-data` commands `sf data360 retrieve|deploy|delete|publish`.

Both need the same setup: Salesforce CLI, a login for an org with Data Cloud enabled, and a project folder. Run commands in a terminal (PowerShell on Windows, Terminal on macOS/Linux), one line at a time, and check each result before the next. Replace the placeholders `SOURCE_ALIAS` and `TARGET_ALIAS` with your own org aliases; check the org and your permission before any deploy, POST, PATCH or DELETE. The detailed examples live on the resource pages, so only one example per command kind is shown here.

### Install

Install [Salesforce CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm) (it needs a supported Node.js LTS when installed through npm), then check it:

```sh
sf --version
```

The plugin is only needed for the plugin examples. Its install steps, supported Node.js versions and command reference are in the plugin's README; after installing, `sf data360 --help` lists its commands.

### Log in

An **alias** is a local nickname for an authenticated org. Replace `LOGIN_URL` with the HTTPS login URL for your org:

```sh
sf org login web --instance-url 'LOGIN_URL' --alias data-practice
sf org list
```

Check the alias, username and connection status in the list. If you only read, one login is enough.

### Project folder

A project is a folder on your computer, not a new org. Create an empty folder with `force-app/main/default/` inside it and an `sfdx-project.json` beside `force-app`:

```json
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "namespace": "",
  "sourceApiVersion": "65.0"
}
```

Run the commands from that folder. The standard CLI writes retrieved XML under `force-app/main/default/`. The plugin writes its JSON files under `data360/` (for the plugin retrieve flags, see its README and the resource pages).

### First retrieval

Standard CLI, API 65.0 and the default dataspace. Use the exact `__dlm` name of your DMO instead of `Customer__dlm`:

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

`--metadata` selects `type:name`; `--wait 5` waits up to five minutes. Plugin equivalent, using the plugin's `type:Name` selector (here a DMO):

```sh
sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS
```

Append `--json` to either command for structured output. Salesforce decides what a write is allowed to do; read the limits on the resource page before create, update or delete.

### What retrieve saves

The plugin's retrieve never refuses an object because the org returns something the plugin does not model, and one failing object does not stop the others. A retrieve without `-m` saves all DLOs, DMOs and mappings; every other type is retrieved only when `-m` names it.

- A key the plugin does not know stays in the saved file. Deploy checks files strictly and refuses that file, naming the key path. Unknown keys in a data stream's read-only `observed` section do not block deploy.
- An object the file format cannot represent is saved as-is, with a warning, at its normal path: `{schemaVersion, kind, identity, verbatim: {reason, native}}`, where `native` is the org's answer and `reason` the code of the check it did not pass (or `UNMODELLED_RESPONSE`). Examples: streams whose read names no connector type (or the Ingestion API connector with another stream type), segments with parameters, mappings that are not DLO to DMO, Visual Builder calculated-insight drafts, data transforms with both `definition` and `definitions`, and data graph schedules the format does not hold.
- Deploy skips as-is files in a folder or Git range with a warning. Naming one refuses with `VERBATIM_NOT_DEPLOYABLE`, and so does publish. Deleting an as-is file in a Git range deletes the object by type and name, with the usual checks.
- An object still fails when the read fails (HTTP or connection error), when it does not exist, when the answer names another object or data space, or when the org was caught mid-change or a list was incomplete.

Lists are read page by page until the org has no more, and an unusable entry is skipped with a warning.

### Deletion examples

Some standard-CLI deletions on the resource pages use a destructive-change manifest (an XML file naming the members to delete, applied with `--post-destructive-changes`). They describe the lower-level mechanism and are not self-contained workflows: use them only with files whose ownership and dependencies you have checked, keep those files temporary and out of Git, and never delete a shared or populated object to make an example work. The plugin's `delete` command needs no manifest.

## Data Spaces

A data space is a partition of one Data Cloud org. How names, membership and each API route behave per space, and where each tool records the space, is on the [Data Spaces](/next/data-spaces/) page.
