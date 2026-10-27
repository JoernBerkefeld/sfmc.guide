---
layout: page
title: "Data Cloud with Salesforce CLI"
description: "Data Cloud metadata commands, default source-format files, illustrative responses and supported lifecycle limits for Marketing Cloud Next."
parent: Next
parent_url: /next/
permalink: /next/data-cloud-cli/
platforms:
  - next
---

You can use Salesforce CLI to download quite a bit of your Data Cloud (Data 360) configuration. Making changes is a little less straightforward: some commands work with saved definitions, while others work with the actual running component.

This page explains the difference and shows the commands next to the files and responses you can expect. Start with retrieving an existing component. Only move on to create, update or delete when you have checked the prerequisites for that section.

- **Objects and connections:** [DMOs](#data-model-object-dmo-customobject-dlm), [DLOs](#data-lake-object-dlo-customobject-dll), [mappings](#dlo-to-dmo-mapping-objectsourcetargetmap), [relationships](#field-relationship-fieldsrctrgtrelationship), [source objects](#source-object-configuration-datasourceobject), [streams](#data-stream-configuration-datastreamdefinition).
- **Insights and audiences:** [calculated insight definitions](#calculated-insight-mktcalcinsightobjectdef), [segment definitions](#segment-marketsegmentdefinition), [live calculated insights](#operational-calculated-insights), [live segments](#operational-segments), [segment members](#segment-members-runtime-data-not-metadata).
- **Other configuration:** [Data Graphs](#operational-data-graphs), [Identity Resolution](#operational-identity-resolution), [kit templates](#kit-template-datakitobjecttemplate), [kit definitions](#kit-definition-datapackagekitdefinition), [kit membership](#kit-membership-datapackagekitobject).

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

The first two commands should print version numbers; the last should identify `@salesforce/cli` and its version. If `sf` is not found, reopen your terminal after installation and check the installer instructions before continuing. You do not need to build a plugin, install Yarn/TypeScript or install the separate `sf-plugin-data` plugin for this page. A **plugin** adds commands to the CLI; these examples use Salesforce's standard commands.

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

Some examples call an **MCP facade**: one REST endpoint that accepts a named operation in `toolName` and its inputs in `paramsJson`. You are calling it through the CLI; you do not need an AI assistant or an MCP client. A **native endpoint** instead addresses the component directly. Here `paramsJson` contains JSON encoded as a string inside outer JSON, so inner quotes appear as `\"`. Keep that escaping; an object in its place is not equivalent.

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

## Data Model Object (DMO): `CustomObject`, `__dlm`

A DMO is the model your data is mapped into, such as a customer or order. It uses the suffix `__dlm`. Salesforce CLI treats its definition as a `CustomObject`, with a separate XML file for each field.

### Create

Creating a DMO by deploying its XML has **not been verified**. Downloading an object does not mean you can recreate it that way. The custom `sf-plugin-data` plugin has a separate, limited JSON creation route; that is not the standard Metadata API route shown here.

### Read / retrieve

```sh
sf project retrieve start --metadata CustomObject:Customer__dlm --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Look for these files:

- `force-app/main/default/objects/Customer__dlm/Customer__dlm.object-meta.xml`
- `force-app/main/default/objects/Customer__dlm/fields/Id__c.field-meta.xml`
- Further files in `fields/` for the other fields, including system fields and lookups.

The object file contains information such as the label and dataspace:

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer</label>
  <mktDataModelAttributes>
    <creationType>Custom</creationType>
    <dataSpaceName>default</dataSpaceName>
    <!-- Other retrieved attributes omitted. -->
  </mktDataModelAttributes>
</CustomObject>
```

Keep the field files too. In particular, preserve the primary-key and key-qualifier attributes rather than trying to reconstruct them from field names. This export is not a complete set of mappings, relationships or ingestion settings. An `isEnabled` flag alone does not tell you whether processing is active.

### Update

General DMO XML updates have **not been verified** either. The plugin's limited object/field label updates do not establish support for changing a DMO schema through Metadata API.

### Delete

The deletion route is limited to an **empty custom DMO that you own**, after a fresh dependency check. It can also delete the DMO's sole owned mapping. It does not delete the DLO, and it is not a safe recipe for arbitrary business objects or shared dependencies.

The integration supplies an empty `package.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

Its `destructiveChangesPost.xml` selects only the intended DMO:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>Customer__dlm</members>
    <name>CustomObject</name>
  </types>
  <version>65.0</version>
</Package>
```

With those files and checks in place:

```sh
sf project deploy start --manifest package.xml --post-destructive-changes destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

A completed deletion can look like this:

```json
{ "status": 0, "result": { "done": true, "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "CustomObject", "fullName": "Customer__dlm", "deleted": true, "success": true }] } } }
```

Check afterward that the exact DMO and its owned mapping are gone and the DLO remains. Downstream insights, segments, identity resolution and activations can block deletion; no single dependency list is guaranteed to show everything. Local object, field and mapping XML remain. `sf project delete source` is not an interchangeable verified alternative and would also remove local files.

## Data Lake Object (DLO): `CustomObject`, `__dll`

A DLO holds data brought in from a source, before it is mapped into the data model. It uses `__dll`, not `__dlm`. Its XML describes the lake object, not the whole connection that brings data into it. Bringing data in is **ingestion**; a **connector** supplies the connection, a **stream** controls the incoming data flow, and a **transform** reshapes data.

### Create

Creating a DLO through Metadata API has **not been verified**. Do not remove primary-key or system qualifier fields to make a deployment pass.

### Read / retrieve

```sh
sf project retrieve start --metadata CustomObject:CustomerSource__dll --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes `force-app/main/default/objects/CustomerSource__dll/CustomerSource__dll.object-meta.xml` and the individual files under `objects/CustomerSource__dll/fields/`.

```xml
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Customer Source</label>
  <mktDataLakeAttributes>
    <!-- Retrieved DLO attributes omitted. -->
  </mktDataLakeAttributes>
</CustomObject>
```

The response uses `type: CustomObject` and `fullName: CustomerSource__dll`. Keep the complete attributes and field definitions. Connector credentials and the rest of the ingestion setup are not included in this object export.

### Update

DLO updates have **not been verified**.

### Delete

There is no verified standard delete recipe here. A DLO definition can be blocked by its **own still-existing Data Lake Object instance**, even when no DMO dependencies or streams are listed:

```json
{ "status": 1, "result": { "success": false, "status": "Failed", "details": { "componentFailures": [{ "fullName": "CustomerSource__dll", "problem": "This data lake object definition is referenced elsewhere in Salesforce. Remove the usage and try again." }] } } }
```

That is a refusal, not a successful delete. Check the actual state after a failure; do not try an assumed instance-delete workaround. This does not mean every possible DLO deletion route is unsupported.

## DLO-to-DMO mapping: `ObjectSourceTargetMap`

This is the definition that connects fields in a DLO to fields in a DMO. Both objects must already exist with matching fields, primary keys and key qualifiers.

### Create

Start with a complete retrieved mapping file at `force-app/main/default/objectSourceTargetMaps/CustomerMapping.objectSourceTargetMap-meta.xml`. For example, one field pair looks like this:

```xml
<ObjectSourceTargetMap xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <fieldSourceTargetMaps>
    <creationType>Custom</creationType>
    <filterApplied>false</filterApplied>
    <filterOperationType>Equal</filterOperationType>
    <isSourceFormula>false</isSourceFormula>
    <sourceField>CustomerSource__dll.Id__c</sourceField>
    <targetField>Customer__dlm.Id__c</targetField>
  </fieldSourceTargetMaps>
  <!-- Other retrieved field pairs omitted. -->
  <masterLabel>Customer Mapping</masterLabel>
  <sourceObjectName>CustomerSource__dll</sourceObjectName>
  <targetObjectName>Customer__dlm</targetObjectName>
</ObjectSourceTargetMap>
```

Keep **all** field pairs in the real file. Once you have checked the existing custom objects and confirmed that this mapping does not already exist:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerMapping", "type": "ObjectSourceTargetMap", "state": "Created" }] } }
```

Read the mapping back and compare the source, target and every runtime field pair. Salesforce can generate system qualifier pairs such as `KQ_Id__c` that were not in the XML; do not add guessed pairs yourself. This example does not cover arbitrary formulas or filters, and it does not guarantee that mapping creation performs no internal processing.

### Read / retrieve

```sh
sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to the mapping file above. Use the actual metadata member name from your org, not a name guessed from the source and target objects.

### Update

The verified change is the **label only**. Edit `masterLabel` in the complete file, leaving all pairs and object references alone:

```xml
<masterLabel>Customer Mapping Updated</masterLabel>
```

Then deploy it:

```sh
sf project deploy start --metadata ObjectSourceTargetMap:CustomerMapping --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

The file entry can report `Changed`; sending the same file again can report `Unchanged`. These are separate invocations, and neither proves that Salesforce performed no internal work. Read back the label and pairs. Retargeting, field removal and formula/filter updates have not been verified.

### Delete

Standalone mapping deletion is not supported by this example. It can fail with an internal server error or a restriction on removing the sole mapping. Deleting an empty, owned parent DMO can remove its sole owned mapping, as described above; do not delete an arbitrary parent as a workaround.

## Field relationship: `FieldSrcTrgtRelationship`

The following example links an order's customer field to a customer DMO. It covers a custom, DataCloud-owned `ManyToOne` relationship between existing **empty custom DMOs** in the default dataspace, not managed relationships or shared lookup fields.

### Create

Assume `Order__dlm.CustomerId__c` and `Customer__dlm.Id__c` already exist with the correct key settings. You need two files.

First, the new lookup field at `force-app/main/default/objects/Order__dlm/fields/CustomerLookup__c.field-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>CustomerLookup__c</fullName>
  <label>Customer Lookup</label>
  <referenceTo>Customer__dlm</referenceTo>
  <relationshipName>CustomerOrders</relationshipName>
  <type>Lookup</type>
</CustomField>
```

Do not leave out `fullName`. Second, the relationship at `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FieldSrcTrgtRelationship xmlns="http://soap.sforce.com/2006/04/metadata">
  <definitionCreationType>Custom</definitionCreationType>
  <lookupFieldName>Order__dlm.CustomerLookup__c</lookupFieldName>
  <masterLabel>Order Customer</masterLabel>
  <owner>DataCloud</owner>
  <relationshipCardinality>ManyToOne</relationshipCardinality>
  <sourceFieldName>Order__dlm.CustomerId__c</sourceFieldName>
  <targetFieldName>Customer__dlm.Id__c</targetFieldName>
</FieldSrcTrgtRelationship>
```

Deploy both together:

```sh
sf project deploy start --metadata CustomField:Order__dlm.CustomerLookup__c --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "Order__dlm.CustomerLookup__c", "type": "CustomField", "state": "Created" },
  { "fullName": "OrderCustomer", "type": "FieldSrcTrgtRelationship", "state": "Created" }
] } }
```

This creates the lookup and relationship, **not the DMOs or their key fields**. Read back the exact relationship, field references and cardinality. No explicit activation command is included, but that is not a guarantee of no internal processing.

### Read / retrieve

```sh
sf project retrieve start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The `files` entry points to `force-app/main/default/fieldSrcTrgtRelationships/OrderCustomer.fieldSrcTrgtRelationship-meta.xml`, containing the elements above. Retrieve the `CustomObject` definitions separately if you also need the objects and fields.

### Update

Change only the relationship's label:

```xml
<masterLabel>Order Customer Updated</masterLabel>
```

```sh
sf project deploy start --metadata FieldSrcTrgtRelationship:OrderCustomer --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

Expect `Changed`, or `Unchanged` on an identical repeat. Check that the lookup, source, target and cardinality stayed the same. Retargeting, cardinality changes and `OneToOne` updates have not been verified.

### Delete

**Deleting this relationship also removes its owned, sole-use lookup field.** Do not apply this to a shared lookup.

Use the generated empty `package.xml` from the DMO section. The integration supplies `relationship-delete.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>OrderCustomer</members>
    <name>FieldSrcTrgtRelationship</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest package.xml --post-destructive-changes relationship-delete.xml --target-org TARGET_ALIAS --api-version 65.0 --test-level NoTestRun --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "FieldSrcTrgtRelationship", "fullName": "OrderCustomer", "deleted": true, "success": true }] } } }
