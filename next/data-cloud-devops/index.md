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
  - path: next/data-cloud-devops/data-lake-object.md
    label: DLOs
    anchor: data-lake-object-dlo-customobject-dll
    failures: 'Standard-CLI create of the tested full schema fails; the plugin creates through the native API.'
  - path: next/data-cloud-devops/data-model-object.md
    label: DMOs
    anchor: data-model-object-dmo-customobject-dlm
    failures: 'A changed field type is accepted (HTTP 200) but silently ignored. API 60.0 returns 404 for every method.'
  - path: next/data-cloud-devops/dlo-dmo-mapping.md
    label: DLO-DMO-mapping
    anchor: dlo-to-dmo-mapping-objectsourcetargetmap
    failures: 'A direct native DELETE of a non-last mapping can remove DMO fields.'
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
  - path: next/data-cloud-devops/segments.md
    label: Segments
    anchor: read
    failures: '—'
  - path: next/data-cloud-devops/segment-members.md
    label: Segment members
    anchor: segment-members-runtime-data-not-metadata
    failures: '—'
  - path: next/data-cloud-devops/data-graphs.md
    label: Data Graphs
    anchor: operational-data-graphs
    failures: '—'
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

{% include crud-legend.html %}

The ratings cover usable workflows supplied in this guide, not every observed operation. DMO creation and DLO native API68 standalone definition workflows are supplied on their resource pages within their stated scopes; other observations remain background evidence. Some metadata deletion examples depend on integration-generated manifests rather than a self-contained workflow. Write permissions, dependencies and processing warnings still apply.

<table class="crud-overview">
  <thead><tr><th scope="col">Configuration or runtime data</th><th scope="col">Read</th><th scope="col">Create</th><th scope="col">Update</th><th scope="col">Delete</th><th scope="col">Verified failures</th></tr></thead>
  <tbody>
  {% for row in page.crud_rows %}
    {% assign resource = site.pages | where: 'path', row.path | first %}
    {% if resource %}
      {% unless resource.discoverable == false or resource.discoverable == 'false' or resource.sitemap == false or resource.sitemap == 'false' or site.data.undiscoverable_urls[resource.url] %}
    <tr>
      <td><a href="{{ resource.url | relative_url }}#{{ row.anchor | escape }}">{{ row.label | escape }}</a></td>
      <td>{% include crud-cell.html capability=resource.crud.read %}</td>
      <td>{% include crud-cell.html capability=resource.crud.create %}</td>
      <td>{% include crud-cell.html capability=resource.crud.update %}</td>
      <td>{% include crud-cell.html capability=resource.crud.delete %}</td>
      <td>{{ row.failures | default: '—' | markdownify }}</td>
    </tr>
      {% endunless %}
    {% endif %}
  {% endfor %}
  </tbody>
</table>

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
- An object the file format cannot represent is saved as-is, with a warning, at its normal path: `{schemaVersion, kind, identity, verbatim: {reason, native}}`, where `native` is the org's answer and `reason` the code of the check it did not pass (or `UNMODELLED_RESPONSE`). Examples: streams that are not Ingestion API streams, segments built in the UI or without DBT models, mappings that are not DLO to DMO, Visual Builder calculated-insight drafts, system or packaged data transforms, and data graph schedules the format does not hold.
- Deploy skips as-is files in a folder or Git range with a warning. Naming one refuses with `VERBATIM_NOT_DEPLOYABLE`, and so does publish. Deleting an as-is file in a Git range deletes the object by type and name, with the usual checks.
- An object still fails when the read fails (HTTP or connection error), when it does not exist, when the answer names another object or data space, or when the org was caught mid-change or a list was incomplete.

Lists are read page by page until the org has no more, and an unusable entry is skipped with a warning.

### Deletion examples

Some standard-CLI deletions on the resource pages use a destructive-change manifest (an XML file naming the members to delete, applied with `--post-destructive-changes`). They describe the lower-level mechanism and are not self-contained workflows: use them only with files whose ownership and dependencies you have checked, keep those files temporary and out of Git, and never delete a shared or populated object to make an example work. The plugin's `delete` command needs no manifest.

## Data Spaces

A data space is a partition of one Data Cloud org; each space has a name and, for custom spaces, a short `prefix` (for example `ds2`). Every org has a `default` space. The tools record the space in different places:

| Tool | How it handles the space |
|---|---|
| Salesforce CLI (source format) | No data-space folders and no DataSpace metadata type. The space is a field inside some files: `mktDataModelAttributes/dataSpaceName` in a DMO, `dataSpaceDefinitionDevName` in a data kit. DLO files carry no space. |
| Metadata API | Uses the same fields. A DMO created with `dataSpaceName` set to a custom space lands in that space, under the API name you gave it. |
| Connect API (`/ssot/…`) | Takes the space in the body (`dataSpaceName` for DMOs, `dataspaceInfo` for DLOs) and returns it on reads. Many routes ignore the `dataspace` query parameter; list routes for mappings, relationships and segments do filter by it. `GET /ssot/data-spaces` lists the spaces and their prefixes. |
| sf-plugin-data | Works in the default space. An object from another space is saved as-is and is not deployed. |
| Data kits | The package does not fix the space; you pick the target space in the separate data-kit deploy step. |

**Names are unique per org, not per space**, for DLOs, DMOs, calculated insights, data transforms and data graphs: creating a second object with an existing name in another space is refused. The prefix is not added to their API names either. A DMO named `Example__dlm` in a custom space keeps exactly that name.

**Segments are the exception.** A segment in a custom space is stored as `<prefix>_<Name>` (for example `ds2_Example`), so the same segment name can exist once per space. A name that already starts with the prefix is not prefixed twice.

**Generated names** for mappings, relationships and Ingestion API data streams are created by Salesforce and get no prefix, so they cannot clash between spaces.

**DLOs and several spaces.** A DLO can belong to more than one space, and some standard DLOs do. Creating a DLO with an empty or missing `dataspaceInfo` puts it in `default`, so a new DLO always has a space. The DLO `PATCH` route does not accept `dataspaceInfo`; membership of a space is listed at `/ssot/data-spaces/<name>/members`, which accepts `GET`, `PUT` and `DELETE`.