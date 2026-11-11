---
layout: page
title: "Data Cloud with Salesforce CLI"
description: "Data Cloud metadata commands, default source-format files, illustrative responses and supported lifecycle limits for Marketing Cloud Next."
parent: Next
parent_url: /next/
permalink: /next/data-cloud-cli/
verification: verified
platforms:
  - next
crud_rows:
  - path: next/data-cloud-cli/data-stream-definition.md
    label: Data Streams
    anchor: data-stream-configuration-datastreamdefinition
    scope: 'Ingestion starts here: source-to-DLO mappings belong to the stream, separate from DLO-to-DMO mappings. Standard CLI retrieves DataStreamDefinition XML. Native Ingestion API/Other/default evidence qualifies bounded creation, additive Text mapping updates and both delete modes at API65/68; API66 preserve-DLO deletion succeeded despite unresolved automatic processing failure. Plugin exact retrieve, guarded deploy and delete are implemented for auto/API68/default only. Fresh installed API68 source create/retrieve, connectionName-only target remap/create/retrieve, additive Text update, zero-write repeat and both-org explicit cascade cleanup passed with protected resources unchanged. This is bounded cross-org qualification, not general connector, populated-data or other-version support.'
  - path: next/data-cloud-cli/data-lake-object.md
    label: DLOs
    anchor: data-lake-object-dlo-customobject-dll
    scope: 'Standard Metadata retrieval worked at requested API65–68; full-schema redeploy hit primary-key/qualifier failures. Native API61–68 standalone CRUD succeeded separately; plugin guard and public acceptance remain API68/default. Portable JSON, auto POST/PATCH and explicit read-only preview; default delete has no prompt. Not ingestion, cascade or cross-org portability.'
  - path: next/data-cloud-cli/data-model-object.md
    label: DMOs
    anchor: data-model-object-dmo-customobject-dlm
    scope: 'XML retrieval. Native API61–68 create, label update, Text-field addition and delete on empty, unmapped custom DMOs in the default data space; API60 returns 404. At API68: categories Profile, Engagement and Other, ten field data types, object label and description updates, existing field label updates and added fields; data-type and key changes are silently ignored by the API and fields cannot be removed. The plugin keeps no local allowlists and refuses those changes and all writes to standard or generated DMOs. Mapped or data-bearing DMOs, non-default data spaces, relationships and other versions for the API68 breadth are unverified; authoritative emptiness admission for existing nonqueryable objects is unresolved (`42P01` is not empty); owned deletion requires dependency checks.'
  - path: next/data-cloud-cli/dlo-dmo-mapping.md
    label: DLO-DMO-mapping
    anchor: dlo-to-dmo-mapping-objectsourcetargetmap
    scope: 'Exact standard API65 XML and installed API68 exact-selection JSON retrieval; inventory acceptance remains unresolved (earlier errors, later mapping type-only timeout, not pass). Compatible-object creation; CLI label-only update; historical installed single Text/Number additions. Current API68 desired-state implementation unmaps eligible omitted pairs first, then batch-adds Text pairs; installed Text removal, two-pair batch addition and both Text pair-retarget directions passed sequentially on one empty fixture, with zero-write previews/repeats. Guarded whole-mapping deletion admits API61–68/default68: installed61/68 each passed two Text unmaps then mapping deletion (three DELETE204), full parent/schema/survivor checks and zero-write last-DMO preview/execution guards; API61 fixtures were provisioned at68,62–67 user-assumed/synthetic only. Installed Number removal remains unqualified. Last mapping for the target DMO is blocked before all writes; protected pairs, full parents and survivor preservation are checked. Direct non-last DELETE previously lost DMO fields; survivor coverage alone is insufficient. Delete is Partial for API and Plugin; out-of-the-box CLI deletion remains Unknown. No populated, general binding-retarget or universal preservation qualification. A separate installed API68/default empty Other/Text cross-org run passed exact source retrieval, target-local logical DLO/DMO rebinding, create/retrieve, additive Text update, GET-only repeat and guarded selected deletion with an unchanged survivor. Exact owned final mappings and parents remain under the accepted last-mapping limitation; this is not general cross-org schema or released-package qualification.'
  - path: next/data-cloud-cli/field-source-target-relationship.md
    label: Relationships
    anchor: field-relationship-fieldsrctrgtrelationship
    scope: 'Exact standard API 65 definition retrieval reverified in one source org; no prerequisite or portability proof. Writes remain bounded to empty custom DMOs, owned `ManyToOne` lookup, label-only update and sole-use lookup cascade deletion.'
  - path: next/data-cloud-cli/data-source-object.md
    label: Source object definitions
    anchor: source-object-configuration-datasourceobject
    scope: '`DataSourceObject` XML, not a complete connector or credential export.'
  - path: next/data-cloud-cli/calculated-insights.md
    label: Calculated insights
    anchor: retrieve
    scope: 'XML definition and runtime reads; definition-only XML writes or API 67 facade runtime creation; API 65 publication/settings and bounded predicate edit, including target-bound ACTIVE/NOT_SCHEDULED preservation; historical API65 evidence is not unchanged-source cross-org deployment or successful calculation proof. Separately, optional sf-plugin-data explicit68/default installed cross-org draft create/publish, byte-identical paired retrieval, GET-only no-op and ACTIVE edit passed. Later seven-poll delete passed; two earlier unconfirmed completions remain unexplained, all fixtures independently absent. Plugin auto remains legacy65; no computation/general SQL guarantee; asynchronous deletion checks required.'
  - path: next/data-cloud-cli/segments.md
    label: Segments
    anchor: retrieve
    scope: 'Native JSON API68/default installed plugin retrieve/repeat, absent-target CREATE, description UPDATE with independent full preservation reads and acknowledged processing, zero-write no-op, and confirmed exact DELETE204 plus internal/external GET404. Later conservative predispatch DELETE guard is offline-only; transitional DELETE branches synthetic-only. Historical API65 XML/native evidence remains separate, including one existing-owner forward selected-primary-key IS NOT NULL predicate addition. No arbitrary SQL, lower-version JSON CREATE/DELETE, cross-org, completed computation, generated-resource or physical cleanup qualification.'
  - path: next/data-cloud-cli/segment-members.md
    label: Segment members
    anchor: segment-members-runtime-data-not-metadata
    scope: 'Bounded membership/query pages, not a verified full-population export or member writes.'
  - path: next/data-cloud-cli/data-graphs.md
    label: Data Graphs
    anchor: operational-data-graphs
    scope: 'Optional sf-plugin-data explicit68/default standard Individual NONE recursive retrieval and guarded label/description/additive projection/relationship UPDATE with retained multihop bindings; strict root-only absent creation and exact-artifact confirmed deletion. Installed description UPDATE and zero-write repeats passed; general cross-org portability is unqualified. Fresh ready/identity/root/known-empty dependencies required; exhaustive external consumers unverified. Independent graph-definition absence confirmed, not generated-resource/storage/credits cleanup. Auto/API67 facade retains bounded existing-IR-owner LastName append, full preservation and zero-write repeat; GUI UPDATE does not qualify public REST/plugin UPDATE.'
  - path: next/data-cloud-cli/identity-resolution.md
    label: Identity Resolution
    anchor: operational-identity-resolution
    scope: 'API 67 facade source-only ruleset lifecycle and bounded reconciliation change; two-org owner/twelve-output correlation and preservation during dependent Graph update, with no IR mutation; not portable IR creation/update, successful IR data run or universal cleanup.'
  - path: next/data-cloud-cli/data-kit-object-template.md
    label: Kit templates
    anchor: kit-template-datakitobjecttemplate
    scope: 'Stored Data Graph snapshot and description update; no reproducible standard CLI delete invocation supplied.'
  - path: next/data-cloud-cli/data-package-kit-definition.md
    label: Kit definitions
    anchor: kit-definition-datapackagekitdefinition
    scope: 'Owned Identity Resolution definition/template/membership created and deleted together; no runtime installation proof.'
  - path: next/data-cloud-cli/data-package-kit-object.md
    label: Kit membership
    anchor: kit-membership-datapackagekitobject
    scope: 'Combined metadata transport with its definition/template; no independent member creation/deletion proof.'