```

Confirm that the relationship and lookup are gone, but both DMOs and their original key fields remain.

**Avoid stale-source redeployment:** the local relationship and lookup files are still there. Reconcile them before another deploy. Leftover lookup XML can make later deletion fail; use an isolated empty source project rather than suppressing warnings.

## Source object configuration: `DataSourceObject`

### Create

Creation has **not been verified**.

### Read / retrieve

```sh
sf project retrieve start --metadata DataSourceObject:CustomerSource --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

The response points to `force-app/main/default/dataSourceObjects/CustomerSource.dataSourceObject-meta.xml`:

```xml
<DataSourceObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataSource>SalesforceSource</dataSource>
  <externalRecordIdentifier>Contact</externalRecordIdentifier>
  <masterLabel>Customer Source</masterLabel>
  <storageType>LOCAL</storageType>
  <templateVersion>1</templateVersion>
</DataSourceObject>
```

This tells you which source record the configuration refers to. It does not include field definitions or a complete connector/credential export.

### Update

Updates have **not been verified**.

### Delete

Deletion has **not been verified**.

## Data stream configuration: `DataStreamDefinition`

### Create

Creation has **not been verified**.

### Read / retrieve

```sh
sf project retrieve start --metadata DataStreamDefinition:CustomerStream --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Look for `force-app/main/default/dataStreamDefinitions/CustomerStream.dataStreamDefinition-meta.xml`:

```xml
<DataStreamDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <dataConnector>SalesforceConnector</dataConnector>
  <dataConnectorType>SalesforceDotCom</dataConnectorType>
  <dataExtractMethods>FULL_REFRESH</dataExtractMethods>
  <dataSource>SalesforceSource</dataSource>
  <mktDataLakeObject>CustomerSource__dll</mktDataLakeObject>
  <mktDataTranObject>CustomerTransform</mktDataTranObject>
  <!-- Other retrieved attributes omitted. -->
