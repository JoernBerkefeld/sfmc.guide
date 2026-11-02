'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const directory = path.join(__dirname, '../next/data-cloud-cli');
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

test('DLO reader samples contain all nine exact saved XML files', () => {
  const samples = [...dlo.matchAll(/<summary>([^<]+)<\/summary>\n\n```xml\n([\s\S]*?)```/g)];
  assert.equal(samples.length, 9);
  for (const [, name, xml] of samples) {
    assert.ok(Object.hasOwn(hashes, name), `Unexpected file ${name}`);
    assert.equal(createHash('sha256').update(xml).digest('hex'), hashes[name], name);
  }
});

test('native plugin rationale preserves CLI auth and distinguishes retrieval from redeploy limits', () => {
  const rationale = dlo.split('### Why use a native API plugin workflow?')[1].split('## Retrieve')[0];
  assert.match(rationale, /not.*missing Metadata retrieval support/s);
  assert.match(rationale, /primary-key and key-qualifier/);
  assert.match(rationale, /standard Salesforce CLI authentication remains in use/);
  assert.match(rationale, /manifest-free/);
  assert.match(rationale, /data360\/dlo\/<FullApiName>__dll\.dlo-meta\.json/);
  assert.match(rationale, /separate save\/create\/update field policies/);
  assert.match(rationale, /POST only after confirmed absence/);
});

test('DLO plugin tabs use explicit opt-in and preserve unknown defaults for other pages', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '../_includes/operation-tabs.html'), 'utf8');
  assert.match(renderer, /include\.plugin_state \| default: 'unknown'/);
  assert.match(renderer, /include\.plugin_state == 'available'/);
  assert.equal((renderer.match(/include\.plugin_body \| markdownify/g) || []).length, 1);
  assert.equal((dlo.match(/plugin_state="available"/g) || []).length, 4);
});

test('native matrix minimum remains separate from the plugin version guard', () => {
  assert.match(dlo, /API 61 as the minimum\nlive-tested successful version/);
  assert.match(dlo, /API 60 returned `404` for all four CRUD operations/);
  assert.match(dlo, /plugin currently admits \*\*API 68\/default only\*\*/);
});

