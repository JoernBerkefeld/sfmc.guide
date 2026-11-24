---
layout: page
title: "sf-plugin-data"
description: "Salesforce CLI plugin that copies Data 360 configuration between an org and files in Git, per data space."
parent: Tools
parent_url: /tools/
permalink: /tools/sf-plugin-data/
platforms:
  - next
---

Salesforce CLI (`sf data360`) plugin that copies Data 360 (Data Cloud) configuration between an org and JSON files you keep in Git. It is not a backup, restore or migration tool and never copies data rows.

## Get started

```sh
# 1. See which data spaces the org has
sf data360 list dataspace --target-org <alias>

# 2. Retrieve the components of one of them
sf data360 retrieve --dataspace <name> --target-org <alias>
```

A retrieve without `-m` saves every type in the data space. Add `-m` to narrow it, for example `-m dmo` or `-m segment:Name`.

## What it does

- Retrieve, preview, deploy and delete DLOs, DMOs, mappings, relationships, data streams, data transforms, data graphs, identity resolution, segments and calculated insights
- Works per data space: every file records its data space, and each run targets one
- Deploy what changed in Git since a commit or branch, including deletions
- Publish segments and calculated insights, and export segment members as CSV or JSON
- List the org's data spaces with name, label and prefix (`sf data360 list dataspace`)
- `datacloud`, `d360` and `dc` work as aliases of `data360`

## Exit codes

Every `sf data360` command (retrieve, deploy, delete, publish, segment members export and list dataspace) ends with one of these codes:

| Code | Meaning |
|---|---|
| `0` | Success, or Salesforce accepted an `--async` run |
| `1` | Failed or blocked, nothing was written, or it is unclear whether a write happened |
| `2` | Wrong flag or usage |
| `68` | Partial: something was written and something else failed |
| `69` | Still processing at the end of a run without `--async`, or the wait ran out |

- A failure wins over `69`. The command exits `69` only when nothing failed.
- `--allow-processing` is not `--async`. It only allows a write that starts processing; a run that is still processing at the end exits `69`.
- With `--json`, the top-level `status` is the exit code. `result.status` gives the plugin's status as text: `success`, `accepted`, `processing`, `partial`, `blocked` or `failed`.
- A deploy with `--changed-since` that finds no changes exits `0`. A deploy where every selected file was skipped exits `1` with `NOTHING_TO_DEPLOY`.

## Use it in VS Code

- [Data 360 DevTools](/tools/vscode-data360/) (pre-release) runs these commands from right-click menus and the Command Palette, with its own copy of the plugin

## Learn more

- [Data Cloud DevOps](/next/data-cloud-devops/): per-type behaviour and evidence
- [Data spaces](/next/data-spaces/)

## Links

- [npm](https://www.npmjs.com/package/sf-plugin-data)
- [GitHub](https://github.com/JoernBerkefeld/sf-plugin-data)

[← All tools](/tools/)