</DataStreamDefinition>
```

Retrieving this file does **not** start a refresh. The connector, source, DLO and transform still need to exist for a working stream. This and the source-object example show file shapes, not a complete ingestion setup.

### Update

Updates, activation and refresh have **not been verified** here.

### Delete

Deletion has **not been verified**.

## Calculated insight: `MktCalcInsightObjectDef`

A calculated insight computes values from your data, for example a customer count grouped by application. The expression uses **SQL**, a language for querying tables: `SELECT` chooses fields/calculations, `FROM` names the source, `WHERE` filters rows and `GROUP BY` groups results. Grouping fields are **dimensions**; calculated values are **measures**. You need compatible existing objects and fields, and someone who can check the query if you are not familiar with SQL.

This XML holds a calculated insight **definition**. It is not the same as creating a live calculated insight. For that, use the [operational route below](#operational-calculated-insights).

**Important:** deploying a definition can reserve the API name without creating a runtime insight. Runtime creation then finds the name taken, while PATCH cannot attach the missing runtime. Do not deploy an XML shell first if your goal is a live insight, and do not delete someone else's definition to free a name.

### Create

Definition-only creation requires compatible existing DMO fields and permission for possible processing. Save `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MktCalcInsightObjectDef xmlns="http://soap.sforce.com/2006/04/metadata">
  <creationType>Custom</creationType>
  <expression>SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm WHERE 1 = 0 GROUP BY app_id__c</expression>
  <masterLabel>Customer Activity</masterLabel>
</MktCalcInsightObjectDef>
```

Replace the DMO and fields consistently. `WHERE 1 = 0` gives an empty result; it does **not** prevent scanning or processing.

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": true, "success": true }] } } }
```

That success means the definition was stored. Runtime GET can still return `ITEM_NOT_FOUND`. This route is not suitable when you need a guarantee of no processing.

### Read / retrieve

```sh
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes the XML file above, including the SQL, label and creation type. Use the **metadata name**, not the runtime name ending in `__cio`.

The file does not include enabled state, schedule, definition type, dimensions/measures or dataspace. Keep the referenced DMO fields in mind when comparing environments.

### Update

The verified change is the definition's **`masterLabel` change**. Keep the expression and creation type, edit the label, and deploy the same file:

```sh
sf project deploy start --source-dir force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "details": { "componentSuccesses": [{ "componentType": "MktCalcInsightObjectDef", "fullName": "CustomerActivity", "created": false, "changed": true, "success": true }] } } }
```

Retrieve again to confirm the label and unchanged SQL. Expression updates, identical-repeat semantics and runtime updates are not qualified by this Metadata route.

### Delete

For an owned definition whose dependencies have been checked, the integration supplies the empty `manifest/package.xml` and this `manifest/destructiveChangesPost.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerActivity</members>
    <name>MktCalcInsightObjectDef</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0 --json
```

The successful component response reports `deleted: true`. Confirm the exact definition is absent from the inventory. This is definition deletion, not a promise to clean up a runtime insight or its generated data.

## Segment: `MarketSegmentDefinition`

A **segment** selects an audience using rules. Publishing prepares it for use; refreshing recalculates it, while activation sends data to a destination. These are distinct from saving the definition. A **unified DMO** contains the combined profiles produced by identity resolution; use an existing one with its actual key.

The examples distinguish `UI` criteria built in Salesforce's visual interface from `DBT`/`Dbt`, a SQL-based pipeline representation. You do not need to install a separate dbt command-line tool for the requests here. **CRUD** simply abbreviates create, read, update and delete.

As with calculated insights, segment XML is a **saved definition**, not necessarily a usable live segment. The write examples cover **source-only API 65 DBT Metadata definition CRUD**: creating, reading, changing the label and deleting that definition in the source org. Cross-org replay and deployment without processing have not been verified.

If you want a live segment, go to [Operational segments](#operational-segments). Being able to retrieve UI criteria also does not mean UI-definition writes are supported.

### Create

Use a separate project containing only this owned definition, with a compatible existing unified DMO/key. Save `force-app/main/default/marketSegmentDefinitions/CustomerDefinition.marketSegmentDefinition-meta.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <includeCriteria>&lt;DbtPipeline xmlns=""&gt;&lt;models&gt;&lt;model&gt;&lt;name&gt;CustomerDefinition&lt;/name&gt;&lt;sql&gt;SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0&lt;/sql&gt;&lt;/model&gt;&lt;/models&gt;&lt;/DbtPipeline&gt;</includeCriteria>
  <masterLabel>Customer Definition</masterLabel>
  <segmentType>DBT</segmentType>
</MarketSegmentDefinition>
```

**Escaping** preserves text that would otherwise be interpreted as file syntax: `&lt;` means `<`, `&gt;` means `>` and `&amp;` means `&` in XML text. Decoding reverses that representation; it does not execute the contents. Keep the escaping when saving nested XML, and do not replace it with raw tags.

`includeCriteria` contains XML-escaped pipeline XML. This DBT form has no `segmentOn` element. Replace the model and DMO/key consistently, and obtain permission for possible processing even with the empty-result SQL.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "details": { "componentSuccesses": [{ "componentType": "MarketSegmentDefinition", "fullName": "CustomerDefinition", "created": true, "changed": true, "success": true }] } } }
```

The second command downloads the definition for comparison. Check the decoded model/SQL, label and type. A successful deploy can still leave runtime GET returning `ITEM_NOT_FOUND`; `--dry-run` would not store anything at all. The project-wide selector above is why this project must contain no unrelated files.

### Read / retrieve

For an existing segment:

```sh
sf project retrieve start --metadata MarketSegmentDefinition:ActiveCustomers --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

This writes `force-app/main/default/marketSegmentDefinitions/ActiveCustomers.marketSegmentDefinition-meta.xml`. A **UI retrieval example**, separate from the DBT creation example, looks like this:

```xml
<MarketSegmentDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Active Customers</masterLabel>
  <segmentOn>UnifiedCustomer__dlm</segmentOn>
  <segmentType>UI</segmentType>
  <!-- Retrieved selection criteria omitted. -->
</MarketSegmentDefinition>
```

The XML omits lookback, schedule, state and dataspace. It does not publish, count or activate the segment. Referenced objects, fields and relationships remain dependencies; `NO_REFRESH` is not proof that a later deployment will do no initial processing.

### Update

In the owned DBT file, change only `masterLabel` to `Customer Definition Updated`. Keep the criteria, model, SQL and type intact:

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf project retrieve start --metadata MarketSegmentDefinition:CustomerDefinition --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
```

Expect `changed: true` for the label change. An identical repeat can report `Unchanged`. **Unchanged is not zero writes**: a deployment job still runs and package metadata can change. Broader SQL/criteria edits and live segment updates are not established by this route.

### Delete

Use the integration-supplied empty `manifest/package.xml` and this exact `manifest/destructiveChangesPost.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerDefinition</members>
    <name>MarketSegmentDefinition</name>
  </types>
  <version>65.0</version>
</Package>
```

```sh
sf project deploy start --manifest manifest/package.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 5 --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org SOURCE_ALIAS --api-version 65.0 --json
```

The completed response reports `deleted: true`. Require independent inventory absence of `CustomerDefinition` as well. This deletes the definition only; it does not promise runtime or generated-data cleanup. The downloaded XML remains on your computer.

## Operational calculated insights