---

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

You can use Salesforce CLI to download quite a bit of your Data Cloud (Data 360) configuration. Making changes is a little less straightforward: some commands work with saved definitions, while others work with the actual running component.

[Data Transforms qualification](/next/data-cloud-cli/data-transforms/) separately
explains the demonstrated use of a directly created DLO as a precreated transform
output. Transform plugin commands are not implemented; this qualification does not
add a resource to the CRUD support table below.

This page explains the difference and shows the commands next to the files and responses you can expect. Start with retrieving an existing component. Only move on to create, update or delete when you have checked the prerequisites for that section.

<!-- Keep this capability table, all linked type-page details and their visible last-updated timestamps synchronized with every substantive update across this guide. -->

Each linked page covers one logical resource, with Retrieve, Create, Update and Delete sections. Prefer a dedicated standard CLI command when the verified workflow provides one; otherwise use a native API through `sf api request rest`, or the explicitly identified facade where native support is not qualified. Using Salesforce CLI as a request runner does not make an API workflow standard resource-specific CLI support. XML definitions and runtime state are views of the same resource, not separate feature types.

### Choose a method for each operation

The resource pages group complete workflows into independent operation tabs. **CLI** means a supplied supported Metadata retrieval/deployment workflow or a resource-specific standard command. **API** means requests such as `sf api request rest`, including any supporting CLI reads needed by that workflow. Generic REST or SOAP request runners, request bodies supplied by file or stdin, MCP/facade/Aura calls and authentication helpers never establish resource-specific standard CLI support. Their use of Salesforce CLI for authentication or transport does not change the API classification. Separately identified custom plugin commands remain plugin workflows, not standard CLI support. Switching a tab changes the method's prose, payloads, commands and checks together, not just its code blocks. Shared prerequisites, safety warnings and detailed evidence for disabled methods remain visible.

