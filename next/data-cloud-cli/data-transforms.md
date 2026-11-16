---
layout: page
title: "Data Transforms"
description: "The plugin's transform commands: the file holds the transform as Salesforce returns it, deploy creates or updates by name and Salesforce decides."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-transforms/
platforms:
  - next
---

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

## Plugin commands

The plugin has `sf data360` commands for transform definitions, at API 68 (`auto` or
`68.0`) in the default data space. This page adds no CRUD rating and the resource has
no row in the capability table.

The authored file is `data360/dataTransforms/Name.dataTransform.json`. Deploy selects
it by `-m data-transform:Name`, by file or folder with `--source-dir`, or through
`--changed-since`. Retrieve, deploy and delete take several transforms, alone or beside
other families.

```sh
sf data360 retrieve -m data-transform:Example -o SOURCE_ALIAS
sf data360 deploy -m data-transform:Example --preview -o TARGET_ALIAS
sf data360 deploy -m data-transform:Example -o TARGET_ALIAS
sf data360 delete -m data-transform:Example --preview -o TARGET_ALIAS
sf data360 delete -m data-transform:Example -o TARGET_ALIAS
```

## The transform file

The file holds the transform as Salesforce returns it: name, label, description, type,
data space, full-run frequency, and the definition (`definition`, or `definitions` for
one entry per output). STL node graphs, DCSQL manifests, several outputs, the write
mode and the output object definitions stay as Salesforce returns them. Left out are the
schedule and the record ID, dates and status of each output object.

The plugin only checks that the file is plain JSON with a valid name, exactly one of
`definition` and `definitions`, and the default data space. Everything else is sent as
written and Salesforce decides. Salesforce refuses, for example, an STL output DLO that
does not exist, an output that is also the source DLO, and a streaming transform with an
STL definition. A DCSQL definition creates the output DLOs it declares; that DLO stays
when the transform is deleted.

- **Keep the file complete.** An update replaces the whole transform: a value the file
  leaves out is reset by Salesforce, for example the full-run frequency to `DAILY` and
  the write mode to `OVERWRITE`. A retrieved file holds every value.
- **Schedule.** The schedule is not in the file, and a deploy does not change it. Set it
  in Data Cloud.
- **Stored form.** Salesforce stores some values differently from how they were sent
  (upper-case values such as `WEEKLY`; a DCSQL definition without a version and with
  empty `macros` and `sources`). Retrieve after deploying a hand-written file to get the
  stored form; a file that differs only in that form is updated again on each deploy.

## Deploy and delete

- **Create or update by name.** Deploy reads the complete transform list and looks for
  the name in the file, ignoring letter case. No match creates the transform with one
  POST, after Salesforce's validation. One match updates that record with one PUT, or
  reports `unchanged` when the file equals the transform as retrieve writes it. Two or
  more matches are refused with `TRANSFORM_TARGET_NOT_RESOLVED`, and a match whose name
  differs only in letter case is refused with `TRANSFORM_IDENTITY_MISMATCH`, both before
  any write. No flag acknowledges processing.
- **Only custom transforms.** Update and delete refuse system transforms and transforms
  with a namespace, such as the ones a data graph creates. Retrieve saves them as-is with
  a warning, and deploy does not send that file.
- **Several per deploy.** Transforms run in their own phase, one after another, after
  streams and the native DLO, DMO, mapping and relationship items, and before identity
  resolution, calculated insights, segments and graphs. The first transform that does
  not succeed stops the run. `--changed-since <git-ref>` selects only the transforms
  whose files changed.
- **Delete** selects transforms by name and takes no confirmation flag; one delete can
  name several transforms, each deleted on its own. Each name is resolved to its record
  ID through the complete transform list, ignoring letter case: no match reports
  `unchanged`, two or more matches are refused with `TRANSFORM_TARGET_NOT_RESOLVED`.
  The command sends one DELETE and never retries, then reads the transform list for up
  to 60 seconds until it no longer shows the transform. A delete whose absence cannot be
  confirmed ends nonzero as unconfirmed; do not replay it. DLOs, runs and data are not
  touched unless the same command selects them.
- `--preview` is read-only for deploy and delete.
- After a confirmed delete the file `data360/dataTransforms/Example.dataTransform.json`
  in the current directory is removed. `--keep-local-files` keeps it.
- Not offered: schedules and runs.

Live at API 68 in one org, the public commands created a hand-written STL transform and
a DCSQL transform with a new output DLO, retrieved both, updated one with its frequency
and write mode kept, reported a repeat as `unchanged`, and deleted both, each deletion
confirmed. Earlier runs covered two transforms in one deploy and `--changed-since`.