Here we create an actual calculated insight, rather than just its XML definition. Creation uses the **API 67 MCP facade**; subsequent reads, updates and deletion use **API 65 REST**. This is not a dedicated CLI insight command or a verified direct public API 65 POST create endpoint.

Use compatible existing DMO fields and an unused name ending in `__cio`. Check both runtime and metadata names first. The route creates its own metadata definition, so do not deploy one beforehand. You need permission for processing/publication; cross-org migration and processing-free creation are not established.

### Create

Save `ci-create.json` outside metadata source. `paramsJson` is a **JSON string**, not an object. Its contents are wrapped in `input`:

```json
{
  "toolName": "d360_ci_create",
  "paramsJson": "{\"input\":{\"apiName\":\"CustomerActivity__cio\",\"displayName\":\"Customer Activity\",\"expression\":\"SELECT APPROX_COUNT_DISTINCT(CustomerEvent__dlm.CustomerId__c) AS customer_count__c, CustomerEvent__dlm.ApplicationId__c AS app_id__c FROM CustomerEvent__dlm GROUP BY CustomerEvent__dlm.ApplicationId__c\",\"definitionType\":\"CalculatedMetric\",\"dataSpaceName\":\"default\",\"draft\":true}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@ci-create.json' --target-org TARGET_ALIAS --json
```

A decoded result can contain:

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "isEnabled": true, "publishScheduleInterval": "NOT_SCHEDULED", "dimensions": [], "measures": [] }
```

Use the **returned `apiName`** from now on. `DRAFT` does not prove successful computation, and `NOT_SCHEDULED` does not mean disabled or guarantee no processing. Check for embedded errors before treating the request as successful.

### Read / retrieve

Read the live state, then download its XML separately if you want it in your project:

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method GET --target-org TARGET_ALIAS --json
sf project retrieve start --metadata MktCalcInsightObjectDef:CustomerActivity --target-org TARGET_ALIAS --api-version 65.0 --wait 5 --json
```

```json
{ "apiName": "CustomerActivity__cio", "status": "DRAFT", "dataSpace": "default", "publishScheduleInterval": "NOT_SCHEDULED", "lastRunStatus": null }
```

The REST request prints the live configuration. The retrieve writes `force-app/main/default/mktCalcInsightObjectDefs/CustomerActivity.mktCalcInsightObjectDef-meta.xml`. Compare the expression and label, but remember the XML is not the complete runtime state.

### Update

**Publish the draft:** save `ci-publish.json`:

```json
{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "SystemManaged" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-publish.json' --target-org TARGET_ALIAS --json
```

```json
{ "apiName": "CustomerActivity__cio", "status": "PROCESSING", "publishScheduleInterval": "SYSTEM_MANAGED" }
```

Read the insight again until it reaches `ACTIVE`, checking the expression and expected dimensions/measures. Stop on errors or an unresolved transition rather than repeating the PATCH. `ACTIVE` means an operational definition, **not a completed calculation or materialized output**.

**Change its label and schedule:** save `ci-update.json`. Leave `definitionType` out of updates:

```json
{ "displayName": "Customer Activity Updated", "publishScheduleInterval": "NotScheduled" }
```

```sh
sf api request rest '/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio' --method PATCH --body '@ci-update.json' --target-org TARGET_ALIAS --json
```

The result can return `PROCESSING` again, with the new label and `NOT_SCHEDULED`. Read it back to confirm the change and preserved SQL/dimensions/measures. `NotScheduled` does not disable the insight. Arbitrary SQL updates and identical-repeat behavior have not been verified.

### Delete

After checking ownership and dependencies, save `ci-delete.json`. The request-file form avoids a CLI empty-body error that can occur with a bare DELETE:

```json
{ "url": "/services/data/v65.0/ssot/calculated-insights/CustomerActivity__cio", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file ci-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/calculated-insights' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MktCalcInsightObjectDef --target-org TARGET_ALIAS --api-version 65.0 --json
```

An empty response can mean deletion has started, not finished. The collection may still show:

```json
{ "items": [{ "apiName": "CustomerActivity__cio", "status": "DELETING" }] }
```

**Terminal checks:** read the full collection, including continuation pages, until this insight is absent. Also check that its metadata member is gone. Do not send another DELETE while removal is underway. Generated-data cleanup is not guaranteed, and any downloaded XML still needs local reconciliation.

## Operational segments

This API 65 route creates a live segment. Unlike saving XML alone, it can begin processing immediately: **`NoRefresh` can transition `PROCESSING` → `ACTIVE`**. Empty-result SQL does not prevent scanning or processing either. Get permission for those effects before creating or updating a segment.

The example does not set up a send destination, export members or prove cross-org migration.

### Create

Save `segment-create.json`, replacing the existing unified DMO/key and model name consistently:

```json
{
  "developerName": "ActiveCustomers",
  "displayName": "Active Customers",
  "description": "Customer segment with an empty initial audience",
  "segmentOnApiName": "UnifiedCustomer__dlm",
  "segmentType": "Dbt",
  "includeDbt": {
    "models": {
      "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }]
    }
  },
  "publishSchedule": "NoRefresh"
}
```

```sh
sf api request rest '/services/data/v65.0/ssot/segments' --method POST --body '@segment-create.json' --target-org TARGET_ALIAS --json
```

```json
{ "apiName": "ActiveCustomers", "segmentType": "DBT", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "includeDbt": { "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }] } }
```

There is an easy-to-miss difference: the **request** uses nested `includeDbt.models.models`, but the **response** has an array at `includeDbt.models`. Do not send the response back unchanged. `P90D` is an example returned lookback, not a universal writable default.

### Read / retrieve

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
```

The **lookback** is the time window used by the segment; `P90D` is duration notation for 90 days. Check the returned value rather than assuming every segment uses it.

GET wraps the segment in a `segments` array:

```json
{ "segments": [{ "apiName": "ActiveCustomers", "segmentStatus": "ACTIVE", "lastSegmentMemberCount": 0, "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D", "dataSpace": "default", "segmentOnApiName": "UnifiedCustomer__dlm" }] }
```

Check the exact segment, SQL/model, type, dataspace, segment-on object, lookback and schedule. Wait for processing to settle before the next change. For local XML, use the separate `MarketSegmentDefinition` retrieve command; REST does not write it for you.

### Update

A label-only PATCH is not enough here. Send the **complete preserved definition**, changing just the label and description. The example deliberately omits both `publishSchedule` and `publishScheduleInfo` to retain the existing no-refresh schedule. Do not re-send `NoRefresh` or invent a `None` schedule value.

Save `segment-update.json`:

```json
{
  "displayName": "Active Customers Updated",
  "description": "Updated customer segment description",
  "segmentType": "Dbt",
  "segmentOnApiName": "UnifiedCustomer__dlm",
  "includeDbt": {
    "models": {
      "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }]
    }
  }
}
```

```sh
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method PATCH --body '@segment-update.json' --target-org TARGET_ALIAS --json
```

```json
{ "apiName": "ActiveCustomers", "segmentStatus": "PROCESSING", "publishInterval": "NO_REFRESH", "lookbackPeriod": "P90D" }
```

GET again until `ACTIVE`, then compare the changed label/description and all preserved values. This narrow update does not establish arbitrary omitted-field preservation, SQL/UI criteria updates or schedule/lookback editing.

### Delete

For the owned segment, save `segment-delete.json`:

```json
{ "url": "/services/data/v65.0/ssot/segments/ActiveCustomers", "method": "DELETE", "body": { "mode": "raw", "raw": "" } }
```

```sh
sf api request rest --file segment-delete.json --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v65.0/ssot/segments/ActiveCustomers' --method GET --target-org TARGET_ALIAS --json
sf org list metadata --metadata-type MarketSegmentDefinition --target-org TARGET_ALIAS --api-version 65.0 --json
```

DELETE can return HTTP `204` without a body. Confirm that GET returns HTTP `404` / `ITEM_NOT_FOUND` and the exact metadata member is absent:

```json
[{ "errorCode": "ITEM_NOT_FOUND", "message": "<segment not found>" }]
```

Do not delete shared unified DMOs or membership tables as extra cleanup. Previously downloaded source files remain local.

## Segment Members: runtime data, not metadata

These **API `67.0`** examples read the people in a segment, rather than its definition. They do not publish or refresh it, and they do not write anything under `force-app/main/default/`.

Member identifiers and profile fields are personal data. Keep request files and exports in a private working directory, restrict access and retention, and avoid Git, shared logs and screenshots.

### Read basic membership

First read the segment itself:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers' --target-org SOURCE_ALIAS --json
```

