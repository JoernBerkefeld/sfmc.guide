---
layout: page
title: "Data Spaces"
description: "How Data 360 data spaces affect names, membership and each API route, and where each tool records the space, measured live at API 68."
parent: Next
parent_url: /next/
permalink: /next/data-spaces/
verification: verified
platforms:
  - next
---

{% include verification-status.html title="Measured live at API 68 in one org with the spaces default and one custom space, on probe objects that were deleted afterwards; behaviour in other orgs or releases may differ." %}

<!-- Keep this page in sync with the "Data 360 Data Spaces" research artifact and with the "Which tool works for which type" chapter of /next/data-cloud-devops/. -->

A data space is a partition of one Data Cloud (Data 360) org. Every org has a `default` space; each custom space has a name and a short `prefix` (here `dataspace2` with prefix `ds2`; the prefix is chosen by whoever creates the space, Salesforce does not assign it). This page covers where API names must be unique, how many spaces each type belongs to, and how each API route treats the space. Which tool can work with each type is on the [Data Cloud DevOps](/next/data-cloud-devops/#which-tool-works-for-which-type) page.

## The short answer

- **Most names are unique per org.** DLO, DMO, calculated insight, transform and data graph names cannot repeat in another space.
- **Segments, identity resolution rulesets and standard DMOs get a space prefix.** A segment in `dataspace2` is stored as `ds2_<Name>` (`<prefix>_<Name>`), a ruleset as `ds2_Individual_<id>`, and the standard DMO Individual there is `ds2_Individual__dlm`, so stored names still differ. The fields of a standard DMO copy drop `ssot__` (`FirstName__c`).
- **Some names are generated.** Mapping, relationship and data stream names come from Salesforce; a name you send is ignored.
- **Routes rarely check the space.** Most routes silently ignore an unknown or other space. Only the mapping list answers with a clear `404`.

## Where each tool records the space

| Tool | How it handles the space |
|---|---|
| Salesforce CLI (source format) | No data-space folders and no DataSpace metadata type. The space is a field inside some files: `mktDataModelAttributes/dataSpaceName` in a DMO, `dataSpaceDefinitionDevName` in a data kit. DLO files carry no space. |
| Metadata API | Uses the same fields. A DMO created with `dataSpaceName` set to a custom space lands in that space, under the API name you gave it. |
| Connect API (`/ssot/…`) | Takes the space in the body (`dataSpaceName` for DMOs, `dataspaceInfo` for DLOs) and returns it on reads. Many routes ignore the `dataspace` query parameter (see the route table below). `GET /ssot/data-spaces` lists the spaces and their prefixes. |
| sf-plugin-data | Every type works in any data space. Each file carries a top-level `c__dataSpace` (a list for DLOs and data streams, a single name for every other type); `--dataspace` names the run's space (`default` when omitted), and a file of another space is refused. The org's spaces are read once per command, and an unknown space is refused before any other request. Names are written as Salesforce stores them (`ds2_…`). With more than one space, custom DMOs, calculated insights, transforms and data graphs must carry their space's prefix (`ds2_Order__dlm`), and in `default` no other space's prefix: a create that breaks this is refused before any write, and retrieve and updates warn. `--allow-cross-dataspace` (`-c`) deploys files of another space, renamed by these rules. |
| Data kits | The package does not fix the space; you pick the target space in the separate data-kit deploy step. |

## Uniqueness inside and across data spaces

"Same name in another space" means: create name X in `default`, then X again in `dataspace2`.

| Type | Same name in another space | Read by name returns | Space prefix on the name | Same name as another type |
|---|---|---|---|---|
| DLO | <span class="crud-chip crud-chip--no">refused</span> `400` INVALID_INPUT, already exists. One DLO can instead belong to several spaces. | the one DLO | <span class="crud-chip crud-chip--none">none</span> | <span class="crud-chip crud-chip--none">n/a</span> (suffix `__dll`) |
| DMO | <span class="crud-chip crud-chip--no">refused</span> custom DMO `400` DB_SAVE_FAILED, duplicate developer name | the `default` one | <span class="crud-chip crud-chip--partial">standard only</span> a custom DMO keeps its name, and a chosen `ds2_` name is accepted; mapping onto Individual in `dataspace2` targets `ds2_Individual__dlm`, and the mapping list finds it only under that name | <span class="crud-chip crud-chip--none">n/a</span> (suffix `__dlm`) |
| Calculated insight | <span class="crud-chip crud-chip--no">refused</span> `400` DUPLICATE_DEVELOPER_NAME | the `default` one, even with `?dataspace=` | <span class="crud-chip crud-chip--none">not added</span> a chosen `ds2_` name is accepted | <span class="crud-chip crud-chip--none">n/a</span> (suffix `__cio`) |
| Data transform | <span class="crud-chip crud-chip--no">refused</span> `400`, API name already exists | the one transform | <span class="crud-chip crud-chip--none">not added</span> a chosen `ds2_` name is accepted | <span class="crud-chip crud-chip--yes">allowed</span> coexisted with a segment and a graph of the same name |
| Data graph | <span class="crud-chip crud-chip--no">refused</span> the POST was treated as an update of the `default` graph and refused; that graph was unchanged | the `default` one | <span class="crud-chip crud-chip--none">not added</span> a chosen `ds2_` name is accepted | <span class="crud-chip crud-chip--yes">allowed</span> |
| Segment | <span class="crud-chip crud-chip--yes">allowed</span> stored as `ds2_<Name>` | `<Name>` gives the `default` one; `ds2_<Name>` the other | <span class="crud-chip crud-chip--partial">space prefix</span> not doubled when the name already starts with it | <span class="crud-chip crud-chip--yes">allowed</span> |
| DLO-DMO mapping | <span class="crud-chip crud-chip--none">generated</span> `<dll>_map_<dlm>_<epochMs>`; a sent name is ignored | by generated name | <span class="crud-chip crud-chip--none">none</span> | <span class="crud-chip crud-chip--none">n/a</span> |
| Relationship | <span class="crud-chip crud-chip--none">generated</span> | by generated name | <span class="crud-chip crud-chip--none">none</span> | <span class="crud-chip crud-chip--none">n/a</span> |
| Data stream | <span class="crud-chip crud-chip--none">generated</span> `<connection>_<event>_<hash>`; one Ingestion API event backs one stream only | by generated name | <span class="crud-chip crud-chip--none">none</span> a stream DLO in `dataspace2` follows the same pattern | <span class="crud-chip crud-chip--none">n/a</span> |
| Identity resolution | <span class="crud-chip crud-chip--yes">allowed</span> once ContactPointEmail is mapped in `dataspace2`, a ruleset there is accepted and stored as `ds2_Individual_<id>` | `ds2_Individual_<id>` returns it, with or without `?dataspace=`; `Individual_<id>` answers ITEM_NOT_FOUND | <span class="crud-chip crud-chip--partial">space prefix</span> also on its unified and link DMOs (`ds2_UnifiedIndividual<Id>__dlm`) | <span class="crud-chip crud-chip--none">n/a</span> (name is `Individual_<id>` in `default`, id at most 4 characters) |

## How many spaces a type belongs to

| Type | Space model | Detail |
|---|---|---|
| DLO | <span class="crud-chip crud-chip--partial">several spaces</span> | Reads return the list as `dataSpaceInfo`. A new DLO with an empty or missing `dataspaceInfo` lands in `default`. Membership is changed on the space, not on the DLO (below), and an optional record filter belongs to each membership, not to the DLO. |
| Data stream | <span class="crud-chip crud-chip--partial">its DLO's spaces</span> | No space of its own; the stream reports its DLO's spaces. |
| Standard DMO | <span class="crud-chip crud-chip--none">one copy per space</span> | `ssot__Individual__dlm` in `default`, `ds2_Individual__dlm` in `dataspace2`. |
| DLO-DMO mapping | <span class="crud-chip crud-chip--yes">one space</span> | A DLO shared by two spaces has one mapping per space, each onto that space's DMO. |
| Custom DMO, relationship, calculated insight, segment, transform, data graph, identity resolution | <span class="crud-chip crud-chip--yes">one space</span> | Each carries one space field. Exception: the system transform for currency rates has no space. |
| Data kit | <span class="crud-chip crud-chip--none">not bound</span> | A standard kit is built from `default` and deploys into any space; a DevOps kit deploys into the space it was built from. |

**Changing a DLO's spaces.** A DLO `PATCH` with `dataspaceInfo` or `dataSpaceInfo` is refused (`400` JSON_PARSER_ERROR, unrecognized field) and `PUT` on the DLO answers `405`. The space's members route does it:

```sh
sf api request rest '/services/data/v68.0/ssot/data-spaces/dataspace2/members' --method PUT --body '{"members":{"members":[{"memberName":"Example__dll"}]}}' --target-org TARGET_ALIAS
sf api request rest '/services/data/v68.0/ssot/data-spaces/dataspace2/members?memberNames=Example__dll' --method DELETE --target-org TARGET_ALIAS
```

The `PUT` body needs the doubled `members` (a flat list answers `400`). It only adds: members the body leaves out stay, a member sent again changes nothing, and an empty list changes nothing. An unknown DLO answers `2xx` with `"success":"false"` and the error in the body, so check the body, not only the status. The `default` space's member list states one more member (`totalSize`) than it lists, and no read shows the missing one; as the `PUT` resends nothing, this does not matter for adding a DLO. It answers `PROCESSING`; a few seconds later the member reads `ACTIVE` and the DLO lists both spaces, under the same name. The `DELETE` removes the DLO from that space only and keeps the DLO; `DELETE …/members/<name>` answers `405`.

**Creating and deleting a space.** `POST /services/data/v68.0/ssot/data-spaces` with `{"label":…,"prefix":…,"description":…}` creates one; its name is taken from the label. It reads `Active` after about 10 seconds and already holds one member nobody added (`StaticCurrencyRates_Home__dll`). `DELETE …/data-spaces/<name>` removes it, also with that member still in it.

Access is granted per space through permission sets: standard Data 360 permission sets cover only `default`, and each other space must be linked to the permission sets that should reach it. What the APIs return to a user limited to one space has not been tested; an admin's lists without a `dataspace` parameter span every space.

## Names inside another space

- **SQL, segment criteria and identity resolution rules need the stored spelling.** In `dataspace2`, DBT segments, segment criteria, the Query API and identity resolution rules accept `ds2_Individual__dlm` with `FirstName__c` and refuse `ssot__Individual__dlm` with `ssot__FirstName__c`. A custom DMO keeps the name it was created with: Salesforce adds no prefix, and a name chosen with `ds2_` in front is accepted too (also in `default`).
- **A DCSQL transform accepts the default spelling but reads the default space's object**; it does not translate the name.
- **A standard DMO copy holds only the fields mapped in that space**, and it gains a field when a mapping names one.
- **The first mapping onto a standard DMO in a space must use the default spelling** (`ssot__ContactPointEmail__dlm` with `ssot__` fields), because the copy does not exist yet; Salesforce stores it under the copy name. From then on only the copy spelling works.
- **The last mapping onto a standard DMO copy cannot be deleted.** In `dataspace2` the Metadata API destructive deploy fails with "An unexpected error occurred" (also as a check-only run), and the native `DELETE` is refused because the copy is mapped to only one DLO. The copy and that DLO stay, so map onto a copy only from a DLO you mean to keep.
- **Generated names follow the same rule.** Segment membership DMOs on a copy are `ds2_Individual_SM_<ms>__dlm`; on a custom DMO `<Custom>_SM_<ms>__dlm`. A ruleset's unified and link DMOs are `ds2_UnifiedIndividual<Id>__dlm` and `ds2_UnifiedLinkIndividual<Id>__dlm`.
- **The prefix is only in the space list** (`GET /ssot/data-spaces`, key `prefix`); no queryable record holds it.

## How each route treats the data space

What happens when a request names `dataspace2` or a space that does not exist.

| Type | How the space is given | List | Read by name | Unknown space |
|---|---|---|---|---|
| DLO | body `dataspaceInfo`, a list: one DLO in several spaces | ignores the space | ignores the space | `200`, same answer |
| DMO | body `dataSpaceName` on create | ignores the space; returns the DMOs of every space, each with its `dataSpaceName` | ignores the space | `200`, same answer |
| Mapping | query `dataspace` | filters by space | — | <span class="crud-chip crud-chip--yes">404</span> "DataSpace not found" |
| Relationship | query `dataspace`; none means `default` | filters by space (per source DMO); a DMO from another space answers `404` "DMO not found … in the data space" | no single-relationship read | <span class="crud-chip crud-chip--partial">500</span> INTERNAL_ERROR "end-user denied authorization" |
| Calculated insight | body `dataSpaceName`; read form `dataSpace` | filters by space (drafts counted, not listed) | ignores the space | <span class="crud-chip crud-chip--partial">403</span> "end-user denied authorization" |
| Segment | body on create; stored name carries `ds2_` | filters by space | ignores the space; use the stored name | <span class="crud-chip crud-chip--partial">403</span> same misleading text |
| Data graph | body `dataspaceName` | metadata list filters by space; drafts left out | — | <span class="crud-chip crud-chip--partial">403</span> same misleading text |
| Data transform | body `dataSpaceName` | ignores the space | ignores the space | `200`, same answer |
| Identity resolution | body `dataSpaceName` | ignores the space; returns every space's rulesets, each with its `dataSpaceName` | ignores the space; use the stored name | `200`, same answer |
| Data stream | through its DLO's spaces | ignores the space | — | `200`, same answer |

The space list itself is reliable: `GET /services/data/v68.0/ssot/data-spaces` lists every space with its `prefix`, and `GET …/data-spaces/<name>` answers `404` NOT_FOUND for a space that does not exist. That is the one cheap way to check a space name, because most routes above do not.