- **Available:** an existing workflow is supplied and the tab can be selected. Its bounded, definition-only or asynchronous qualifications still apply; availability is not a new verification claim.
- **Blocked:** the disabled tab has a circle-slash icon and a known limitation explained beneath the controls.
- **Unknown:** the disabled tab has a question-mark icon because a workflow is undocumented, untested or not implemented here. The summary's **?** rating does not by itself mean blocked.
- **sf-plugin-data:** the DLO page now supplies native API68/default retrieve, automatic create/update and exact-target delete workflows, with explicit read-only preview. Its portable JSON and separate payload policies replace the earlier XML wrapper/ingestion-DLO mechanisms. The Data Stream, DMO and DLO-DMO-mapping pages also supply qualified plugin workflows, with their own prerequisites and operation limits. The calculated-insight page separately documents the bounded explicit68 draft/publish/source-paired-delete workflow, installed cross-org equality/no-op evidence and unresolved historical deletion-confirmation failures; its standard-CLI/API tabs remain separate. The Graph page separately documents explicit68/default recursive native retrieval and bounded label/description/additive projection/relationship UPDATE with preservation, distinct native artifacts, strict root-only CREATE, zero-write equality and guarded confirmed deletion. Installed description UPDATE and zero-write output checks passed; general cross-org portability is not qualified and auto/API67 facade behavior is preserved. Exhaustive external consumers and generated-resource/storage/credits cleanup are unverified. The Segment page now supplies four bounded native JSON API68/default plugin workflows: installed retrieve/repeat, absent-target CREATE, description UPDATE with acknowledged processing and independent preservation reads, settled zero-write no-op and confirmed exact deletion. Its later conservative predispatch DELETE guard is offline-qualified only; transitional DELETE branches are synthetic-only. Historical API65 evidence remains separate, with no general SQL, cross-org, completed computation or physical cleanup claim. Other resource plugin tabs remain Unknown. Public-command standalone acceptance does not establish ingestion, populated/stream-owned behavior or support beyond API68.

CLI is selected first when available, otherwise API. When neither method has a workflow, all choices remain disabled and the limitations stay visible. Without JavaScript, available workflows remain readable as labeled sections.

**Presentation update:** operation-tab guidance was added on October 29, 2026. The last-updated and live-verification scope on each resource page retain their original meaning; this presentation change does not record a new live-org test. The 14:35 documentation synchronization includes the independently reverified relationship read; synchronized Graph/Identity Resolution timestamps do not represent new live checks of those resources. The 17:27 synchronization adds the October 29 source-only mapping XML comparison; it records retained evidence, not a new live check or broader write qualification. The 19:43 synchronization adds the retained target-bound calculated-insight expression update and preservation result; it does not record new Graph/Identity Resolution live verification, a schedule change or a successful calculation run.

**October 30 documentation reconciliation:** the DLO/stream pages now distinguish documented ingestion CREATE inputs from qualified workflows and retain the inconclusive stream readback as unknown. Segment guidance adds the source-only stable-owner comparison and native/MCP DBT rule differences. The native stream reference now adds documented POST availability, the ingestion primary-key-only field-array rule and the native/facade list-filter distinction; it supplies no qualified ingestion CREATE recipe. CRUD ratings are unchanged. Synchronized overview, Segment, calculated-insight, Graph and Identity Resolution timestamps do not represent new live tests of those resources.

**October 30 Segment predicate reconciliation:** retained native API 65 evidence now qualifies one source-only existing-owner forward addition of `AND <same selected primary field> IS NOT NULL` after `WHERE 1 = 0`. Independent ACTIVE runtime and Metadata reads agreed on the desired SQL and preserved settings, identities and bindings. This is not general SQL, cross-org, membership or computation proof. The Segment API update method was already Partial; no CRUD status or method is promoted. The synchronized timestamps record this documentation reconciliation, not new live tests of the other resources.