Keep the returned `marketSegmentId`, `dataSpace`, `segmentMembershipDmo.latestTable` and `segmentOnApiName`. You will need them if you want profile details later; do not guess a table name from the display name.

The returned configuration is also called the segment **descriptor**. In a path, `?` starts query parameters and `&` separates them: `limit=1&offset=0` asks for one row starting at the beginning. Keep the quotes around the full path so the shell does not interpret `&` as an instruction.

Now request one member:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --json
```

```json
{
  "status": 0,
  "result": {
    "statusCode": 200,
    "body": {
      "data": [{ "id": "<redacted-member-id>", "deltaType": "<redacted>", "snapshotType": "<redacted>", "timestamp": "<redacted>", "versionStamp": "<redacted>" }],
      "limit": 1,
      "offSet": 0,
      "rowCount": 1,
      "totalCount": 1200,
      "nextPageUrl": "<continuation>"
    }
  }
}
```

You get membership and audit information, **not the person's profile fields**. `1200` is just an illustrative count. A CLI invocation retrieves one page; it does not export the whole segment automatically. The documented maximum page size is **1000**.

For further pages, increase the offset by the number of returned rows. Check `offSet`, stable totals and nonempty progress, staying on the same validated org/path. Do not blindly follow a returned URL. Full-population export has not been verified here; if membership changes while you read it, reconcile the result rather than assuming a fixed snapshot.

### Include profile details

The following is an advanced read example, not a requirement for downloading configuration. A **join** combines rows from two tables using related keys; an incorrect key can return the wrong person's details. If you cannot validate the relationship and SQL, stop at basic membership and ask a data specialist to help.

There is **no standard CLI `--include-details` flag**. To get that result, you need to discover the tables, join membership to the detail DMO, and read the query pages. This is orchestration of several API reads, not a plugin implementation.

#### 1. Check the dataspace

**SOQL** (Salesforce Object Query Language) queries core Salesforce records, while Data 360 SQL queries Data Cloud tables. They use different commands and are not interchangeable. The next command uses SOQL only to identify the dataspace record.

Use the dataspace returned by the segment descriptor. For `default`:

```sh
sf data query --target-org SOURCE_ALIAS --api-version 67.0 --query "SELECT Id, DataSpaceApiName FROM DataSpace WHERE DataSpaceApiName = 'default' LIMIT 2" --json
```

```json
{ "status": 0, "result": { "totalSize": 1, "done": true, "records": [{ "DataSpaceApiName": "default" }] } }
```

You need exactly one match. This command uses core **SOQL**; it is not the Data 360 SQL executor used below.

#### 2. Find the tables and join fields

```sh
sf api request rest '/services/data/v67.0/ssot/metadata' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Find the descriptor's exact latest membership table, segment-on detail DMO, primary key and ordered detail fields. Check that the relationship is **N:1**, using its actual source/target attributes (`fromEntityAttribute` / `toEntityAttribute` where returned). Do not assume that every DMO joins on `Id__c`.

For the next example, imagine discovery gave you these facts. This is an explanation of the schema, **not the literal API response**:

```json
{
  "membershipTable": "CustomerMembership__dlm",
  "detailTable": "UnifiedCustomer__dlm",
  "membershipKey": "Id__c",
  "detailKey": "CustomerKey__c",
  "detailFieldsInMetadataOrder": ["CustomerKey__c", "DisplayName__c"],
  "relationshipCardinality": "NTOONE"
}
```

Stop if the identities, keys, cardinality or field order are missing or ambiguous.

#### 3. Submit a small query

Save `segment-member-query.json`. Replace table/key/field names from discovery, and replace `SEGMENT_ID_15` with the first 15 case-preserved characters of the returned MarketSegment ID, **not its API name**. Quote identifiers and validate/escape values before constructing SQL.

```json
{
  "sql": "SELECT * FROM (SELECT d.\"CustomerKey__c\", d.\"DisplayName__c\", m.\"Id__c\" AS \"membership_key_internal\", COUNT(d.\"CustomerKey__c\") OVER (PARTITION BY m.\"Id__c\") AS \"detail_match_count_internal\" FROM \"CustomerMembership__dlm\" m LEFT JOIN \"UnifiedCustomer__dlm\" d ON m.\"Id__c\" IS NOT DISTINCT FROM d.\"CustomerKey__c\" WHERE m.\"Segment_Id__c\" = 'SEGMENT_ID_15') q ORDER BY \"membership_key_internal\" LIMIT 2",
  "rowLimit": 1
}
```

The query does four things:

1. Selects two detail fields in metadata order. To include all details, list **every discovered detail field in that order**, rather than using `SELECT *` on the underlying tables.
2. Uses a null-safe `LEFT JOIN`, so members without a matching profile remain in the result with null details.
3. Adds the membership key and match count for validation. Reject more than one detail match per member.
4. Limits the whole result to two rows, requesting one row per page. These limits do not bound how much data the query engine scans.

The outer `SELECT *` only keeps the explicitly ordered inner columns.

Here `m` and `d` are short SQL aliases for the membership and detail tables, not org aliases. `IS NOT DISTINCT FROM` compares keys while treating two nulls as equal; the match-count check still matters. Double quotes identify table/column names, single quotes delimit text values, and `\"` preserves a double quote inside a JSON string. Do not build SQL from untrusted values by simple text replacement; have a developer validate names and escape values for this SQL dialect.

The verified submission form uses **stdin** (standard input): text passed into a program. In PowerShell, `Get-Content -Raw -LiteralPath` reads the whole named file as text, `|` passes it to the next program, and `--body -` tells the CLI to use that incoming text. For example, in PowerShell:

```powershell
Get-Content -Raw -LiteralPath './segment-member-query.json' | sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body - --json
```

