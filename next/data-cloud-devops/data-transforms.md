---
layout: page
title: "Data Transforms"
description: "Data transforms through the native API and sf-plugin-data: the standard CLI has no transform type, the API reads, creates, replaces and deletes them, and the plugin keeps them as files."
parent: Data Cloud DevOps
parent_url: /next/data-cloud-devops/
permalink: /next/data-cloud-devops/data-transforms/
redirect_from:
  - /next/data-cloud-cli/data-transforms/
verification: verified
operation_tabs: true
platforms:
  - next
crud:
  read: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "yes", plugin: "partial" } }
  create: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "yes", plugin: "yes" } }
  update: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "yes", plugin: "partial" } }
  delete: { status: "yes", methods: [api, plugin], method_statuses: { cli: "no", api: "yes", plugin: "partial" } }
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

This badge does not verify untested writes or general CRUD support.

A **data transform** reads one or more objects, changes the rows and writes them to output objects. A **batch** transform runs on a schedule or on demand; a **streaming** transform processes rows as they arrive. The definition is either an **STL** node graph (what the visual editor saves) or **DCSQL** (a SQL statement).

**Example used in every chapter:** `CustomerCopy`, a batch STL transform that copies `Id__c` and `Name__c` from the DLO `CustomerSource__dll` to the existing DLO `CustomerCopy__dll`, in the default data space. Check your own objects and fields first.

{% include crud-summary.html %}

**Plugin qualification:** The plugin has `sf data360` commands for transform definitions, at API 68 (`auto` or `68.0`) in the default data space. Update and delete refuse system transforms and transforms with a namespace, such as the ones a data graph creates; retrieve saves them as-is with a warning, and deploy does not send that file. The plugin keeps the schedule out of the file and never changes it, and it never starts or cancels a run.

**Plugin flags used on this page** (`sf data360 retrieve`, `deploy` and `delete`): `-m data-transform:Name` (or a bare `-m data-transform` on retrieve), `--source-dir` / `-d` and `--changed-since <git-ref>` to select files for deploy, `--preview` (read-only for deploy and delete) and `--keep-local-files` (delete only). No flag acknowledges processing.

## Read

{% capture read_plugin %}
Saves transforms as files in your project. A bare `-m data-transform` retrieves every transform the API lists (20 per page); `-m data-transform:Name` retrieves one:

```sh
sf data360 retrieve -m data-transform:CustomerCopy -o SOURCE_ALIAS
sf data360 retrieve -m data-transform -o SOURCE_ALIAS
```

The file is `data360/dataTransforms/CustomerCopy.dataTransform.json`:

```json
{
  "schemaVersion": 1,
  "kind": "data-transform",
  "apiVersion": "68.0",
  "definition": {
    "name": "CustomerCopy",
    "label": "Customer Copy",
    "description": "Copies customer rows",
    "type": "BATCH",
    "dataSpaceName": "default",
    "fullRunFrequency": "DAILY",
    "definition": { "type": "STL", "version": "68.0", "nodes": { "LOAD0": { "…": "…" }, "OUT0": { "…": "…" } } }
  }
}
```

The file holds the transform as Salesforce returns it: name, label, description, type, data space, full-run frequency, and the definition (`definition`, or `definitions` for one entry per output). STL node graphs, DCSQL manifests, several outputs, the write mode and the output object definitions stay as Salesforce returns them. Left out are the schedule and the record ID, dates and status of each output object. A transform built in the Data Cloud UI has no `dataSpaceName` and uses `definitions`; its file keeps that form.

A system transform, or one with a namespace from a package, is saved as-is with a warning, and deploy does not send that file.
{% endcapture %}
{% capture read_connect %}
### Native API68 read

Lists the transforms, reads one by name (or by record ID) and reads its schedule. Nothing in the org changes.

