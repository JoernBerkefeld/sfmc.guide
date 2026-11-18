'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, '../next/data-cloud-devops');
const read = (name) => fs.readFileSync(path.join(directory, `${name}.md`), 'utf8');

const capture = (page, name) => page.split(`{% capture ${name} %}`)[1].split('{% endcapture %}')[0];
const jsonBlock = (text) => JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);

test('stream-owned DLO lifecycle points to the native API68 stream routes, not a facade', () => {
  const dlo = read('data-lake-object');
  assert.match(
    dlo,
    /create: \{ status: "yes", methods: \[cli, api, plugin\](?:, method_statuses: \{[^}]*\})? \}/,
  );
  for (const anchor of ['create', 'update', 'delete'])
    assert.ok(dlo.includes(`/next/data-cloud-devops/data-stream-definition/#${anchor})`), anchor);
  assert.match(dlo, /Creating the connection or its event schema is not covered here/);
  assert.match(dlo, /Adding a field to the source event schema is not covered here/);
  assert.doesNotMatch(dlo, /d360_|\/ssot\/mcp\/execute|documented contract, not a qualified/);
  assert.equal((dlo.match(/include operation-tabs\.html/g) || []).length, 4);
});

test('native API68 stream create and update tabs send the plugin request bodies', () => {
  const stream = read('data-stream-definition');
  for (const operation of ['read', 'create', 'update', 'delete']) {
    // B3 sweep (2026-11-16): the CLI label deploy makes Update cli, api, plugin.
    const methods = ['read', 'update'].includes(operation) ? 'cli, api, plugin' : 'api, plugin';
    // Read and delete are yes through the native API and plugin (best single route).
    const status = ['read', 'delete'].includes(operation) ? 'yes' : 'partial';
    assert.ok(stream.includes(`${operation}: { status: "${status}", methods: [${methods}], `));
    const tab = stream.match(
      new RegExp(`{% include operation-tabs\\.html id="stream-definition-${operation}"[^\\n]+`),
    )[0];
    assert.match(tab, /connect_state="available"/);
    assert.match(tab, new RegExp(`connect_body=${operation}_connect`));
  }
  const create = capture(stream, 'create_connect');
  assert.deepEqual(jsonBlock(create), {
    name: 'CustomerStream',
    label: 'CustomerStream',
    datastreamType: 'INGEST_API',
    connectorInfo: {
      connectorType: 'IngestApi',
      connectorDetails: { name: 'CustomerConnection', events: ['CustomerEvent'] },
    },
    dataLakeObjectInfo: {
      name: 'CustomerSource__dll',
      label: 'CustomerSource',
      category: 'Other',
      dataspaceInfo: [{ name: 'default' }],
      dataLakeFieldInputRepresentations: [
        { name: 'CustomerId', label: 'CustomerId', dataType: 'Text', isPrimaryKey: true },
      ],
    },
    mappings: [],
    sourceFields: [],
    refreshConfig: { refreshMode: 'UPSERT' },
  });
  assert.ok(
    create.includes(
      "sf api request rest '/services/data/v68.0/ssot/data-streams' --method POST --body '@stream-create.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS",
    ),
  );
  assert.match(create, /Success is HTTP 201/);
  assert.match(create, /`<connection>_<event>_<8 hex characters>`/);
  assert.match(create, /response alone does not confirm the result/);
  const update = capture(stream, 'update_connect');
  assert.deepEqual(jsonBlock(update), {
    datastreamType: 'INGEST_API',
    mappings: [
      {
        sourceFieldLabel: 'ContactEmail',
        targetFieldName: 'ExtraContactEmail',
        targetFieldReturntype: 'Text',
      },
    ],
  });
  assert.ok(
    update.includes(
      "sf api request rest '/services/data/v68.0/ssot/data-streams/STREAM_RECORD_ID' --method PATCH --body '@stream-patch.json' --header 'Content-Type:application/json' --target-org TARGET_ALIAS",
    ),
  );
  assert.match(update, /Success is HTTP 200/);
  assert.match(update, /`formula` that holds the source field label/);
  // Pre-68 reference and API 66 notes are replaced by the native API 68 content.
  assert.doesNotMatch(stream, /\*\*API 66:\*\*|At API 66|version 67\.0|API 67|facade/);
  assert.match(stream, /<a id="documented-native-stream-api-availability"><\/a>/);
  assert.match(stream, /limit` \(1–200, default 10\)/);
  assert.equal((stream.match(/include operation-tabs\.html/g) || []).length, 4);
});

test('segment evidence preserves route and existing-owner limits', () => {
  const segment = read('segments');
  assert.match(segment, /WHERE-only single-column subqueries/);
  assert.match(segment, /disallows subqueries and compound join conditions/);
  assert.match(segment, /source-only existing-owner check/);
  assert.match(segment, /not a guarantee that an identical API PATCH is mutation-free/);
  assert.match(segment, /guide\/features_cdp_dbt_validations\.md/);
});

test('segment predicate qualification stays native, source-only and narrowly bounded', () => {
  const segment = read('segments');
  assert.match(segment, /source-only native API 65/);
  assert.match(segment, /WHERE 1 = 0 AND UnifiedCustomer__dlm\.CustomerKey__c IS NOT NULL/);
  assert.match(segment, /After \*\*one PATCH\*\*, independent runtime GET returned \*\*ACTIVE\*\*/);
  assert.match(segment, /separate standard Metadata retrieval confirmed that same SQL/);
  assert.match(segment, /not audience membership or successful computation/);
  assert.match(segment, /does not qualify the reverse change/);
  assert.match(
    segment,
    /update: \{ status: "partial", methods: \[cli, api, plugin\](?:, method_statuses: \{ [^{}]+ \})? \}/,
  );
  assert.doesNotMatch(segment, /segment-predicate-|OwnedSegRetest|compiled.worktree/);
});

test('overview retains fourteen resources and separate API provenance', () => {
  const overview = read('index');
  assert.equal((overview.match(/^  - path: next\/data-cloud-devops\//gm) || []).length, 14);
  assert.doesNotMatch(overview, /mcp\/execute|paramsJson/);
});