The CLI also documents file input for the same body:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql' --target-org SOURCE_ALIAS --method POST --header 'Data-Space:default' 'Content-Type:application/json' --body '@segment-member-query.json' --json
```

POST submits a read query, not a segment refresh, but it can consume query resources. A successful submission can use HTTP `201`:

```json
{
  "status": 0,
  "result": {
    "statusCode": 201,
    "body": {
      "data": [[null, null, "<redacted-membership-key>", 0]],
      "metadata": ["<column descriptors abbreviated>"],
      "returnedRows": 1,
      "status": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 }
    }
  }
}
```

This row has two empty detail fields, the internal membership key and a zero match count. With all detail fields selected, row width is **detail-field count + 2**. Check the returned metadata order and width before interpreting the values.

#### 4. Read the remaining pages

Use the fresh `result.body.status.queryId` (or `body.queryId` where returned). If the query is still running, check its status; stop on errors, expiry or an unfamiliar status/schema:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Unlike submission, this response puts status properties directly under `body`:

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "queryId": "<query-id>", "completionStatus": "ResultsProduced", "rowCount": 2, "progress": 1 } } }
```

Use `offset=1` only after validating and accepting exactly one submission row. Then ask for the next row using the **same query**, not a new POST:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=1&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

Otherwise, if submission contains no rows, wait for recognized status success, then fetch the first bounded page at `offset=0&rowLimit=1`:

```sh
sf api request rest '/services/data/v67.0/ssot/query-sql/QUERY_ID/rows?offset=0&rowLimit=1' --target-org SOURCE_ALIAS --header 'Data-Space:default' --json
```

```json
{ "status": 0, "result": { "statusCode": 200, "body": { "data": [[null, null, "<redacted-membership-key>", 0]], "metadata": ["<column descriptors abbreviated>"], "returnedRows": 1 } } }
```

`returnedRows` is the page size; `status.rowCount` is the total for the bounded query. Advance offset by the actual number of validated and accepted rows, including any from submission. Require progress, a stable total and consistent metadata order/width; stop at the total and reject match counts above one before exporting.

This example covers **two bounded SQL pages, not an unrestricted full export**. The CLI still returns array rows with the two internal columns. Validate and transform the results privately if you want named fields, normalized dates or output without those internal columns.

### Save output deliberately

**Stdout** (standard output) is the program's normal output, which you usually see in the terminal. A shell redirect such as `> output.json` saves that stream to a file and can overwrite an existing file; it does not turn the response into metadata or fetch extra pages. Shell encoding and error-output handling differ, so do not add redirects casually to these examples.

REST normally writes to stdout. The documented file-output form below is **not live-qualified for this member workflow**:

```sh
sf api request rest '/services/data/v67.0/ssot/segments/ActiveCustomers/members?limit=1&offset=0' --target-org SOURCE_ALIAS --stream-to-file 'PRIVATE_EXPORT_PATH/members.json'
```

Choose a real restricted path outside metadata source. This writes API response bytes; do not add `--include` if you need pure JSON. Request files and member/profile output should stay out of Git. Creating, updating or deleting membership rows, refreshing/publishing, and a one-call enriched export are not covered here.

> Official reference: [Segment members API](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/references/mc-connect-segments?meta=getSegmentMembers).

## Operational Data Graphs

A **Data Graph** brings selected fields and related data together around a **root** object, the starting object for that graph. **Projected** fields are the fields included in its output. A full refresh rebuilds that output; an incremental refresh processes changes.

A Data Graph template is a saved configuration. The following API 67 MCP facade operations create and manage the **runtime graph** instead; these are not qualified native graph CRUD endpoints.

This example starts with a customer key and first name, then adds the last name. It assumes the existing `UnifiedssotIndividualMkt__dlm` and its Text fields `ssot__Id__c`, `ssot__FirstName__c` and `ssot__LastName__c`. Check your actual root, mapped fields, types and key before using it. Do not change the underlying DMO just to fit the example.

**Creation automatically processes** and generates supporting objects/transform. Updates can process too. Obtain permission for the resource use; there is no processing-free or cross-org guarantee. Like the other REST examples, request files are local inputs and responses go to stdout, not `force-app`.

### Create

Save `graph-create.json`. This is a root-only graph with a seven-day full-refresh schedule and incremental refresh disabled:

```json
{
  "toolName": "d360_data_graph_create",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key and given-name projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-create.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "creating", "version": "1" }
```

The automatic work has already started. Do not submit another create or refresh while it is running.

### Read / retrieve

Save `graph-get.json`, using the actual created name:

```json
{ "toolName": "d360_data_graph_get", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\",\"includeCIDetails\":true,\"includeSegmentDetails\":true}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "ready", "version": "1" }
```

This is a read despite the HTTP POST transport. Check the root, fields/key flags, description and refresh settings, not just `ready`. Capture the exact generated object/transform references for checking deletion later; do not guess names. The consumer-detail flags do not promise a complete list of every external dependency.

### Update

First confirm that initial generated-transform processing completed successfully and that the graph can be edited. `ready` alone is not enough, and **not every lifecycle state is mutable**. If edit eligibility is unclear, stop; this guide does not provide a universal status-to-editability check. Do not force a refresh to unlock editing.

Now preserve the full configuration, changing the description and adding the surname field. Save `graph-update.json`; `editScheduleOnly` belongs **outside `input`**:

```json
{
  "toolName": "d360_data_graph_update",
  "paramsJson": "{\"input\":{\"name\":\"CustomerGraph\",\"label\":\"Customer Graph\",\"description\":\"Customer key, given-name and surname projection\",\"creationMode\":\"DEFAULT\",\"dataspaceName\":\"default\",\"primaryObjectName\":\"UnifiedssotIndividualMkt__dlm\",\"type\":\"NONE\",\"fullRefreshConfig\":{\"schedule\":{\"frequency\":7,\"timeGranularity\":\"Day\"}},\"incrementalRefreshConfig\":{\"enabled\":false},\"sourceObject\":{\"name\":\"UnifiedssotIndividualMkt__dlm\",\"devName\":\"UnifiedssotIndividualMkt__dlm\",\"label\":\"Unified Customer\",\"path\":[],\"fields\":[{\"sourceFieldName\":\"ssot__Id__c\",\"dataType\":\"Text\",\"isKeyColumn\":true,\"isProjected\":true},{\"sourceFieldName\":\"ssot__FirstName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true},{\"sourceFieldName\":\"ssot__LastName__c\",\"dataType\":\"Text\",\"isKeyColumn\":false,\"isProjected\":true}],\"relatedObjects\":[]}},\"editScheduleOnly\":false}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-update.json' --target-org TARGET_ALIAS --json
```

```json
{ "name": "CustomerGraph", "status": "processing", "version": "1" }
```

Read back with `graph-get.json`. The graph can pass through `processing` and `editing_post_sync` before `ready`. Confirm three projected Text fields, only Id marked as the key, and unchanged root, seven-day schedule and incremental setting.

An identical repeat can preserve identities, version and configuration, but does not guarantee zero writes or no processing. Templates in your project are not automatically refreshed by this update.

### Delete

After checking dependencies and ownership, save `graph-delete.json`:

```json
{ "toolName": "d360_data_graph_delete", "paramsJson": "{\"dataGraphName\":\"CustomerGraph\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-delete.json' --target-org TARGET_ALIAS --json
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --method POST --body '@graph-get.json' --target-org TARGET_ALIAS --json
```

