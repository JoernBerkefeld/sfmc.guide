---
layout: page
title: "Data Transforms: native API qualification"
description: "A bounded API68 experiment demonstrates a directly created DLO as a precreated batch transform output, not plugin command support."
parent: Data Cloud with Salesforce CLI
parent_url: /next/data-cloud-cli/
permalink: /next/data-cloud-cli/data-transforms/
platforms:
  - next
---

[Back to Data Cloud with Salesforce CLI](/next/data-cloud-cli/).

## Direct DLO creation for a transform output

Direct DLO creation has a demonstrated use as a **precreated transform output**,
without a DataStream for that output. A native API68 `CUSTOM` / `BATCH` transform
with an `STL` definition bound that directly created output DLO and completed a
run with `SUCCESS` in 47 seconds, processing and writing zero rows. The source
DLO was also directly created as an empty test fixture; ordinary transform sources
may instead contain ingested data. The output binding is the practical reason for
direct creation, not a requirement to create every source this way.

This qualifies only the tested precreated-output path: precreation was **not proven
mandatory**, and automatic output provisioning was **not tested**. A zero-row run
does not qualify populated transformations, other API versions or cross-org replay.
The transform, source DLO and output DLO were removed after the experiment.

## Qualification is not plugin command support

**Data Transform plugin commands are not implemented**; these are native API
qualification results, not an available `sf data360` transform workflow. This page
does not add transform CRUD ratings or claim dedicated out-of-the-box CLI support.
The existing DLO definition workflow and its own limits remain separate.