test('DLO replacement command contract has explicit nondefault preview and exact portable path', () => {
  const contract = dlo.split('### Plugin command and saved-file contract')[1].split('## Retrieve')[0];
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

test('DLO asynchronous acceptance is distinct from terminal settlement and DMO response semantics', () => {
  const asynchronous = dlo.split('### Accepted requests and asynchronous completion')[1].split('## Retrieve')[0];
  assert.match(asynchronous, /POST HTTP `201` with `PROCESSING`/);
  assert.match(asynchronous, /PATCH HTTP `200` with `PROCESSING`/);
  assert.match(asynchronous, /DELETE HTTP `204`/);
  assert.match(asynchronous, /`DELETING`/);
  assert.match(asynchronous, /bounded, independent read-only polling/);
  assert.match(asynchronous, /pre-update representation/);
  assert.match(asynchronous, /do not replace an independent terminal-state/);
});

test('DLO wrapper success is limited to live API68 and preserves the standard sample', () => {
  const wrapper = dlo.split('**Separate wrapper readback')[1].split('## Create')[0];
  assert.match(wrapper, /only API 68 was live-verified for this wrapper/);
  assert.match(wrapper, /zero missing, extra or different files/);
  assert.match(wrapper, /definition-only retrieval/);
  assert.match(wrapper, /earlier API 65 wrapper refusal predates that implementation change/);
  assert.match(
    wrapper,
    /does not enable the guide's plugin tab or change any CREATE qualification/,
  );
  assert.match(overview, /Other resource tabs remain Unknown/);
  assert.equal((dlo.match(/plugin_state="available"/g) || []).length, 4);
});

test('DLO standard CREATE failures remain schema-specific and preserve distinct API evidence', () => {
  const create = dlo.split('## Create')[1].split('### Later controlled Metadata experiments')[0];
  assert.equal((create.match(/sf project deploy start --metadata/g) || []).length, 1);
  assert.match(create, /--api-version 68\.0 --test-level NoTestRun --wait 5 --json/);
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
  assert.match(dlo, /cli_state="blocked"/);
  assert.match(dlo, /api_state="unknown"/);
  assert.match(dlo, /We did create a new, owned Ingestion API connection/);
  assert.match(dlo, /confirmed `CONNECTED`, then stream\/DLO `ACTIVE`/);
  assert.match(overview, /November 2 DLO CREATE reconciliation/);
});

test('API68 Metadata isolation distinguishes persisted fields from rolled-back successes', () => {
  const isolation = dlo
    .split('### Later controlled Metadata experiments: API 68 only')[1]
    .split('### Native standalone DLO creation')[0];
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
  assert.match(isolation, /was a hypothesis, not a result/);
  assert.match(isolation, /not support a universal stream requirement for enabling/);
  assert.doesNotMatch(isolation, /00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token/);
});

test('native API68 DLO creation records corrected payload, settled state and generated metadata', () => {
  const native = dlo
    .split('### Native standalone DLO creation: verified API 68 experiment')[1]
    .split('### Distinct API ingestion-chain observation')[0];
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
  const read = dlo.split('{% capture retrieve_api %}')[1].split('{% endcapture %}')[0];
  assert.match(read, /--method GET --include/);
  assert.match(read, /available since API 60\.0/);
  assert.match(read, /Live GET\/PATCH\/DELETE evidence here is API 68 only/);
  assert.match(read, /HTTP `200`, `ACTIVE` and \*\*seven fields\*\*/);
  assert.match(read, /GET body contains a `dataLakeObjects` array/);
  assert.match(read, /POST and PATCH bodies contain a \*\*single DLO object\*\*/);
  assert.match(read, /handles authentication/);
  assert.match(read, /not dedicated native CLI DLO commands or plugin support/);
});

test('standalone API68 PATCH supplies only earned label and field addition', () => {
  const update = dlo.split('{% capture update_api %}')[1].split('{% endcapture %}')[0];
  const body = JSON.parse(update.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(body, {
    label: 'CLI API CRUD updated',
    dataLakeFieldInputRepresentations: [
      { name: 'UpdateNote', label: 'Update Note', dataType: 'Text', isPrimaryKey: false },
    ],
  });
  assert.match(update, /OWNED_DLO_ID --target-org SOURCE_ALIAS --method PATCH/);
  assert.match(update, /--body @dlo-patch\.json --header Content-Type:application\/json/);
  assert.match(update, /independent Connect GET confirmed `ACTIVE`/);
  assert.match(update, /\*\*eight fields\*\*/);
  assert.match(update, /all seven original fields/);
  assert.match(update, /primaryIndexOrder=1` and `isEnabled=true/);
  assert.match(update, /No existing primary-key mutation was tested/);
  assert.match(update, /stream-owned direct updates, cross-org replay or ingestion/);
});

test('standalone API68 DELETE retains working empty-raw request and independent absence', () => {
  const deletion = dlo.split('{% capture delete_api %}')[1].split('{% endcapture %}')[0];
  const request = JSON.parse(deletion.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(request, {
    url: '/services/data/v68.0/ssot/data-lake-objects/OWNED_DLO_ID',
    method: 'DELETE',
    body: { mode: 'raw', raw: '' },
  });
  assert.match(
    deletion,
    /sf api request rest --file dlo-delete-request\.json --target-org SOURCE_ALIAS --include/,
  );
  assert.match(deletion, /org identity and the exact ID\/name were rechecked/);
  assert.match(deletion, /dependencies=\[\]`, `totalSize=0/);
  assert.match(deletion, /API 67 `d360_dlo_dependencies_list` facade/);
  assert.match(deletion, /Empty dependencies alone are not deletion authorization/);
  assert.match(deletion, /no cascade was requested/);
  assert.match(deletion, /No mode found in body entry/);
  assert.match(deletion, /before any HTTP receipt/);
  assert.match(deletion, /HTTP `204`/);
  assert.match(deletion, /both ID and exact developer name returned `404`/);
  assert.match(deletion, /zero exact-name matches/);
  assert.match(deletion, /cannot be found/);
  assert.match(deletion, /top-level retrieve success alone would not establish absence/);
  assert.match(deletion, /owning-stream `DELETING` observation remains unresolved/);
  for (const operation of ['retrieve', 'update', 'delete']) {
    const tab = dlo.match(
      new RegExp(`{% include operation-tabs\\.html id="dlo-${operation}"[^\\n]+`),
    )[0];
    assert.match(tab, /api_state="available"/);
    assert.match(tab, new RegExp(`api_body=${operation}_api`));
  }
  assert.doesNotMatch(
    deletion,
    /00D[a-zA-Z0-9]{12,15}|1dl[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token/,
  );
});

test('DLO requested-version evidence supplies one standard example without write promotion', () => {
  const retrieve = dlo.split('## Retrieve')[1].split('## Create')[0];
  assert.equal((retrieve.match(/sf project retrieve start/g) || []).length, 1);
  assert.match(retrieve, /--api-version 68\.0 --wait 5 --json/);
  assert.match(retrieve, /Verified requested API 65–68 on test fixture/);
  assert.match(retrieve, /did \*\*not independently echo an effective API version\*\*/);
  assert.match(retrieve, /No `package\.xml` was emitted to disk/);
  assert.match(
    retrieve,
    /neither cross-org deployability nor CREATE, UPDATE, DELETE or wrapper support/,
  );
  assert.match(dlo, /retrieve: \{ status: "yes", methods: \[cli, api\] \}/);
  assert.ok(dlo.includes('create: { status: "yes", methods: [api] }'));
  for (const operation of ['update', 'delete']) {
    assert.ok(dlo.includes(`${operation}: { status: "yes", methods: [api] }`));
  }
  assert.doesNotMatch(retrieve, /00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token|\.sf[/\\]orgs/);
  assert.match(overview, /November 2 DLO retrieval reconciliation/);
  assert.match(
    overview,
    /CREATE, UPDATE and DELETE ratings and other resources' live-verification dates are unchanged/,
  );
});