```json
{ "success": true }
```

Confirm that the exact graph is no longer found. Check the captured generated object/transform references with the same access used before deletion; unreadable is not permission-independent proof of physical removal. Note that **generated mapping absence and graph-specific internal-state cleanup are not proven**. Never delete the shared `DataGraphStateTable__dlm` or the source unified DMO as guessed cleanup. Local requests and any retrieved template remain.

## Operational Identity Resolution

**Identity Resolution** combines records believed to represent the same person. Its **ruleset** contains matching rules (which records belong together) and reconciliation rules (which value to keep when records disagree). Here `Fuzzy` allows similar names, `Exact` requires an exact match and `ExactNormalized` compares normalized values. `LastUpdated` prefers the most recently updated values; `MostFrequent` prefers the most common. These choices affect real profiles, not just labels.

These API 67 MCP facade operations manage a live ruleset. A native API 65 GET is also shown, but equivalent native write endpoints and cross-org migration have not been verified. You do not need a custom data plugin or a kit for this route.

Use compatible existing Individual/name/ContactPointEmail fields and an unused ruleset suffix of **at most four characters**. The example uses `cust`; after creation, use the returned `objectApiName`.

**Create and update enter `PUBLISHING` even with `doesRunAutomatically: false`.** Obtain permission for publication/provisioning. That flag is not draft mode, and publication does not prove that a successful identity-resolution data run occurred.

### Create

Save `ir-create.json`. It matches on first name, last name and normalized email, and starts with a `LastUpdated` reconciliation rule:

```json
{
  "toolName": "d360_ir_create",
  "paramsJson": "{\"input\":{\"configurationType\":\"Individual\",\"dataSpaceName\":\"default\",\"label\":\"Customer Identity\",\"description\":\"Resolve customers using name and normalized email\",\"rulesetId\":\"cust\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"LastUpdated\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-create.json' --json
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHING" }
```

Check nested `body.error` as well as the result: HTTP `201` and CLI exit `0` can still contain an operation error. Salesforce may add reconciliation entities beyond the one sent. Keep the returned identity and exact generated output/link references for later checks.

### Read / retrieve

Save `ir-get.json`:

```json
{ "toolName": "d360_ir_get", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

You can read through the facade or the native API 65 endpoint:

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
sf api request rest '/services/data/v65.0/ssot/identity-resolutions/Individual_cust' --target-org TARGET_ALIAS --method GET --json
```

```json
{ "objectApiName": "Individual_cust", "doesRunAutomatically": false, "rulesetStatus": "PUBLISHED" }
```

Compare identity, matching rules, reconciliation values and generated references. **Wait for `PUBLISHED` before updating**; an update during `PUBLISHING` can fail inside an otherwise successful response. Both reads print to stdout and leave the ruleset unchanged.

### Update

Let's change the Individual reconciliation rule from `LastUpdated` to **`MostFrequent`**, keeping the matching definition intact. Save `ir-update.json` with the full matching/reconciliation input and label, rather than assuming a sparse update will work:

```json
{
  "toolName": "d360_ir_update",
  "paramsJson": "{\"identityResolution\":\"Individual_cust\",\"input\":{\"label\":\"Customer Identity\",\"description\":\"Prefer the most frequent customer values\",\"doesRunAutomatically\":false,\"matchRules\":{\"rules\":[{\"label\":\"Name and normalized email\",\"criteria\":{\"criteria\":[{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__FirstName__c\",\"matchMethodType\":\"Fuzzy\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__Individual__dlm\",\"fieldName\":\"ssot__LastName__c\",\"matchMethodType\":\"Exact\",\"shouldMatchOnBlank\":false},{\"entityName\":\"ssot__ContactPointEmail__dlm\",\"fieldName\":\"ssot__EmailAddress__c\",\"matchMethodType\":\"ExactNormalized\",\"shouldMatchOnBlank\":false}]}}]},\"reconciliationRules\":{\"rules\":[{\"entityName\":\"ssot__Individual__dlm\",\"ruleType\":\"MostFrequent\",\"shouldIgnoreEmptyValue\":true}]}}}"
}
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-update.json' --json
```

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "PUBLISHING", "reconciliationRules": { "rules": [{ "entityName": "ssot__Individual__dlm", "ruleType": "mostfrequent" }] } }
```

Read back until publication settles, then check the changed rule and unchanged matches/identity. Do not issue another update while publishing. Broader matching grammar, repeat behavior and successful data runs are not covered by this example.

### Delete

After checking dependencies and ownership, save `ir-delete.json`:

```json
{ "toolName": "d360_ir_delete", "paramsJson": "{\"identityResolution\":\"Individual_cust\"}" }
```

```sh
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-delete.json' --json
sf api request rest '/services/data/v67.0/ssot/mcp/execute' --target-org TARGET_ALIAS --method POST --body '@ir-get.json' --json
```

The delete can return `{ "success": true }` while a following read still shows:

```json
{ "objectApiName": "Individual_cust", "rulesetStatus": "DELETING", "reconciliationRules": [] }
```

Wait for the exact ruleset to become not found, and independently confirm native API 65 GET returns HTTP `404` / `ITEM_NOT_FOUND`. Do not repeat DELETE during removal.

Generated outputs can remain readable during `DELETING`. Check their captured references only after ruleset removal. Later unreadability means absent **or inaccessible**, not proof of physical deletion, profile-row removal or universal cleanup. Do not race the ruleset's cleanup by deleting DMOs yourself. Local request files and retrieved templates remain.

## Kit template: `DataKitObjectTemplate`

A **data kit** groups configuration for reuse. Its definition describes the kit, templates store component settings, and membership files link the two. **Instantiation** or installation creates live components from that saved configuration; copying files alone does not do this. A **payload** is simply the content carried inside a field or request.

A kit template is a **snapshot**, not the live component. A Data Graph template can contain projected fields, joins and refresh settings; an Identity Resolution template can contain matching and reconciliation rules. Segment templates omit live publish schedule/status.

### Create

A complete Data Graph template can be stored without a parent kit. Use the existing, dependency-reviewed file at `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`:

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" }] } }
```

This stores the template; **it does not create a runtime graph or install a kit**. Retrieve it again to compare the decoded payload. The excerpt below is not a complete creation file.

### Read / retrieve

```sh
sf project retrieve start --metadata DataKitObjectTemplate:CustomerGraph --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

The response points to `force-app/main/default/dataKitObjectTemplates/CustomerGraph.dataKitObjectTemplate-meta.xml`. Its `entityPayload` is XML-escaped JSON:

```xml
<DataKitObjectTemplate xmlns="http://soap.sforce.com/2006/04/metadata">
  <entityPayload><!-- XML-escaped JSON payload omitted. --></entityPayload>
  <sourceObjectType>DataGraph</sourceObjectType>
  <templateVersion>1</templateVersion>
  <!-- Other retrieved template attributes omitted. -->