```sh
sf api request rest '/services/data/v68.0/ssot/data-transforms' --target-org SOURCE_ALIAS --method GET --include
sf api request rest '/services/data/v68.0/ssot/data-transforms/CustomerCopy' --target-org SOURCE_ALIAS --method GET --include
sf api request rest '/services/data/v68.0/ssot/data-transforms/CustomerCopy/schedule' --target-org SOURCE_ALIAS --method GET --include
```

The list answers `{ "currentPageUrl", "dataTransforms": [], "errors": [], "totalSize" }`, 20 transforms per page, newest first. It includes system transforms, such as the hidden ones a data graph creates.

The item read holds everything the transform input holds, plus `id`, `creationType` (`CUSTOM` for your own), `status`, `lastRunStatus`, the dates, `actionUrls` for run, cancel, retry and refresh-status, and for each output object its ID, status and the `keyQualifierField` of each field. A transform without a schedule reads `{ "frequency": "None", "nextScheduledDate": null, "time": null, "type": "None" }` from the schedule route.
{% endcapture %}
{% include operation-tabs.html id="transform-read" label="Read" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7 has no DataTransform metadata type: sf project retrieve start stops with a RegistryError. sf org list metadata lists the names of user-built transforms only." split_api=true metadata_state="blocked" metadata_reason="At API 68.0, describeMetadata lists no transform type. listMetadata on DataTransform lists names of user-built transforms, but readMetadata returns only the name and retrieve returns no file." connect_state="available" connect_reason="Native API68 list, read by name or record ID, and schedule read." connect_body=read_connect plugin_state="available" plugin_reason="Partial: retrieves every transform or one by name, but the file leaves out the schedule, which Salesforce returns through its own route." plugin_body=read_plugin %}

## Create

{% capture create_plugin %}
Deploy creates the transform when the org has none of that name. Preview first; the preview only reads:

```sh
sf data360 deploy -m data-transform:CustomerCopy --preview -o TARGET_ALIAS
sf data360 deploy -m data-transform:CustomerCopy -o TARGET_ALIAS
```

Deploy also selects the file with `--source-dir`, by file or folder, or through `--changed-since`. One deploy takes several transforms, alone or beside other families.

Deploy reads the complete transform list and looks for the name in the file, ignoring letter case. No match creates the transform with one POST, after Salesforce's validation. Two or more matches are refused with `TRANSFORM_TARGET_NOT_RESOLVED`, and a match whose name differs only in letter case is refused with `TRANSFORM_IDENTITY_MISMATCH`, both before any write. The result reports `TRANSFORM_SERVER_PROCESSING` while Salesforce still processes the new transform.

The plugin only checks that the file is plain JSON with a valid name, exactly one of `definition` and `definitions`, only keys the transform input takes, and the default data space when one is named. Everything else is sent as written and Salesforce decides. Salesforce refuses, for example, an STL output DLO that does not exist, an output that is also the source DLO, and a streaming transform with an STL definition. A DCSQL definition creates the output DLOs it declares; that DLO stays when the transform is deleted.

Transforms run in their own phase, one after another, after streams and the native DLO, DMO, mapping and relationship items, and before identity resolution, calculated insights, segments and graphs. The first transform that does not succeed stops the run.
{% endcapture %}
{% capture create_connect %}
### Native API68 create

Creates the transform from a JSON body. Check that the name is free and that the source and output DLOs exist.

```sh
sf api request rest '/services/data/v68.0/ssot/data-transforms' --target-org TARGET_ALIAS --method POST --body '@transform-create.json' --include
```

Save `transform-create.json`:

```json
{
  "name": "CustomerCopy",
  "label": "Customer Copy",
  "description": "Copies customer rows",
  "type": "BATCH",
  "dataSpaceName": "default",
  "definition": {
    "type": "STL",
    "version": "68.0",
    "nodes": {
      "LOAD0": {
        "action": "load",
        "parameters": { "dataset": { "name": "CustomerSource__dll", "type": "dataLakeObject" }, "fields": ["Id__c", "Name__c"] },
        "sources": []
      },
      "OUT0": {
        "action": "outputD360",
        "parameters": {
          "name": "CustomerCopy__dll",
          "type": "dataLakeObject",
          "writeMode": "OVERWRITE",
          "fieldsMappings": [
            { "sourceField": "Id__c", "targetField": "Id__c" },
            { "sourceField": "Name__c", "targetField": "Name__c" }
          ]
        },
        "sources": ["LOAD0"]
      }
    }
  }
}
```

The answer is HTTP 201 with the whole transform. In a live test it read `ACTIVE` at the next GET, with `creationType` `CUSTOM`, `lastRunStatus` `NONE`, `fullRunFrequency` `DAILY` and no schedule. A create starts no run.

The form the UI saves is accepted too: no `dataSpaceName`, and `definitions` with one entry that has its own `name`, `label` and `description`. Salesforce stores the STL version as `68.0` even when `56.0` is sent. A DCSQL definition and an output declared in `outputDataObjects` make Salesforce create the output DLO; it stays after the transform is deleted.
{% endcapture %}
{% include operation-tabs.html id="transform-create" label="Create" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7 resolves deploy through the same metadata registry, which has no DataTransform type, so it cannot send a transform." split_api=true metadata_state="unknown" metadata_reason="Not tested: readMetadata returns only the name of a transform, so there is no definition to deploy." connect_state="available" connect_reason="Native API68 POST of a batch STL or DCSQL transform, in the API form or the form the UI saves." connect_body=create_connect plugin_state="available" plugin_reason="Creates the transform by name when the org has none; Salesforce validates the definition." plugin_body=create_plugin %}

## Update

{% capture update_plugin %}
Retrieve the transform, change the file and deploy it. One match by name updates that record with one PUT, or reports `unchanged` when the file equals the transform as retrieve writes it:

```sh
sf data360 retrieve -m data-transform:CustomerCopy -o TARGET_ALIAS
sf data360 deploy -m data-transform:CustomerCopy --preview -o TARGET_ALIAS
sf data360 deploy -m data-transform:CustomerCopy -o TARGET_ALIAS
```

- **Keep the file complete.** An update replaces the whole transform: a value the file leaves out is reset by Salesforce, for example the full-run frequency to `DAILY` and the write mode to `OVERWRITE`. A retrieved file holds every value.
- **Schedule.** The schedule is not in the file, and a deploy does not change it. Set it in Data Cloud or through the API's schedule route.
- **System and packaged transforms.** A system transform, or one with a namespace, is refused with `UNSUPPORTED_TRANSFORM_OWNER_OR_STATE` or `UNSUPPORTED_TRANSFORM_VARIANT` before any write.
- **Enum letter case.** A value of `type`, `fullRunFrequency`, `category` or `writeMode` that differs from Salesforce's stored spelling only in letter case (for example `Daily` for `DAILY`) counts as unchanged on deploy. The plugin sends the value as written; retrieve writes Salesforce's spelling. The definition type is the exception: it must be spelled `DCSQL`, and Salesforce refuses `DcSql` with `JSON_PARSER_ERROR`.
- **Stored form.** Salesforce stores a DCSQL definition without a version and with empty `macros` and `sources`. Retrieve after deploying a hand-written file to get the stored form; a file that differs only in that form is updated again on each deploy.

`--changed-since <git-ref>` selects only the transforms whose files changed.
{% endcapture %}
{% capture update_connect %}
### Native API68 update

Replaces the whole transform with one PUT. Build the body from a fresh GET: keep the input keys, and leave out the output objects' `id`, `createdDate`, `lastModifiedDate` and `status`, and the definition's `schedule`.

```sh
sf api request rest '/services/data/v68.0/ssot/data-transforms/CustomerCopy' --target-org TARGET_ALIAS --method PUT --body '@transform-update.json' --include
```

Save `transform-update.json`: the create body with a new label and description, and the frequency kept:

```json
{
  "name": "CustomerCopy",
  "label": "Customer Copy v2",
  "description": "Copies customer rows nightly",
  "type": "BATCH",
  "dataSpaceName": "default",
  "fullRunFrequency": "DAILY",
  "definition": {
    "type": "STL",
    "version": "68.0",
    "nodes": {
      "LOAD0": {
        "action": "load",
        "parameters": { "dataset": { "name": "CustomerSource__dll", "type": "dataLakeObject" }, "fields": ["Id__c", "Name__c"] },
        "sources": []
      },
      "OUT0": {
        "action": "outputD360",
        "parameters": {
          "name": "CustomerCopy__dll",
          "type": "dataLakeObject",
          "writeMode": "OVERWRITE",
          "fieldsMappings": [
            { "sourceField": "Id__c", "targetField": "Id__c" },
            { "sourceField": "Name__c", "targetField": "Name__c" }
          ]
        },
        "sources": ["LOAD0"]
      }
    }
  }
}
```

The answer is HTTP 200 with `PROCESSING`; in a live test the transform read `ACTIVE` with the new values within a minute, and no run started.

- **PUT replaces everything.** A value the body leaves out is reset: `fullRunFrequency` to `DAILY`, `writeMode` to `OVERWRITE`.
- **No PATCH.** The item route answers `405` to PATCH; it allows `GET`, `PUT`, `DELETE` and `HEAD`.
- **Schedule.** A PUT keeps the schedule. A schedule inside the PUT body is checked but not applied. Change it with `PUT …/data-transforms/CustomerCopy/schedule`, which needs an `interval`.
{% endcapture %}
{% include operation-tabs.html id="transform-update" label="Update" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7 resolves deploy through the same metadata registry, which has no DataTransform type, so it cannot send a transform." split_api=true metadata_state="unknown" metadata_reason="Not tested: readMetadata returns only the name of a transform, so there is no definition to update." connect_state="available" connect_reason="Native API68 PUT of the complete transform; the schedule has its own PUT route." connect_body=update_connect plugin_state="available" plugin_reason="Partial: updates a custom transform by name with one PUT, but refuses system and namespaced transforms and never changes the schedule." plugin_body=update_plugin %}

## Delete

{% capture delete_plugin %}
Deletes transforms by name. Preview first; the delete takes no confirmation flag:

```sh
sf data360 delete -m data-transform:CustomerCopy --preview -o TARGET_ALIAS
sf data360 delete -m data-transform:CustomerCopy -o TARGET_ALIAS
```

- One delete can name several transforms, each deleted on its own. Each name is resolved to its record ID through the complete transform list, ignoring letter case: no match reports `unchanged`, two or more matches are refused with `TRANSFORM_TARGET_NOT_RESOLVED`.
- System transforms and transforms with a namespace are refused before any write.
- A transform whose status is still `PROCESSING` is refused with `TRANSFORM_DELETE_PROCESSING` and nothing is sent; `--preview` reports the same. Other states are left to Salesforce.
- The command sends one DELETE and never retries, then reads the transform list for up to 60 seconds until it no longer shows the transform. A delete whose absence cannot be confirmed ends nonzero as unconfirmed; do not replay it.
- DLOs, runs and data are not touched unless the same command selects them.
- After a confirmed delete the file `data360/dataTransforms/CustomerCopy.dataTransform.json` in the current directory is removed. `--keep-local-files` keeps it.
{% endcapture %}
{% capture delete_connect %}
### Native API68 delete

Deletes one transform by name, then reads it back:

```sh
sf api request rest '/services/data/v68.0/ssot/data-transforms/CustomerCopy' --target-org TARGET_ALIAS --method DELETE --include
sf api request rest '/services/data/v68.0/ssot/data-transforms/CustomerCopy' --target-org TARGET_ALIAS --method GET --include
```

The DELETE answers HTTP 204 with no body. In a live test the GET answered `404` `ITEM_NOT_FOUND` 10 seconds later, and the name was gone from the list.

The source and output DLOs stay, including an output Salesforce created for the transform; delete them separately. A DLO DELETE sent about a minute after the transform's delete answered `204`, but the DLO then read `ERROR` for about 19 minutes; a second DELETE removed it.

The `404` text says a transform in another data space is found as `<prefix>_<name>`. A transform created in a custom space is stored without a prefix and read by its plain name.
{% endcapture %}
{% include operation-tabs.html id="transform-delete" label="Delete" cli_state="blocked" cli_reason="Salesforce CLI 2.151.7 resolves delete through the same metadata registry, which has no DataTransform type, so it cannot delete a transform." split_api=true metadata_state="unknown" metadata_reason="Not tested: no transform was deleted through the Metadata API." connect_state="available" connect_reason="Native API68 DELETE by name, confirmed by a 404 read." connect_body=delete_connect plugin_state="available" plugin_reason="Partial: deletes custom transforms by name and confirms absence, but refuses system and namespaced transforms." plugin_body=delete_plugin %}

<details markdown="1">
<summary>Evidence: tested scope, versions and error codes</summary>

**Standard CLI and Metadata API (CLI 2.151.7, API 68.0).** `sf org list metadata-types` lists no transform type: `MktDataTranObject` is the data stream object, and `OmniDataTransform` belongs to OmniStudio. `sf org list metadata --metadata-type DataTransform` lists user-built STL transforms as `<dataspace>.<name>`; the hidden system transforms a data graph creates are not listed. `readMetadata` returns only `fullName`, and a Metadata retrieve of the listed members returns only `package.xml`. `sf project retrieve start --metadata DataTransform:<name>`, also from a manifest, stops with `RegistryError` "Missing metadata type definition in registry for id 'DataTransform'". Deploy and delete go through the same registry. No Metadata API write was sent.

**Native API (API 68.0, default data space, 2026-11-18).** Two new batch STL transforms on new DLOs: one in the API form with `dataSpaceName`, one in the UI form with `definitions`. Both POSTs answered 201 and read `ACTIVE` with no schedule. A PUT with a new label and description answered 200 `PROCESSING` and read `ACTIVE` with the new values; a PATCH answered 405 and changed nothing. Both DELETEs answered 204 and the transforms read `404` within 10 seconds. The DLOs needed a second DELETE.

**Input shapes (API 68.0).** Accepted: STL version `68.0` with several fields, `writeMode` `APPEND`, `fullRunFrequency` `Weekly`, a mapping on a non-key field, and DCSQL through `definitions` with a new output DLO. Refused by Salesforce with `INVALID_INPUT`: an output equal to the source DLO, an STL output DLO that does not exist, and a streaming transform with STL. A PUT that left out the frequency and write mode reset them to `DAILY` and `OVERWRITE`. A schedule PUT without `interval` was refused; with it, accepted. The schedule stayed through every transform PUT.

**Plugin (API 68).** The public commands created a hand-written STL transform and a DCSQL transform with a new output DLO, retrieved both, updated one with its frequency and write mode kept, reported a repeat as `unchanged`, and deleted both, each deletion confirmed. Further runs covered two transforms in one deploy, `--changed-since`, and a changed output DLO, which Salesforce accepted. A transform in the UI form (no `dataSpaceName`, `definitions`) was retrieved, previewed as `unchanged` on deploy and previewed for delete. In a live test a new transform stayed `PROCESSING` for about 2.5 minutes after its create; once it was `ACTIVE`, the same delete went through.

**UI.** The New Data Transform wizard offers batch (visual editor) and streaming (SQL). A batch transform on Data Lake Objects applies across all data spaces and is saved without `dataSpaceName`; one on Data Model Objects is tied to one data space. The editor's Upsert write mode is stored as `MERGE`.

**Not verified:** batch transforms on Data Model Objects, streaming transforms, runs, schedule changes through the plugin (it makes none), Metadata API writes, other data spaces and other orgs.

</details>