**November 2 DLO retrieval reconciliation:** retained standard CLI runs with requested API 65.0–68.0 each succeeded on the same source test fixture, saving one object and eight field XML files with identical bytes and parsed XML. The [DLO Retrieve section](/next/data-cloud-cli/data-lake-object/#retrieve) includes the complete saved fixture files and one command example. No disk manifest was generated, and the CLI response did not independently report an effective API version. This adds retrieval evidence only: CREATE, UPDATE and DELETE ratings and other resources' live-verification dates are unchanged.

**November 2 DLO CREATE reconciliation:** four real standard deployments of the unchanged retrieved schema under independently absent synthetic names failed at requested API 65–68, with the same generic internal error signature at `Id__c` (combined object line 54, column 13). Independent post-failure Metadata reads could not find each name. The DLO CLI Create tab is blocked for this tested schema; this did not establish universally unsupported CREATE. The separate native API68 standalone plugin workflow now qualifies bounded creation. Distinct earlier API ingestion-chain observations are retained, not promoted to a general creation workflow. No other resource was reverified.

{% include crud-legend.html %}

The ratings cover usable workflows supplied in this guide, not every observed operation. DMO creation and DLO native API68 standalone definition workflows are supplied on their resource pages within their stated scopes; other observations remain background evidence. Some metadata deletion examples depend on integration-generated manifests rather than a self-contained workflow. Write permissions, dependencies and processing warnings still apply.

<table class="crud-overview">
  <thead><tr><th scope="col">Configuration or runtime data</th><th scope="col">Retrieve</th><th scope="col">Create</th><th scope="col">Update</th><th scope="col">Delete</th><th scope="col">Verified scope / limits</th></tr></thead>
  <tbody>
  {% for row in page.crud_rows %}
    {% assign resource = site.pages | where: 'path', row.path | first %}
    {% if resource %}
      {% unless resource.discoverable == false or resource.discoverable == 'false' or resource.sitemap == false or resource.sitemap == 'false' or site.data.undiscoverable_urls[resource.url] %}
    <tr>
      <td><a href="{{ resource.url | relative_url }}#{{ row.anchor | escape }}">{{ row.label | escape }}</a></td>
      <td>{% include crud-cell.html capability=resource.crud.retrieve %}</td>
      <td>{% include crud-cell.html capability=resource.crud.create %}</td>
      <td>{% include crud-cell.html capability=resource.crud.update %}</td>
      <td>{% include crud-cell.html capability=resource.crud.delete %}</td>
      <td>{{ row.scope | markdownify }}</td>
    </tr>
      {% endunless %}
    {% endif %}
  {% endfor %}
  </tbody>
</table>

## Native plugin scope and readable results

**Documentation update: November 3, 2026.** This section describes the current
implementation and requested output format. The stream detail and summary above
also include the fresh bounded installed API68 cross-org result; this does not
requalify other resources or API versions. The resource pages retain their existing operation ratings and
live-tested limits. In particular, mapping inventory acceptance and its deferred
`totalSize` mismatch remain unresolved; API62–67 mapping deletion remains an
accepted compatibility assumption, not live qualification.

For guarded whole-mapping deletion, see the [mapping delete commands and safety limits](/next/data-cloud-cli/dlo-dmo-mapping/#delete).
Removing selected field pairs instead uses the complete JSON deploy workflow under
[Mapping Update](/next/data-cloud-cli/dlo-dmo-mapping/#update).

### Optional dataspace

Native `sf data360 retrieve`, `deploy` and `delete` accept `--dataspace NAME`.
`--data-space NAME` is an alias; use one spelling, never both in the same command.
The flag has no CLI default. Omitting it does not mean every request sends a
`default` parameter:

- Mapping requests add the `dataspace` query only when you supply the flag. Without
  it, local identity checks use the documented default context, but the HTTP query
  is omitted.
- DMO create and update send `dataSpaceName` only with an explicit flag. Creating a
  nondefault-space DMO without that flag is refused.
- DLO creation must still send `dataspaceInfo`: its membership comes from the
  validated saved definition, even without a flag. DLO update does not acquire a
  scope property. DLO/DMO list, detail and delete URLs do not gain extra dataspace
  filters that those routes do not support.

Before a write, the requested scope, saved identity and fresh target/parent
identities must agree. DLO checks use actual memberships; DMO checks use the
returned `dataSpaceName`. Inventory filters returned memberships locally: omission
keeps default-space discovery, not an all-space export. An explicit scope selects
that space; ambiguous names are refused. The existing file layout is unchanged,
and `--overwrite` does not permit replacing another dataspace's definition at the
same filename. Legacy families and dependency adapters remain default-only.

These are implemented scope checks and parameter handling, **not live-qualified
nondefault-space CRUD**. They do not widen version guards, parent/survivor checks,
ingestion support or destructive-operation permissions. The default-space command
examples below remain the retained qualified examples, not nondefault recipes.

### Safe operation diagnostics

Native stream, DLO, DMO and mapping failures distinguish plugin verification from
a confirmed Salesforce API rejection. Protected-state mismatches can identify the
check, resource and first differing path. Only bounded schema identifiers, enums
and flags are shown as expected/observed values; IDs, labels, free text and unknown
properties are redacted. Raw remote payloads, arbitrary exception messages and stack
traces are not forwarded. A confirmed rejection may report its HTTP status without
the response body; otherwise the plugin does not claim Salesforce rejected the
request. Diagnostics leave safety checks and error codes intact and do not
permit retrying an unknown mutation.

For Connect API failures, the plugin identifies HTTP 429 **Too Many Requests**
as rate limiting. HTTP 503 **Service Unavailable** can mean a Connect rate limit,
maintenance, load or another availability issue; it does not confirm the cause.
Human-readable and JSON diagnostics show a server `Retry-After` value only when
it passes validation. Reduce request frequency and try later because effective
limits can vary with load and change. Before rerunning a write with an unknown
outcome, inspect the target. The plugin does not automatically replay the write.

For ingestion provisioning, start with the [Data Stream and landing DLO](/next/data-cloud-cli/data-stream-definition/),
prepare the DMO and its required fields independently, then create the DLO-to-DMO
mapping last. Add a supported stream-linked DLO field through its owning stream,
not standalone DLO CRUD; that update does not create DMO fields or downstream mappings.

### Human-readable output

Leave off `--json` to see one action line per deployed or deleted component,
identified by type and API name. Lines distinguish created, updated, deleted,
unchanged, failed, blocked and not-attempted results; preview uses `Planned` rather
than claiming a completed change. Confirmed mapping updates also show the
[removed and added field-pair lists](/next/data-cloud-cli/dlo-dmo-mapping/#update).
A field-pair retarget appears in both lists.

Successful CRUD lines use `created|updated|deleted <type> <apiName>`. The suffix
` (server is still processing)` identifies positively acknowledged, unsettled
work: an explicit DLO `PROCESSING` write response, unless an existing independent
read confirms `ACTIVE` and the requested definition, or the guarded Identity
Resolution deletion acknowledgement. HTTP 204 alone and `--allow-processing` do
not establish ongoing processing. A suffix-free line does not prove activation
or physical cleanup; some operations confirm only a definition or accepted
receipt. Failed or unknown outcomes are not successful queued operations. This
output change has synthetic regression coverage only, not new live-org acceptance.

Deployment execution ends with `Deployed: n (x created / y updated / z failed)`.
Here `n` is the number of confirmed creations plus confirmed updates. Unchanged,
blocked and unattempted components are excluded; a failed component counts once,
not once per field operation. Preview does not print a completed-deployment total.

Retrieval lists each successful component as
`Downloaded <type>:<ApiName> (retrieved).` or
`Downloaded <type>:<ApiName> (unchanged).`, then prints `Downloaded <type>: n`
for that type. The total counts successful component results, including unchanged
local files, not attempts, individual files or API `totalSize`. Failed names remain
visible and are not counted. This display rule applies to exact, type-only and
bare retrieval; it does not prove that an inventory is complete or that a pending
retrieval implementation has passed installed acceptance. `--json` keeps its
structured result without these human-readable lines.

## Before you start

### What is the CLI, and where do I type this?

Salesforce CLI is a program on your computer that talks to Salesforce. CLI stands for **command-line interface**: instead of clicking through pages, you type a command and read its response. Here we use it to save configuration as files, compare settings and make selected changes. Installing it does not create a Salesforce account or give you additional permissions.

Open **PowerShell** on Windows or **Terminal** on macOS/Linux. A terminal is the window; the shell inside it interprets what you type. You can also use the terminal in an editor such as VS Code. Do not paste these commands into Salesforce's browser search box or a browser's developer console.

Copy one command line at a time and press Enter. Long lines may wrap on this page, but are still one command. Wait for the prompt to return and check the result before running the next line. Blocks labelled JSON or XML are file contents or sample responses, **not terminal commands**. The `sf` commands below work in PowerShell and common macOS/Linux shells; the later `Get-Content` example is specifically PowerShell.

### Install and check Salesforce CLI

You need a computer where you can install software, an internet connection to Salesforce, a plain-text editor, and access to an org with Data Cloud enabled. An **org** is a Salesforce environment with its own users, settings and data. Ask your administrator for a non-production practice org, its login URL and the appropriate API/Data Cloud permissions. A **sandbox** is a separate testing environment; an arbitrary new Salesforce account will not necessarily have these features.

Follow Salesforce's [CLI installation instructions](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm). If you choose the npm installation route, first install a supported Node.js LTS version from [Node.js](https://nodejs.org/en/download/). Node.js runs JavaScript outside the browser; its bundled **npm** program installs software packages. Then run:

```sh
node --version
npm --version
npm install --global @salesforce/cli
sf --version
```

The first two commands should print version numbers; the last should identify `@salesforce/cli` and its version. If `sf` is not found, reopen your terminal after installation and check the installer instructions before continuing. The standard Metadata and API request-runner examples do not require a custom plugin, Yarn or TypeScript. A **plugin** adds commands to the CLI; the separately identified optional `sf data360` workflows require installing `sf-plugin-data` and following their linked prerequisites.

To see what a command accepts without running it, append `--help`, for example `sf org login web --help`. Words starting with `--` are **flags**: options that change how a command runs.

### Log in and name the connection

An **alias** is a local nickname for an authenticated connection. Choose a clear one, such as `data-practice`. Replace `LOGIN_URL` below with the exact HTTPS login URL your administrator supplied, keeping the quotes:

```sh
sf org login web --instance-url 'LOGIN_URL' --alias data-practice
sf org list
```

The first command opens your browser. Sign in to the intended org, complete any sign-in checks, approve access if your administrator allows it, then return to the terminal. The second lists connections: check the alias, username and connection status. If login is blocked by your company's security policy, ask your administrator; do not try to bypass it. The CLI retains authentication locally, so protect your computer and never share authentication files or tokens.

Throughout this page, `SOURCE_ALIAS` and `TARGET_ALIAS` are **placeholders**, not literal connections. Replace them with your chosen aliases. If you are only reading, one login is enough. If a later example changes a different org, log in to that org separately with a different alias and verify it too. `--target-org` always chooses the org the command contacts, even for a read.

An alias is not a read-only permission setting. Some explicitly source-only examples below write to `SOURCE_ALIAS`. Before every deploy, POST, PATCH or DELETE, check the command, the actual org and your permission to make that change. We deliberately pass `--target-org` rather than rely on a saved default org. Start with retrieval, not the create/delete sections; these are alternatives to consult, not a script to run from top to bottom.

### Make a local Salesforce project

A **project** is a folder on your computer, not a new org. It tells the CLI where to put Salesforce configuration files. For this guide, the smallest setup is enough:

1. In your file manager, create a new empty folder called `data-cloud-practice` in a private working location. Do not reuse a project containing unrelated work.
2. Inside it, create the nested folders `force-app`, then `main`, then `default`. This gives you `force-app/main/default/`.
3. In your text editor, create `sfdx-project.json` directly inside `data-cloud-practice`, beside `force-app`, with the contents below. Save it as plain UTF-8 text, not as `sfdx-project.json.txt`.

JSON stores named settings as `"key": value` pairs inside braces. Keep double quotes, commas and brackets as shown; JSON does not allow comments or a comma after the last entry.

```json
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "namespace": "",
  "sourceApiVersion": "65.0"
}
```

`packageDirectories` identifies the source folder; `default: true` makes it the default location for retrieved files. `namespace` stays empty here. `sourceApiVersion` selects the project's default Salesforce API version, explained below. There is no package to install from this file.

Now change the terminal's **working directory**—the folder commands run from—to your project. Replace `PROJECT_FOLDER` with its full path, keeping the quotes (especially if the path contains spaces):

```sh
cd 'PROJECT_FOLDER'
pwd
```

`cd` changes directory; `pwd` prints the current one. Check that it is `data-cloud-practice`, the folder containing `sfdx-project.json`, not `force-app` or `default`. Run the remaining commands from that project root unless a section tells you to use a separate project. A path such as `force-app/main/default/...` is relative to this root. After reopening a terminal, use `cd` again.

### Configuration, live components and names

**Metadata** means configuration: object definitions, fields, labels and selection rules rather than customer rows. Salesforce's **Metadata API** transfers those definitions. An **API** is an interface programs use to communicate; the CLI handles the login and sends the request for you. **Runtime** or **operational** means the live component and its current state, which is not always created by saving a definition. Retrieving a segment definition, for example, does not retrieve its members.

A **dataspace** groups Data Cloud data and configuration with its own access boundaries. The metadata examples use **API `65.0`, default dataspace**. Ask your administrator to confirm you can use that dataspace. API versions describe the Salesforce interface, not your installed CLI version. Keep the API versions in the commands: the later sections deliberately use API `67.0` for some requests. The examples do not establish that a configuration can be moved between orgs unchanged.

A component's **label** is its friendly display text. Its **API name** is the exact technical name; a **metadata member name** is the name used to select its saved definition. An **ID** is a separate record identifier returned by Salesforce. These are not interchangeable. Names such as `Customer__dlm`, `CustomerActivity` and `ActiveCustomers` are examples, not objects Salesforce creates for you. Keep actual capitalization and suffixes; replace example names consistently in commands, filenames and file contents. Later placeholders such as `QUERY_ID` must come from the response specified in that section, never from a guessed display name.

To find an existing metadata member before your first download, ask the component owner for its API name or list the relevant type. For example, this read lists `CustomObject` definitions visible to your user:

```sh
sf org list metadata --metadata-type CustomObject --target-org SOURCE_ALIAS --api-version 65.0
```

Look for the exact `fullName` of your intended DMO ending in `__dlm`. The list can include other kinds of objects; do not pick the first entry blindly. If you cannot identify the intended component, stop and ask its owner. Later sections give the corresponding metadata type to list.

An **object** describes a table-like collection of records; its **fields** are the columns. A **schema** describes those fields and their types. A **primary key** identifies a row; a **key qualifier** distinguishes keys from different sources. A lookup links to another object, and relationship **cardinality** describes how many rows may match: `ManyToOne` or `N:1` means many source rows can refer to one target row. Keep the real key and relationship settings rather than inferring them from example names.

**Dependencies** are the objects, fields or other components a definition relies on—or consumers that rely on it. Ask the owner to check these before writes and deletion; an empty result from one inventory is not proof that nothing uses a component. The later create examples assume those prerequisites already exist. This page is not a recipe for building an entire Data Cloud environment from scratch.

### Files you send, files you receive

Salesforce source-format metadata uses **XML**: named elements such as `<label>Customer</label>`. Preserve the surrounding tags and namespace declarations. Create any missing parent folders in your editor before saving a new file at the exact path shown. Do not paste an XML fragment over a complete retrieved file.

The default source layout is **`force-app/main/default/`**. In short:

- **Retrieve** downloads XML into that folder. It can replace local edits, but does not change the org or start ingestion, calculations or publication.
- **Deploy** sends your selected local XML to the org. It does not rewrite the local file, and it does not automatically create missing dependencies.
- **REST requests** print a response to the terminal. They do not create Salesforce project files. Save the request JSON shown below yourself, outside metadata source; `--body '@file.json'` reads that file.
- **Delete** changes the org. The delete examples here leave previously downloaded XML on your computer. Reconcile those files before deploying again, or you risk restoring stale configuration.

For a request such as `--body '@ci-create.json'`, create `ci-create.json` in the project root, **beside `force-app`, not inside it**, using your text editor. Save only the JSON block, without the surrounding Markdown backticks. The `@` tells the CLI to read a local file; it is not part of the filename. All later unqualified request filenames use this same location. `--file ci-delete.json` is different: that file describes the whole request, including URL and method, rather than only its body. Neither form creates the file for you.

**REST** is the API request style used for the live components below. The quoted `/services/data/...` path is an **endpoint**, an address within the org selected by `--target-org`, not a folder on your computer. `GET` reads; `PATCH` changes selected settings; `DELETE` requests removal. `POST` submits an operation and can create or process data, but some explicitly named operations below are reads. `--header` supplies request context, such as `Data-Space:default`; `--body` supplies the request's input. A response body is the data Salesforce sends back. Do not assume that a response can be reused as a request.

Some examples call an **API 67 MCP facade** at `/services/data/v67.0/ssot/mcp/execute`: one REST endpoint that accepts a named operation in `toolName` and its inputs in `paramsJson`. You invoke it through vanilla `sf api request rest`; these operations are not native `sf` commands or proof of equivalent native CRUD endpoints. You do not need an AI assistant or an MCP client. A **native endpoint** instead addresses the component directly. Here `paramsJson` contains JSON serialized **once** as a string inside outer JSON, so inner quotes appear as `\"`. Keep that escaping; an object in its place is not equivalent.

**Keep evidence surfaces separate:** API 65 native examples, the API 67 org-local facade and hosted MCP are not interchangeable interfaces. October 29 MCP contract discovery supplied no provider or underlying API version; it does not establish native HTTP payload equivalence. A returned URL containing API 68 identifies that link's version, not the version or support level of the request that produced it. Follow only documented routes and verify the intended org/path before using returned links. The [native stream reference](/next/data-cloud-cli/data-stream-definition/#documented-native-stream-api-availability) documents POST since 60.0 in its API 67 reference, but does not establish a safe ingestion creation workflow. Its native list has no documented `sourceObjectName` parameter; the facade filter is not transferable. General-purpose stream CREATE remains unqualified here.

All responses are **sanitized, shortened illustrations**, not complete response contracts. XML with an “omitted” comment is an excerpt: keep the complete retrieved file when deploying. Likewise, `<redacted-member-id>` and similar response markers stand for removed values, not inputs to copy.

### Your first retrieval

Use the DMO name you identified above in place of `Customer__dlm`:

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

Here's how to read that command:

- `sf project retrieve start` downloads configuration into the current project.
- `--metadata CustomObject:Customer__dlm` selects **type:name**. `CustomObject` is Salesforce's metadata type here, not an instruction to create an object.
- `--target-org` chooses the authenticated connection; `--api-version` selects the interface version.
- `--wait 5` waits up to five minutes for results, not five seconds. Returning to the prompt is not proof that a job finished.
Interactive CLI and plugin examples use human-readable output by default. Optionally append `--json` for structured output with named properties; it does not save an output file. Samples explicitly labelled optional structured output illustrate that format, not the flag-free command's default display. REST responses can inherently remain JSON without this flag.

Later, `--source-dir` selects a local file or folder to deploy; selecting a folder includes its subfolders. `--manifest` selects components listed in an XML file instead. `--test-level NoTestRun` concerns Salesforce Apex code tests, **not** a simulation or permission to skip checking the result. `--dry-run`, where supported, validates rather than saving the change; these examples otherwise perform the requested operation.

### What does a successful response look like?

In human output, check the retrieval's completion status and saved file paths. **Optional structured output (`--json`):** retrieving a DMO can return this shortened illustration:

```json
{
  "status": 0,
  "result": {
    "done": true,
    "success": true,
    "status": "Succeeded",
    "files": [{
      "fullName": "Customer__dlm",
      "type": "CustomObject",
      "state": "Created",
      "filePath": "force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml"
    }]
  }
}
```

The outer `status: 0` says the CLI command reported success; a nonzero status means you need to read the error. Inside `result`, check `done`, `success` and the job's own `status` when present. JSON braces `{}` group named properties; brackets `[]` hold a list. `result.files` means the `files` list inside `result`, not a filename. `null` means no value was supplied, not zero or a successful run.

`filePath` tells you where to look. Open that path in your editor, starting from the project root. `Created` describes the **local file**, not a newly created object in Salesforce. The full response can also list individual field files. You have now logged in and downloaded a definition without deploying it. You can stop here and inspect the files before choosing another section.

For deployments, wait for the whole job to succeed and then read the component again to check the result. A component listed as successful inside a failed deployment is not enough. Likewise, `Unchanged` means the configuration did not change; the deployment job still ran.

For REST, check the HTTP status **and the response body**. HTTP is the request/response protocol: codes such as `200` and `201` indicate a successful request, `204` has no response body, and `404` means the requested resource was not found. Authentication or permission failures are not evidence of deletion. Use `--include` when the walkthrough needs visible HTTP status and headers alongside the server body; these are separate from decoded operation results. Only the explicitly labelled Segment Members envelope walkthrough deliberately keeps `--json` to inspect `result.statusCode` and `result.body`. The API 67 MCP facade used below is an API that runs named operations. It can return an error inside an otherwise successful HTTP/CLI response. Its examples show the decoded result, not the complete enclosing response.

**Asynchronous** work continues on Salesforce after your command returns. **Polling** means repeating a read/status request, not repeating the create, update or delete. For a deployment that has not finished, use its returned job ID in place of `JOB_ID` and the same org:

```sh
sf project deploy report --job-id JOB_ID --target-org TARGET_ALIAS --wait 5
```

For a retrieval that times out, follow the installed command's recovery guidance rather than assuming all files arrived or inventing a deploy-report command for it. For live components, use that section's read command to check progress. Allow time between checks; if the state stays unresolved or reports an error, stop and ask the administrator instead of resubmitting writes. Later **terminal checks** mean checks for a final state, not simply text appearing in your terminal window.

A collection or query may return only a **page** of results. **Pagination** means reading the remaining pages. A limit is how many rows to request; an offset is how many rows have already been passed. The Segment Members section shows the concrete steps. Where a collection returns a continuation link/token, use the documented continuation for that endpoint, keeping the same org and expected API path; if you cannot establish that you reached the end, you cannot conclude a deleted item is absent. Never forward credentials to an arbitrary returned URL.

### Retrieve more than one component

You can repeat `--metadata`; there is no need for a manifest just to select two components:

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5
```

Check the saved paths for both definitions. **Optional structured output (`--json`):** the `files` list contains both definitions:

```json
{
  "status": 0,
  "result": {
    "success": true,
    "files": [
      { "fullName": "CustomerActivity", "type": "MktCalcInsightObjectDef", "state": "Created" },
      { "fullName": "ActiveCustomers", "type": "MarketSegmentDefinition", "state": "Created" }
    ]
  }
}
```

### A note about deletion examples

A **manifest** is an XML list of metadata types and member names. A destructive-change manifest selects what to delete; `--post-destructive-changes` applies those removals after the regular deployment content. An empty `package.xml` does not cancel those deletions.

A few metadata deletes below use generated `package.xml` and destructive-change files. These explain the lower-level mechanism; they are **not self-contained user workflows**. Run them only when your integration has supplied the exact files and checked ownership and dependencies. No current multi-family wrapper or generator invocation is supplied here, and hand-authoring manifests is not the intended normal workflow.

Here, **your integration** means existing tooling or a developer on your team that supplies reviewed files—not something installed by following this page. If you do not have those files and checks, skip these deletion examples. **Git** is a tool for tracking and sharing file changes; keeping a file out of Git means not adding it to that history or uploading it to a repository.

Keep those generated files temporary and out of Git. Use an isolated source project without unrelated XML. Never delete a shared or populated object just to make another example work.
