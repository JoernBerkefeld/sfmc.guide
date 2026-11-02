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

test('DLO wrapper success is limited to live API68 and preserves the standard sample', () => {
  const wrapper = dlo.split('**Separate wrapper readback')[1].split('## Create')[0];
  assert.match(wrapper, /only API 68 was live-verified for this wrapper/);
  assert.match(wrapper, /zero missing, extra or different files/);
  assert.match(wrapper, /definition-only retrieval/);
  assert.match(wrapper, /earlier API 65 wrapper refusal predates that implementation change/);
  assert.match(wrapper, /does not enable the guide's plugin tab or change any CREATE qualification/);
  assert.match(overview, /No plugin workflow is supplied by the tabs/);
});

test('DLO standard CREATE failures remain schema-specific and preserve distinct API evidence', () => {
  const create = dlo.split('## Create')[1].split('## Update')[0];
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
  assert.match(create, /cli_state="blocked"/);
  assert.match(create, /api_state="unknown"/);
  assert.match(create, /We did create a new, owned Ingestion API connection/);
  assert.match(create, /confirmed `CONNECTED`, then stream\/DLO `ACTIVE`/);
  assert.match(overview, /November 2 DLO CREATE reconciliation/);
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
  assert.match(dlo, /retrieve: \{ status: "yes", methods: \[cli\] \}/);
  for (const operation of ['create', 'update', 'delete']) {
    assert.ok(dlo.includes(`${operation}: { status: "unknown", methods: [] }`));
  }
  assert.doesNotMatch(retrieve, /00D[a-zA-Z0-9]{12,15}|F:[/\\]Temp|access_token|\.sf[/\\]orgs/);
  assert.match(overview, /November 2 DLO retrieval reconciliation/);
  assert.match(
    overview,
    /CREATE, UPDATE and DELETE ratings and other resources' live-verification dates are unchanged/,
  );
});
