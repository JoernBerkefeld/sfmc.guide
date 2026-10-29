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
---

*Last updated: October 29, 2026, 09:17 (UTC+1).*

{% include verification-status.html title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support." %}

**Verification scope:** Live-org reads and the explicitly described bounded operations were tested. The operation-specific limitations still apply; this badge does not verify untested writes or general CRUD support.

You can use Salesforce CLI to download quite a bit of your Data Cloud (Data 360) configuration. Making changes is a little less straightforward: some commands work with saved definitions, while others work with the actual running component.

This page explains the difference and shows the commands next to the files and responses you can expect. Start with retrieving an existing component. Only move on to create, update or delete when you have checked the prerequisites for that section.

<!-- Keep this capability table, all linked type-page details and their visible last-updated timestamps synchronized with every substantive update across this guide. -->

Each linked page covers one logical resource, with Retrieve, Create, Update and Delete sections. Prefer a dedicated standard CLI command when the verified workflow provides one; otherwise use a native API through `sf api request rest`, or the explicitly identified facade where native support is not qualified. CLI and API are not competing alternatives: the CLI also sends API requests. XML definitions and runtime state are views of the same resource, not separate feature types.

The ratings describe **verified vanilla Salesforce CLI workflows on this page**, including REST API calls—not dedicated native commands or universal API support. **Yes** means the shown retrieval works; **Partial** means only a bounded variant, combined operation or incomplete asynchronous lifecycle is demonstrated; **No** means no verified usable workflow is supplied here, not that the API cannot do it. Write permissions, dependencies and processing warnings still apply.

| Configuration or runtime data | Retrieve | Create | Update | Delete | Verified scope / limits |
|---|---|---|---|---|---|
| [DMOs](/next/data-cloud-cli/data-model-object/#data-model-object-dmo-customobject-dlm) | Yes | Partial | Partial | Partial | XML retrieval; native API 65 creation and one nonprimary Text addition only for an empty, unmapped, unrelated custom Other/default DMO; authoritative emptiness admission for existing nonqueryable objects is unresolved (`42P01` is not empty); owned deletion requires dependency checks. |
| [DLOs](/next/data-cloud-cli/data-lake-object/#data-lake-object-dlo-customobject-dll) | Yes | Partial | Partial | Partial | Owned Ingestion API stream creates the DLO; one existing-target Text-field addition via source-schema sync and later read-only full-preservation checks; no cross-org proof; accepted cleanup remained `DELETING`. |
| [Mappings](/next/data-cloud-cli/object-source-target-map/#dlo-to-dmo-mapping-objectsourcetargetmap) | Yes | Partial | Partial | No | Existing compatible objects; label-only update; standalone deletion is not established. |
| [Relationships](/next/data-cloud-cli/field-source-target-relationship/#field-relationship-fieldsrctrgtrelationship) | Yes | Partial | Partial | Partial | Empty custom DMOs, owned `ManyToOne` lookup; label-only update; deletion also removes its sole-use lookup. |
| [Source object definitions](/next/data-cloud-cli/data-source-object/#source-object-configuration-datasourceobject) | Yes | No | No | No | `DataSourceObject` XML, not a complete connector or credential export. |
| [Stream definitions](/next/data-cloud-cli/data-stream-definition/#data-stream-configuration-datastreamdefinition) | Yes | No | No | No | `DataStreamDefinition` XML only; runtime Ingestion API results are in the DLO section. |
| [Calculated insights](/next/data-cloud-cli/calculated-insights/#retrieve) | Yes | Partial | Partial | Partial | XML definition and runtime reads; definition-only XML writes or API 67 facade runtime creation; API 65 publication/settings and bounded predicate edit; asynchronous deletion checks required. |
| [Segments](/next/data-cloud-cli/segments/#retrieve) | Yes | Partial | Partial | Partial | XML definition and runtime reads; source-only DBT XML label-only update or API 65 live empty-audience creation and full-definition label/description update; exact runtime and metadata deletion checks. |
| [Segment members](/next/data-cloud-cli/segment-members/#segment-members-runtime-data-not-metadata) | Partial | No | No | No | Bounded membership/query pages, not a verified full-population export or member writes. |
| [Data Graphs](/next/data-cloud-cli/data-graphs/#operational-data-graphs) | Yes | Partial | Partial | Partial | API 67 facade source-only root projection update; two-org IR-owned setup/root/transform lineage qualified, not portable target update/settlement/repeat; deletion does not prove generated-object cleanup. |
| [Identity Resolution](/next/data-cloud-cli/identity-resolution/#operational-identity-resolution) | Yes | Partial | Partial | Partial | API 67 facade source-only ruleset lifecycle and bounded reconciliation change; two-org retained-owner/twelve-output schema correlation, not portable creation, successful IR data run or universal cleanup. |
| [Kit templates](/next/data-cloud-cli/data-kit-object-template/#kit-template-datakitobjecttemplate) | Yes | Partial | Partial | No | Stored Data Graph snapshot and description update; no reproducible standard CLI delete invocation supplied. |
| [Kit definitions](/next/data-cloud-cli/data-package-kit-definition/#kit-definition-datapackagekitdefinition) | Yes | Partial | No | Partial | Owned Identity Resolution definition/template/membership created and deleted together; no runtime installation proof. |
| [Kit membership](/next/data-cloud-cli/data-package-kit-object/#kit-membership-datapackagekitobject) | Yes | Partial | No | Partial | Combined metadata transport with its definition/template; no independent member creation/deletion proof. |

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

The first two commands should print version numbers; the last should identify `@salesforce/cli` and its version. If `sf` is not found, reopen your terminal after installation and check the installer instructions before continuing. You do not need to build or install a custom plugin, Yarn or TypeScript for this page. A **plugin** adds commands to the CLI; these examples use Salesforce's standard commands.

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
sf org list metadata --metadata-type CustomObject --target-org SOURCE_ALIAS --api-version 65.0 --json
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

All responses are **sanitized, shortened illustrations**, not complete response contracts. XML with an “omitted” comment is an excerpt: keep the complete retrieved file when deploying. Likewise, `<redacted-member-id>` and similar response markers stand for removed values, not inputs to copy.

### Your first retrieval

Use the DMO name you identified above in place of `Customer__dlm`:

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Here's how to read that command:

- `sf project retrieve start` downloads configuration into the current project.
- `--metadata CustomObject:Customer__dlm` selects **type:name**. `CustomObject` is Salesforce's metadata type here, not an instruction to create an object.
- `--target-org` chooses the authenticated connection; `--api-version` selects the interface version.
- `--wait 5` waits up to five minutes for results, not five seconds. Returning to the prompt is not proof that a job finished.
- `--json` asks for structured output with named properties rather than a human-oriented table. It does not save an output file.

Later, `--source-dir` selects a local file or folder to deploy; selecting a folder includes its subfolders. `--manifest` selects components listed in an XML file instead. `--test-level NoTestRun` concerns Salesforce Apex code tests, **not** a simulation or permission to skip checking the result. `--dry-run`, where supported, validates rather than saving the change; these examples otherwise perform the requested operation.

### What does a successful response look like?

For example, retrieving a DMO can return:

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

For REST, check the HTTP status **and the response body**. HTTP is the request/response protocol: codes such as `200` and `201` indicate a successful request, `204` has no response body, and `404` means the requested resource was not found. Authentication or permission failures are not evidence of deletion. With `--json`, look for `result.statusCode` and `result.body` where provided. The API 67 MCP facade used below is an API that runs named operations. It can return an error inside an otherwise successful HTTP/CLI response. Its examples show the decoded result, not the complete enclosing response.

**Asynchronous** work continues on Salesforce after your command returns. **Polling** means repeating a read/status request, not repeating the create, update or delete. For a deployment that has not finished, use its returned job ID in place of `JOB_ID` and the same org:

```sh
sf project deploy report --job-id JOB_ID --target-org TARGET_ALIAS --wait 5 --json
```

For a retrieval that times out, follow the installed command's recovery guidance rather than assuming all files arrived or inventing a deploy-report command for it. For live components, use that section's read command to check progress. Allow time between checks; if the state stays unresolved or reports an error, stop and ask the administrator instead of resubmitting writes. Later **terminal checks** mean checks for a final state, not simply text appearing in your terminal window.

A collection or query may return only a **page** of results. **Pagination** means reading the remaining pages. A limit is how many rows to request; an offset is how many rows have already been passed. The Segment Members section shows the concrete steps. Where a collection returns a continuation link/token, use the documented continuation for that endpoint, keeping the same org and expected API path; if you cannot establish that you reached the end, you cannot conclude a deleted item is absent. Never forward credentials to an arbitrary returned URL.

### Retrieve more than one component

You can repeat `--metadata`; there is no need for a manifest just to select two components:

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The `files` list then contains both definitions:

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