</DataKitObjectTemplate>
```

Other template types use `IdentityResolution` or `MarketSegment`. Preserve complete payloads and references: source IDs, generated objects/transforms and external DLO references can prevent replay elsewhere. Existing snapshots do not automatically update when a live component changes.

### Update

The verified edit is the **description inside `entityPayload`** of a Data Graph template. Decode the JSON, change only the description, then encode it as XML text again. Keep the root, fields, keys, types and other settings:

```sh
sf project deploy start --metadata DataKitObjectTemplate:CustomerGraph --target-org TARGET_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "files": [{ "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Changed" }] } }
```

This updates stored template content, not an instantiated graph. Retrieve and compare the decoded payload. Arbitrary payload changes, full graph updates through templates, and whole-container repeat/update behavior have not been verified.

### Delete

Removing a stored Data Graph template has been demonstrated, but an exact reproducible standard CLI delete invocation is not established here. No command is offered. Template deletion would not by itself prove runtime graph or supporting-artifact cleanup.

## Kit definition: `DataPackageKitDefinition`

### Create

An owned Identity Resolution kit definition, substantive template and membership link have been created **together in the source org**. Run this only from an isolated Salesforce project whose `force-app` directory contains exactly those three complete, compatible metadata files, with matching references:

- `force-app/main/default/dataPackageKitDefinitions/CustomerIdentityKit.dataPackageKitDefinition-meta.xml`
- `force-app/main/default/dataKitObjectTemplates/CustomerIdentityTemplate.dataKitObjectTemplate-meta.xml`
- `force-app/main/default/DataPackageKitObjects/CustomerIdentityMember.DataPackageKitObject-meta.xml`

These are local project-relative paths; replace the illustrative names with your own. The complete Identity Resolution template content must already exist—these paths are not a template generator.

```sh
sf project deploy start --source-dir force-app --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Shortened illustrative response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

This proves joint metadata creation only, not independent member creation, runtime installation or cross-org replay.

### Read / retrieve

Use the combined kit retrieval in the next section. Its `files` response includes `DataPackageKitDefinition:CustomerKit`, written to `force-app/main/default/dataPackageKitDefinitions/CustomerKit.dataPackageKitDefinition-meta.xml`. Keep the templates and membership links alongside it for a complete snapshot.

```xml
<DataPackageKitDefinition xmlns="http://soap.sforce.com/2006/04/metadata">
  <isEnabled>false</isEnabled>
  <isDeployed>false</isDeployed>
  <!-- Retrieved ordering, state and other attributes omitted. -->
</DataPackageKitDefinition>
```

These flags do not switch off schedules or automatic runs embedded in component templates.

### Update

Definition updates have **not been verified**.

### Delete

The owned source-org definition, template and membership link have also been deleted **together**. For the same three components, the generated local `manifest/empty.xml` contains only the package namespace and API version:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <version>65.0</version>
</Package>
```

The generated local `manifest/destructiveChangesPost.xml` selects the exact three components to remove. Replace these illustrative names only with components you own and intend to delete:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerIdentityTemplate</members>
    <name>DataKitObjectTemplate</name>
  </types>
  <types>
    <members>CustomerIdentityMember</members>
    <name>DataPackageKitObject</name>
  </types>
  <types>
    <members>CustomerIdentityKit</members>
    <name>DataPackageKitDefinition</name>
  </types>
  <version>65.0</version>
</Package>
```

With both files supplied at those project-relative paths, run:

```sh
sf project deploy start --manifest manifest/empty.xml --post-destructive-changes manifest/destructiveChangesPost.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

Shortened illustrative response:

```json
{ "status": 0, "result": { "success": true, "status": "Succeeded", "files": [
  { "fullName": "CustomerIdentityTemplate", "type": "DataKitObjectTemplate", "state": "Deleted" },
  { "fullName": "CustomerIdentityMember", "type": "DataPackageKitObject", "state": "Deleted" },
  { "fullName": "CustomerIdentityKit", "type": "DataPackageKitDefinition", "state": "Deleted" }
] } }
```

This proves joint metadata deletion only. Runtime undeployment, generated-object cleanup, independent deletion of arbitrary member links and cross-org behavior remain unverified.

## Kit membership: `DataPackageKitObject`

### Create

The owned Identity Resolution membership link was created together with its definition and template using the shared [kit definition example](#kit-definition-datapackagekitdefinition). Independent member creation and portability remain **unverified**.

### Read / retrieve

A membership file links a kit definition to a template. Use exact member names from the org; they are not necessarily the kit's display name.

For the verified combined transport, the integration supplies `manifest/package.xml` with the actual member names. Here is a small example of that generated file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>CustomerGraph</members>
    <name>DataKitObjectTemplate</name>
  </types>
  <types>
    <members>CustomerKit</members>
    <name>DataPackageKitDefinition</name>
  </types>
  <types>
    <members>CustomerKitGraphMember</members>
    <name>DataPackageKitObject</name>
  </types>
  <version>65.0</version>
</Package>
```

With that file supplied, retrieve the pieces together:

```sh
sf project retrieve start --manifest manifest/package.xml --target-org SOURCE_ALIAS --api-version 65.0 --wait 10 --json
```

```json
{ "status": 0, "result": { "success": true, "files": [
  { "fullName": "CustomerGraph", "type": "DataKitObjectTemplate", "state": "Created" },
  { "fullName": "CustomerKit", "type": "DataPackageKitDefinition", "state": "Created" },
  { "fullName": "CustomerKitGraphMember", "type": "DataPackageKitObject", "state": "Created" }
] } }
```

The member file is `force-app/main/default/DataPackageKitObjects/CustomerKitGraphMember.DataPackageKitObject-meta.xml`. **Capitalization matters.** Further members each have their own file in that same directory.

```xml
<DataPackageKitObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <masterLabel>Customer Kit</masterLabel>
  <parentDataPackageKitDefinitionName>CustomerKit</parentDataPackageKitDefinitionName>
  <referenceObjectName>CustomerGraph</referenceObjectName>
  <referenceObjectType>DataKitObjectTemplate</referenceObjectType>
</DataPackageKitObject>
```

Preserve the exact references. For a larger snapshot, the generated manifest includes the other actual template and membership names too. Retrieval does not install the kit, and these links alone do not prove that its components are portable.

### Update

Member updates have **not been verified**.

### Delete

The owned Identity Resolution membership link was deleted together with its definition and template using the shared [kit definition example](#kit-definition-datapackagekitdefinition). Independent deletion of arbitrary member links and runtime component undeployment remain **unverified**.

## Moving a kit is not installing it

Downloading or deploying kit XML only transports its metadata. Instantiation is a **separate asynchronous Connect deployment**: wait for that job's final success or error before assuming any runtime component exists.

In particular, an Identity Resolution template can be stored successfully while its later instantiation fails. That does not mean every valid Salesforce-generated kit fails. The available tools do not expose canonical kit creation, component-add or template-generation, so no generated-kit workflow is supplied here. Do not invent template tokens or treat reading a manifest as generating one. Successful canonical kit instantiation and cross-org replay remain unverified; the direct runtime routes above do not require a GUI detour.

For the official workflows, see [CLI kit transport](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy_data_kit_using_cli.html) and [Connect kit deployment](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-deploy-data-kits-using-connect-api.html).

For the separate custom plugin's current limits, see [sf-plugin-data capabilities](https://github.com/JoernBerkefeld/sf-plugin-data#metadata-examples-prerequisites-and-qualification). The standard CLI examples on this page are not additional `sf data360` commands.
