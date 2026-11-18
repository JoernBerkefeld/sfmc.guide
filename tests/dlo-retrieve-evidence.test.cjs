'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const directory = path.join(__dirname, '../next/data-cloud-devops');
const dlo = fs.readFileSync(path.join(directory, 'data-lake-object.md'), 'utf8');
const overview = fs.readFileSync(path.join(directory, 'index.md'), 'utf8');

// Receipt hashes bind every complete reader sample to the retained retrieve output.
const hashes = {
  'McpMappingProbe_20261027__dll.object-meta.xml':
    '031c5a9ce05e3138bb60b6ef63869aa7308985c2db8c15f9d13ab81d1fdc1f3f',
  'fields/cdp_sys_SourceVersion__c.field-meta.xml':
    'c47cc572e9b7023dff37e2f0d4d1040dc4268f50e32982a346c28ad38e899341',
  'fields/DataSource__c.field-meta.xml':
    '33d379270890c4c50415c492602210bdd35608c756aec1f44c6f78aaefcdcb55',
  'fields/DataSourceObject__c.field-meta.xml':
    'ddacd7a2ecbc80c40c3a739952b0601552d71890e4b9f19da4ee5eb73b304af5',
  'fields/Id__c.field-meta.xml': '4dbd7f041311054dc043d086b7666ddb9443959a2a4cbff5291acd01ea6bdf99',
  'fields/InternalOrganization__c.field-meta.xml':
    '66cbb93982c8cf702bd00527ade547bda8de70a6e1187584fb5be93061c7f760',
  'fields/KQ_Id__c.field-meta.xml':
    '0b48a53d3e8211932fced912478e5674c6629662ab8bf9b84936a62ebbdd51b0',
  'fields/Name__c.field-meta.xml':
    '8d7757d32d3d09b974e4c62cb5e173696c1532f7969b1acfe69b9149e664d6a6',
  'fields/Note__c.field-meta.xml':
    '34c7d4f6c9d638dab65507eeaa5c69f3aedbd56ffde3af53597fb456ef2f7fa5',
};

test('DLO and transform pages describe transform outputs and the file as Salesforce returns it', () => {
  const transform = fs.readFileSync(path.join(directory, 'data-transforms.md'), 'utf8');
  const dloPage = dlo.replaceAll(/\s+/g, ' ');
  for (const text of [
    'without a DataStream for that output',
    'Salesforce refuses an STL output DLO that does not exist',
    'which creates the output DLOs it declares',
  ])
    assert.ok(dloPage.includes(text), text);
  const page = transform.replaceAll(/\s+/g, ' ');
  for (const text of [
    'The file holds the transform as Salesforce returns it',
    'Everything else is sent as written and Salesforce decides',
    'An update replaces the whole transform',
    'The schedule is not in the file, and a deploy does not change it',
    'No match creates the transform with one POST',
    'refuse system transforms and transforms with a namespace',
  ])
    assert.ok(page.includes(text), text);
  assert.ok(dlo.replaceAll(/\s+/g, ' ').includes('offline-tested'));
  const nav = fs.readFileSync(path.join(__dirname, '../_data/navigation.yml'), 'utf8');
  assert.match(nav, /- title: Data Transforms\n {10}url: \/next\/data-cloud-devops\/data-transforms\//);
  assert.ok(!overview.includes('[Data Transforms]('), 'no transform paragraph on the overview');
  assert.match(transform, /^crud:$/m);
  assert.equal((transform.match(/plugin_state="available"/g) || []).length, 4);
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../site-index.json'), 'utf8'));
  assert.equal(
    index.filter((entry) => entry.url === '/next/data-cloud-devops/data-transforms/').length,
    1,
  );
  assert.ok(
    fs.existsSync(path.join(__dirname, '../_site/next/data-cloud-devops/data-transforms/index.html')),
  );
  const overviewHtml = fs.readFileSync(
    path.join(__dirname, '../_site/next/data-cloud-devops/index.html'),
    'utf8',
  );
  assert.match(overviewHtml, /href="\/next\/data-cloud-devops\/data-transforms\/"/);
});

test('DLO reader samples contain all nine exact saved XML files', () => {
  const samples = [...dlo.matchAll(/<summary>([^<]+)<\/summary>\n\n```xml\n([\s\S]*?)```/g)];
  assert.equal(samples.length, 9);
  for (const [, name, xml] of samples) {
    assert.ok(Object.hasOwn(hashes, name), `Unexpected file ${name}`);
    assert.equal(createHash('sha256').update(xml).digest('hex'), hashes[name], name);
  }
});

test('DLO attributes native JSON to Connect REST and CLI XML to Metadata API', () => {
  assert.match(dlo, /\*\*API family:\*\*[^]*\/services\/data\/vXX\.0\/ssot\/data-lake-objects/);
  assert.match(dlo, /\*\*Data 360 Connect REST API\*\*/);
  assert.match(dlo, /they do \*\*not\*\* use the SOAP-based Metadata API/);
  const cli = dlo.split('{% capture read_cli %}')[1].split('{% endcapture %}')[0];
  assert.match(cli, /\*\*Metadata API \(XML\):\*\*/);
  assert.match(cli, /separate from the native Connect REST JSON route/);
});

test('native plugin rationale preserves CLI auth and distinguishes retrieval from redeploy limits', () => {
  const rationale = dlo
    .split('**Why a native API plugin workflow:**')[1]
    .split('**Plugin API versions:**')[0];
  assert.match(rationale, /not.*missing Metadata retrieval support/s);
  assert.match(rationale, /primary-key and key-qualifier/);
  assert.match(rationale, /uses the Salesforce CLI's stored authentication/);
  assert.match(rationale, /does not start a CLI process per request/);
  assert.match(rationale, /manifest-free/);
  assert.match(rationale, /data360\/dlo\/<FullApiName>__dll\.dlo-meta\.json/);
  assert.match(rationale, /separate save\/create\/update field policies/);
  assert.match(rationale, /POST only after confirmed absence/);
});

test('DLO plugin tabs use explicit opt-in and preserve unknown defaults for other pages', () => {
  const renderer = fs.readFileSync(
    path.join(__dirname, '../_includes/operation-tabs.html'),
    'utf8',
  );
  assert.match(renderer, /include\.plugin_state \| default: 'unknown'/);
  assert.match(renderer, /include\.plugin_state == 'available'/);
  assert.equal((renderer.match(/include\.plugin_body \| markdownify/g) || []).length, 1);
  assert.equal((dlo.match(/plugin_state="available"/g) || []).length, 4);
});

test('plugin version guard is API 68 and no pre-68 native route content remains', () => {
  assert.match(dlo, /\*\*Plugin API versions:\*\* The raw native DLO routes/);
  assert.match(dlo, /an exact `dlo:` retrieve always reads at 68\.0/);
  assert.doesNotMatch(
    dlo,
    /API 61 as the minimum|API 60 returned `404`|needed two\nreads|APIs 64 and 67/,
  );
  assert.doesNotMatch(dlo, /\/ssot\/mcp\/execute|d360_|facade/);
});

test('DLO replacement command contract has explicit nondefault preview and exact portable path', () => {
  const contract = dlo
    .split('**Plugin command and saved-file contract:**')[1]
    .split('**Public-command acceptance')[0];
  for (const operation of ['retrieve', 'deploy', 'delete']) {
    assert.ok(contract.includes(`sf data360 ${operation} -m dlo:CustomerSource__dll`));
  }
  assert.match(contract, /data360\/dlo\/CustomerSource__dll\.dlo-meta\.json/);
  assert.match(contract, /Deletion executes by default, without a separate confirmation prompt/);
  assert.match(contract, /preview is never the default/);
  assert.match(contract, /zero mutations/);
  assert.match(contract, /no cascade/);
  assert.match(contract, /Only confirmed absence permits POST/);
});

test('DLO unchanged deploy is a comparison rather than another PATCH', () => {
  const update = dlo.split('**Update rules:**')[1].split('**Stream-owned DLO updates:**')[0];
  assert.match(update, /outcome: "unchanged"/);
  assert.match(update, /mutation: "not-attempted"/);
  assert.match(update, /sends no\nPOST or PATCH/);
  assert.match(update, /Field ordering does not trigger a write/);
  assert.match(
    update,
    /omission of the\ngenerated fields from a retrieved file does not count as removing them/,
  );
});

test('DLO asynchronous acceptance is distinct from terminal settlement and DMO response semantics', () => {
  const asynchronous = dlo
    .split('**Accepted requests and asynchronous completion:**')[1]
    .split('**Standard retrieve across requested API versions:**')[0];
  assert.match(asynchronous, /POST HTTP `201` with `PROCESSING`/);
  assert.match(asynchronous, /PATCH HTTP `200` with `PROCESSING`/);
  assert.match(asynchronous, /DELETE HTTP `204`/);
  assert.match(asynchronous, /`DELETING`/);
  assert.match(asynchronous, /bounded, independent read-only polling/);
  assert.match(asynchronous, /pre-update representation/);
  assert.match(asynchronous, /do not replace an independent terminal-state/);
});

test('DLO wrapper success is limited to live API68 and preserves the standard sample', () => {
  const wrapper = dlo
    .split('**Separate wrapper readback')[1]
    .split('**Standard Metadata CREATE comparison')[0];
  assert.match(wrapper, /only API 68 was live-verified for this wrapper/);
  assert.match(wrapper, /zero missing, extra or different files/);
  assert.match(wrapper, /definition-only retrieval/);
  assert.doesNotMatch(wrapper, /earlier API 65 wrapper refusal/);
  assert.match(
    wrapper,
    /does not enable the guide's plugin tab or change any CREATE qualification/,
  );
  assert.match(overview, /\*\*Standard CLI:\*\*/);
  assert.match(overview, /\*\*Plugin:\*\*[^\n]*`sf-plugin-data`/);
  assert.equal((dlo.match(/plugin_state="available"/g) || []).length, 4);
});

test('DLO standard CREATE failures remain schema-specific and preserve distinct API evidence', () => {
  const create = dlo
    .split('**Standard Metadata CREATE comparison')[1]
    .split('**Controlled Metadata experiments')[0];
  assert.equal((create.match(/sf project deploy start --metadata/g) || []).length, 1);
  assert.match(create, /--api-version 68\.0 --test-level NoTestRun --wait 5/);
  assert.match(
    create,
    /unchanged retrieved test schema failed standard creation at all four requested versions/,
  );
  assert.match(create, /genuine CREATE attempts, not updates/);
  assert.match(create, /all nine XML file contents remained byte-for-byte identical/);
  assert.match(create, /checkOnly: false/);
  assert.match(create, /rollbackOnError: true/);
  assert.match(create, /line `54`, column `13`/);
  assert.match(create, /\(-1644920076\)/);
  assert.match(create, /does \*\*not establish its underlying cause\*\*/);
  assert.match(create, /does \*\*not mean all DLO CREATE is unsupported\*\*/);
  assert.match(create, /Independent exact-name Metadata retrieves after each failure/);
  // The unchanged-schema failure stays evidence; an authored-fields-only deploy creates a definition.
  assert.match(dlo, /id="dlo-create"[^\n]+cli_state="available"[^\n]+disabled definition/);
  assert.doesNotMatch(dlo, /connect_state="unknown"/);
  assert.match(dlo, /\*\*Stream-owned DLO creation:\*\* A Data Stream creates its own landing DLO/);
  assert.match(dlo, /data-stream-definition\/#create\)/);
});

test('API68 Metadata isolation distinguishes persisted fields from rolled-back successes', () => {
  const isolation = dlo
    .split('**Controlled Metadata experiments')[1]
    .split('**Native standalone DLO creation')[0];
  assert.match(isolation, /none of the following variants was tested at API 65–67/);
  assert.match(isolation, /zero fields: no `Id__c` or other field was automatically generated/);
  assert.match(isolation, /\(-64830600\)/);
  assert.match(isolation, /zero persisted fields/);
  assert.match(isolation, /655 to 606 bytes/);
  assert.match(isolation, /three persisted fields: `Id__c`, `Name__c`, `Note__c`/);
  assert.match(isolation, /\(883038728\)/);
  assert.match(isolation, /all three fields unchanged and no primary-index annotation/);
  assert.match(isolation, /failed at `KQ_Id__c` with signature `\(2099634494\)`/);
  assert.match(isolation, /Removing the primary-index annotation alone was insufficient/);
  assert.match(isolation, /not an invalidity criterion/);
  assert.match(isolation, /Whether a stream is required to enable a DLO is not established/);
  assert.match(isolation, /not support a universal stream requirement for enabling/);
  assert.doesNotMatch(isolation, /00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token/);
});

test('native API68 DLO creation records corrected payload, settled state and generated metadata', () => {
  const native = dlo
    .split('**Native standalone DLO creation')[1]
    .split('**Stream-owned DLO creation:**')[0];
  assert.match(native, /POST \/services\/data\/v68\.0\/ssot\/data-lake-objects/);
  const body = JSON.parse(native.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(body, {
    name: 'StandaloneKeyProbe',
    label: 'CLI API primary key probe',
    category: 'Other',
    dataspaceInfo: [{ name: 'default' }],
    dataLakeFieldInputRepresentations: [
      { name: 'Id', label: 'Id', dataType: 'Text', isPrimaryKey: true },
      { name: 'Note', label: 'Note', dataType: 'Text', isPrimaryKey: false },
    ],
  });
  assert.ok(body.label.length <= 40);
  assert.match(native, /initial request returned HTTP `400`/);
  assert.match(native, /changed \*\*only the label\*\*/);
  assert.match(native, /HTTP `201` with `PROCESSING`/);
  assert.match(native, /GET returned HTTP `200` and independently confirmed `ACTIVE`/);
  assert.match(native, /one object plus seven field files/);
  assert.match(native, /primaryIndexOrder=1/);
  for (const field of [
    'KQ_Id__c',
    'cdp_sys_SourceVersion__c',
    'DataSource__c',
    'DataSourceObject__c',
    'InternalOrganization__c',
  ])
    assert.ok(native.includes(field));
  assert.match(native, /definitionCreationType=System/);
  assert.match(native, /usageTag=KEY_QUALIFIER/);
  assert.match(native, /they were not supplied in the create payload/);
  assert.match(native, /isEnabled=true/);
  assert.match(native, /No stream, connector or Data Kit was created/);
  assert.match(native, /Only API 68 was tested/);
  assert.match(native, /not row ingestion/);
  assert.match(native, /not evidence of MCN-only scope/);
  assert.match(native, /does not by itself settle/);
  assert.doesNotMatch(
    native,
    /live result pending|not a live-tested result|00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp/,
  );
});

test('standalone API68 GET distinguishes response envelopes and documented availability', () => {
  const read = dlo.split('{% capture read_connect %}')[1].split('{% endcapture %}')[0];
  assert.match(read, /--method GET --include/);
  const readEvidence = dlo.split('**Standalone native API read')[1].split('**Create rules:**')[0];
  assert.match(readEvidence, /available since API 60\.0/);
  assert.match(readEvidence, /Live GET\/PATCH\/DELETE evidence here is API 68 only/);
  assert.match(readEvidence, /HTTP `200`, `ACTIVE` and \*\*seven fields\*\*/);
  assert.match(readEvidence, /GET body contains a `dataLakeObjects` array/);
  assert.match(readEvidence, /POST and PATCH bodies contain a \*\*single DLO object\*\*/);
  assert.match(readEvidence, /handles authentication/);
  assert.match(readEvidence, /not dedicated native CLI DLO commands or plugin support/);
});

test('standalone API68 PATCH supplies only earned label and field addition', () => {
  const update = dlo.split('{% capture update_connect %}')[1].split('{% endcapture %}')[0];
  const body = JSON.parse(update.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(body, {
    label: 'CLI API CRUD updated',
    dataLakeFieldInputRepresentations: [
      { name: 'UpdateNote', label: 'Update Note', dataType: 'Text', isPrimaryKey: false },
    ],
  });
  assert.match(update, /OWNED_DLO_ID --target-org SOURCE_ALIAS --method PATCH/);
  assert.match(update, /--body @dlo-patch\.json --header Content-Type:application\/json/);
  const updateEvidence = dlo
    .split('**Standalone native API update')[1]
    .split('**Standalone native API delete')[0];
  assert.match(updateEvidence, /independent Connect GET confirmed `ACTIVE`/);
  assert.match(updateEvidence, /\*\*eight fields\*\*/);
  assert.match(updateEvidence, /all seven original fields/);
  assert.match(updateEvidence, /primaryIndexOrder=1` and `isEnabled=true/);
  assert.match(updateEvidence, /No existing primary-key mutation was tested/);
  assert.match(updateEvidence, /stream-owned direct updates, cross-org replay or ingestion/);
});

test('standalone API68 DELETE retains working empty-raw request and independent absence', () => {
  const deletion = dlo.split('{% capture delete_connect %}')[1].split('{% endcapture %}')[0];
  const request = JSON.parse(deletion.match(/```json\n([\s\S]*?)\n```/)[1]);
  const deleteEvidence = dlo.split('**Standalone native API delete')[1].split('</details>')[0];
  assert.deepEqual(request, {
    url: '/services/data/v68.0/ssot/data-lake-objects/OWNED_DLO_ID',
    method: 'DELETE',
    body: { mode: 'raw', raw: '' },
  });
  assert.match(
    deletion,
    /sf api request rest --file dlo-delete-request\.json --target-org SOURCE_ALIAS --include/,
  );
  assert.match(deletion, /No mode found in body entry/);
  assert.match(deleteEvidence, /org identity and the exact ID\/name were rechecked/);
  assert.match(deleteEvidence, /dependencies=\[\]`, `totalSize=0/);
  assert.match(
    deleteEvidence,
    /GET \/services\/data\/v68\.0\/ssot\/data-lake-objects\/CustomerSource__dll\/dependencies/,
  );
  assert.match(deleteEvidence, /Empty dependencies alone are not deletion authorization/);
  assert.match(deleteEvidence, /no cascade was requested/);
  assert.match(deleteEvidence, /before any HTTP receipt/);
  assert.match(deleteEvidence, /HTTP `204`/);
  assert.match(deleteEvidence, /both ID and exact developer name returned `404`/);
  assert.match(deleteEvidence, /zero exact-name matches/);
  assert.match(deleteEvidence, /cannot be found/);
  assert.match(deleteEvidence, /top-level retrieve success alone would not establish absence/);
  assert.match(deleteEvidence, /removed with its stream: the native API 68 stream DELETE/);
  assert.match(deleteEvidence, /data-stream-definition\/#delete\)/);
  for (const operation of ['read', 'create', 'update', 'delete']) {
    const tab = dlo.match(
      new RegExp(`{% include operation-tabs\\.html id="dlo-${operation}"[^\\n]+`),
    )[0];
    assert.match(tab, /connect_state="available"/);
    assert.match(tab, new RegExp(`connect_body=${operation}_connect`));
  }
  assert.doesNotMatch(
    deleteEvidence,
    /00D[a-zA-Z0-9]{12,15}|1dl[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token/,
  );
});

test('DLO installed cross-org evidence retains lifecycle and cleanup limits', () => {
  assert.match(dlo, /Installed cross-org acceptance/);
  assert.match(dlo, /Org-local IDs differed/);
  assert.match(dlo, /native-client capture recorded GET only/);
  assert.match(dlo, /independently returned 404 by name and ID/);
  assert.match(dlo, /does not qualify target delete preview/);
  assert.match(dlo, /not ingestion, populated data, mixed-family/);
});

test('DLO requested-version evidence supplies one standard example without write promotion', () => {
  const retrieve = dlo.split('## Read')[1].split('## Update')[0];
  assert.equal((retrieve.match(/sf project retrieve start/g) || []).length, 1);
  assert.match(retrieve, /--api-version 68\.0 --wait 5/);
  const retrieveEvidence = dlo
    .split('**Standard retrieve across requested API versions:**')[1]
    .split('**Separate wrapper readback')[0];
  assert.match(retrieveEvidence, /Verified requested API 65–68 on test fixture/);
  assert.match(retrieveEvidence, /did \*\*not independently echo an effective API version\*\*/);
  assert.match(retrieveEvidence, /No `package\.xml` was emitted to disk/);
  assert.match(
    retrieveEvidence,
    /neither cross-org deployability nor CREATE, UPDATE, DELETE or wrapper support/,
  );
  assert.doesNotMatch(retrieve, /00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token|\.sf[/\\]orgs/);
});

test('native API68 DLO create tab sends the plugin create body with suffix-free names', () => {
  const create = dlo.split('{% capture create_connect %}')[1].split('{% endcapture %}')[0];
  const body = JSON.parse(create.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(body, {
    name: 'CustomerSource',
    label: 'CustomerSource',
    category: 'Other',
    dataspaceInfo: [{ name: 'default' }],
    dataLakeFieldInputRepresentations: [
      { name: 'Id', label: 'Id', dataType: 'Text', isPrimaryKey: true },
      { name: 'Note', label: 'Note', dataType: 'Text', isPrimaryKey: false },
    ],
  });
  assert.ok(
    create.includes(
      "sf api request rest '/services/data/v68.0/ssot/data-lake-objects' --method POST --body '@dlo-create.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS",
    ),
  );
  assert.match(create, /HTTP 201 with status `PROCESSING`/);
  assert.match(create, /until it shows `ACTIVE`/);
  assert.match(create, /label longer than 40 characters returns HTTP 400/);
  const tab = dlo.match(/{% include operation-tabs\.html id="dlo-create"[^\n]+/)[0];
  assert.match(tab, /connect_state="available"/);
  assert.match(tab, /connect_body=create_connect/);
});
